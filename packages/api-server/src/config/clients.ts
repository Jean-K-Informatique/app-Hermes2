import { env } from './env.js';

export function getAllowedOrigins(): string[] {
  // Read CORS_ORIGINS from environment (comma-separated)
  const corsEnv = process.env.CORS_ORIGINS;
  if (corsEnv) {
    return corsEnv.split(',').map((o) => o.trim()).filter(Boolean);
  }

  // Fallback
  if (env.NODE_ENV === 'development') {
    return [
      'http://localhost:5173',
      'http://192.168.1.141:5173',
      'http://localhost:8081',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
  }

  return [new URL(env.API_URL).origin];
}
