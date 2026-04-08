import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validateInput.js';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessages,
} from '../services/conversationService.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const createSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  isArchived: z.boolean().optional(),
});

const messagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// GET /api/v1/conversations
router.get('/', authenticate, validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { page, limit, search } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const convos = await listConversations(user.id, user.tenantId, {
      page,
      limit,
      search,
    });

    res.json({ conversations: convos, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/conversations
router.post('/', authenticate, validateBody(createSchema), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { title } = req.body as z.infer<typeof createSchema>;

    const conv = await createConversation(user.id, user.tenantId, title);
    res.status(201).json(conv);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/conversations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const conv = await getConversation(req.params.id as string, user.id, user.tenantId);

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const { page, limit } = messagesQuerySchema.parse(req.query);
    const msgs = await getMessages(conv.id, { page, limit });

    res.json({
      conversation: conv,
      messages: msgs.reverse(), // Return in chronological order
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/conversations/:id
router.patch('/:id', authenticate, validateBody(updateSchema), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const updates = req.body as z.infer<typeof updateSchema>;

    const conv = await updateConversation(req.params.id as string, user.id, user.tenantId, updates);

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json(conv);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/conversations/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const conv = await getConversation(req.params.id as string, user.id, user.tenantId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    await deleteConversation(req.params.id as string, user.id, user.tenantId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
