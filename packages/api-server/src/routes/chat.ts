import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validateInput.js';
import {
  getConversation,
  saveMessage,
  getConversationHistory,
} from '../services/conversationService.js';
import { streamChatCompletion, getTenantConfig } from '../services/hermesProxy.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../logger.js';

const router = Router();

const sendMessageSchema = z.object({
  content: z.string().min(1).max(50000),
  contentType: z.enum(['text', 'audio', 'image']).default('text'),
});

// --- File upload config ---

const ALLOWED_AUDIO_MIMES = [
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg',
  'audio/x-m4a', 'audio/aac', 'audio/flac',
];
const ALLOWED_AUDIO_EXTS = ['.webm', '.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac'];

const uploadStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const req = _req as AuthenticatedRequest & { params: { id: string } };
    const dir = path.join(process.cwd(), 'uploads', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAudio =
      file.mimetype.startsWith('audio/') ||
      ALLOWED_AUDIO_MIMES.includes(file.mimetype) ||
      ALLOWED_AUDIO_EXTS.includes(ext);
    const isImage = file.mimetype.startsWith('image/');
    const isDocument = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xls', '.xlsx'].includes(ext);

    if (isAudio || isImage || isDocument) {
      cb(null, true);
    } else {
      cb(new Error('File type not accepted'));
    }
  },
});

/**
 * Forward a file to the Hermes inbox service (port 8650 on the same host as Hermes API).
 * Returns the remote file path if successful, null otherwise.
 */
async function forwardToHermesInbox(
  hermesApiUrl: string,
  filePath: string,
  originalName: string
): Promise<string | null> {
  try {
    // Inbox service runs on the same host as Hermes, port 8650
    const hermesUrl = new URL(hermesApiUrl);
    const inboxUrl = `${hermesUrl.protocol}//${hermesUrl.hostname}:8650/inbox/upload`;

    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, originalName);

    const response = await fetch(inboxUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': 'iactiv-inbox-2026', // TODO: make configurable per tenant
      },
      body: formData,
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Inbox upload failed');
      return null;
    }

    const result = await response.json() as { ok: boolean; path: string };
    if (result.ok) {
      logger.info({ remotePath: result.path }, 'File forwarded to Hermes inbox');
      return result.path;
    }
    return null;
  } catch (err) {
    logger.error({ err }, 'Failed to forward file to Hermes inbox');
    return null;
  }
}

// POST /api/v1/conversations/:id/upload
router.post(
  '/:id/upload',
  authenticate,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const conversationId = req.params.id as string;

      const conv = await getConversation(conversationId, user.id, user.tenantId);
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const isAudio = req.file.mimetype.startsWith('audio/') ||
        ALLOWED_AUDIO_EXTS.includes(ext);
      const isImage = req.file.mimetype.startsWith('image/');
      const contentType = isAudio ? 'audio' : isImage ? 'image' : 'text';
      const fileLabel = isAudio ? 'Fichier audio' : isImage ? 'Image' : 'Document';
      const fileUrl = `/uploads/${conversationId}/${req.file.filename}`;
      const audioDurationMs = req.body.audioDurationMs
        ? parseInt(req.body.audioDurationMs, 10)
        : undefined;

      // 1. Forward file to Hermes inbox
      const tenant = await getTenantConfig(user.tenantId);
      const remotePath = await forwardToHermesInbox(
        tenant.hermesApiUrl,
        req.file.path,
        req.file.originalname
      );

      // 2. Save user message with file info
      const content = remotePath
        ? `[${fileLabel}] ${req.file.originalname}`
        : `[${fileLabel}] ${req.file.originalname}`;

      const message = await saveMessage({
        conversationId: conv.id,
        role: 'user',
        content: remotePath ? `${content} (fichier: ${remotePath})` : content,
        contentType: contentType as 'audio' | 'image' | 'text',
        audioUrl: fileUrl,
        audioDurationMs,
      });

      logger.info({ conversationId, contentType, fileUrl, remotePath }, 'File uploaded');

      // 3. Return the message — no automatic Hermes processing
      // The user will decide what to do with the file via a follow-up text message.
      // When the user sends a text message, the file reference (remotePath) is stored
      // so Hermes knows about it in the conversation context.
      res.json({
        message: {
          id: message.id,
          role: 'user',
          conversationId: conv.id,
          content,
          contentType: message.contentType,
          audioUrl: isAudio ? fileUrl : undefined,
          imageUrl: isImage ? fileUrl : undefined,
          audioDurationMs: audioDurationMs ?? null,
          createdAt: message.createdAt,
          // Include remote path so frontend can reference it
          remotePath: remotePath ?? undefined,
        },
        fileUrl,
      });
    } catch (err) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: 'Internal error' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      next(err);
    }
  }
);

// POST /api/v1/conversations/:id/messages
router.post(
  '/:id/messages',
  authenticate,
  validateBody(sendMessageSchema),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { content, contentType } = req.body as z.infer<typeof sendMessageSchema>;

      const conv = await getConversation(req.params.id as string, user.id, user.tenantId);
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      await saveMessage({
        conversationId: conv.id,
        role: 'user',
        content,
        contentType,
      });

      const history = await getConversationHistory(conv.id, 50);
      const chatMessages = history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let fullResponse = '';

      try {
        for await (const token of streamChatCompletion(user.tenantId, chatMessages)) {
          fullResponse += token;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      } catch (streamError) {
        logger.error({ err: streamError }, 'Streaming error');
        res.write(`data: ${JSON.stringify({ error: 'Streaming interrupted' })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();

      if (fullResponse.trim()) {
        await saveMessage({
          conversationId: conv.id,
          role: 'assistant',
          content: fullResponse.trim(),
        });
      }
    } catch (err) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: 'Internal error' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      next(err);
    }
  }
);

export default router;
