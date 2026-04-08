import { Router } from 'express';
import { z } from 'zod';
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
  contentType: z.enum(['text', 'audio']).default('text'),
});

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
