import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { validateBody } from '../middleware/validateInput.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { login, rotateRefreshToken, revokeRefreshTokensForUser } from '../services/authService.js';
import { db } from '../database/connection.js';
import { users, tenants } from '../database/schema.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  pushToken: z.string().optional(),
});

// POST /api/v1/auth/login
router.post('/login', authRateLimit, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, tenantSlug } = req.body as z.infer<typeof loginSchema>;
    const result = await login(email, password, tenantSlug);

    if (!result) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { accessToken, refreshToken, user, tenant } = result;

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        branding: tenant.brandingConfig,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
    const result = await rotateRefreshToken(refreshToken);

    if (!result) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    await revokeRefreshTokensForUser(user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { user: authUser } = req as AuthenticatedRequest;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, authUser.tenantId))
      .limit(1);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        lastSeenAt: user.lastSeenAt,
        createdAt: user.createdAt,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            branding: tenant.brandingConfig,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/auth/me
router.patch('/me', authenticate, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const { user: authUser } = req as AuthenticatedRequest;
    const updates = req.body as z.infer<typeof updateProfileSchema>;

    await db
      .update(users)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(users.id, authUser.id));

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
