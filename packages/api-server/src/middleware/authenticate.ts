import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/authService.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);

    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
