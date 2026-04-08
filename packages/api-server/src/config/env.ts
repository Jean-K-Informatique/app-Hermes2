import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().url().default('http://localhost:3001'),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('30d'),

  ENCRYPTION_KEY: z.string().min(32),

  WHISPER_MODE: z.enum(['api', 'local', 'disabled']).default('disabled'),
  WHISPER_API_KEY: z.string().optional(),
  WHISPER_MODEL: z.string().default('whisper-1'),
  WHISPER_LOCAL_MODEL: z.string().default('base'),

  EXPO_ACCESS_TOKEN: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(30),

  MOCK_HERMES: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
