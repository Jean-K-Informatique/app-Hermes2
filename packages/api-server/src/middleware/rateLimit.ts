import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const defaultRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const authRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,          // 5 attempts per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

export const transcriptionRateLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many transcription requests, please try again later' },
});
