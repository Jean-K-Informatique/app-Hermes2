import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { join } from 'node:path';
import { env } from './config/env.js';
import { getAllowedOrigins } from './config/clients.js';
import { defaultRateLimit } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import transcriptionRoutes from './routes/transcription.js';
import { db } from './database/connection.js';
import { tenants } from './database/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from './logger.js';

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);

// Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', defaultRateLimit);

// Serve uploaded files
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Request');
  next();
});

// Public routes (no auth required)
// GET /api/v1/tenant/branding?slug=cabinet-dupont
app.get('/api/v1/tenant/branding', async (req, res, next) => {
  try {
    const slug = req.query.slug as string;
    if (!slug) {
      res.status(400).json({ error: 'Missing slug parameter' });
      return;
    }

    const [tenant] = await db
      .select({
        name: tenants.name,
        slug: tenants.slug,
        branding: tenants.brandingConfig,
      })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({
      name: tenant.name,
      slug: tenant.slug,
      branding: tenant.branding ?? {},
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/conversations', chatRoutes);
app.use('/api/v1/transcribe', transcriptionRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV, mock: env.MOCK_HERMES }, 'Server started');
});

export default app;
