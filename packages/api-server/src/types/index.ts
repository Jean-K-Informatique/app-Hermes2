import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  appName?: string;
}

export interface HermesMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SSEToken {
  token: string;
}

export interface TranscriptionResult {
  text: string;
  durationMs: number;
}
