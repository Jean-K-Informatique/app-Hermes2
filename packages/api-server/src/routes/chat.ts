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
import { streamChatCompletion } from '../services/hermesProxy.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../logger.js';

const router = Router();

const sendMessageSchema = z.object({
  content: z.string().min(1).max(50000),
  contentType: z.enum(['text', 'audio', 'image']).default('text'),
});

// --- File upload route ---

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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAudio =
      file.mimetype.startsWith('audio/') ||
      ALLOWED_AUDIO_MIMES.includes(file.mimetype) ||
      ALLOWED_AUDIO_EXTS.includes(ext);
    const isImage = file.mimetype.startsWith('image/');

    if (isAudio || isImage) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and image files are accepted'));
    }
  },
});

// POST /api/v1/conversations/:id/upload
router.post(
  '/:id/upload',
  authenticate,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const conversationId = req.params.id as string;

      // Verify conversation belongs to user
      const conv = await getConversation(conversationId, user.id, user.tenantId);
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const isAudio = req.file.mimetype.startsWith('audio/') ||
        ALLOWED_AUDIO_EXTS.includes(path.extname(req.file.originalname).toLowerCase());
      const contentType = isAudio ? 'audio' : 'image';
      const content = isAudio ? '[Fichier audio]' : '[Image]';
      const fileUrl = `/uploads/${conversationId}/${req.file.filename}`;
      const audioDurationMs = req.body.audioDurationMs
        ? parseInt(req.body.audioDurationMs, 10)
        : undefined;

      const message = await saveMessage({
        conversationId: conv.id,
        role: 'user',
        content,
        contentType: contentType as 'audio' | 'image',
        audioUrl: fileUrl,
        audioDurationMs,
      });

      logger.info(
        { conversationId, contentType, fileUrl },
        'File uploaded'
      );

      res.json({
        message: {
          id: message.id,
          content: message.content,
          contentType: message.contentType,
          audioUrl: message.audioUrl,
          createdAt: message.createdAt,
        },
        fileUrl,
      });
    } catch (err) {
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

      // Verify conversation belongs to user
      const conv = await getConversation(req.params.id as string, user.id, user.tenantId);
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // 1. Save user message
      await saveMessage({
        conversationId: conv.id,
        role: 'user',
        content,
        contentType,
      });

      // 2. Get conversation history
      const history = await getConversationHistory(conv.id, 50);
      const chatMessages = history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // 3. Set up SSE response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // 4. Stream from Hermes
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

      // 5. Send done signal
      res.write('data: [DONE]\n\n');
      res.end();

      // 6. Save assistant response
      if (fullResponse.trim()) {
        await saveMessage({
          conversationId: conv.id,
          role: 'assistant',
          content: fullResponse.trim(),
        });
      }
    } catch (err) {
      // If headers already sent, just end the response
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
