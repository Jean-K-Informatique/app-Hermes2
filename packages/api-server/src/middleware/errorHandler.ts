import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');

  const statusCode = 'statusCode' in err ? (err as { statusCode: number }).statusCode : 500;

  res.status(statusCode).json({
    error: statusCode === 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}
