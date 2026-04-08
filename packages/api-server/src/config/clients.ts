import { env } from './env.js';

/**
 * Multi-tenant CORS configuration.
 * In production, each tenant would register their allowed origins.
 * For now, we allow common development origins and configure per-env.
 */
export function getAllowedOrigins(): string[] {
  if (env.NODE_ENV === 'development') {
    return [
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
  }

  // In production, allowed origins should be loaded from tenant config
  // For now, return the API URL origin
  return [new URL(env.API_URL).origin];
}
