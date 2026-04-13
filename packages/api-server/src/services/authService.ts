import { hash, verify } from '@node-rs/bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';
import { users, tenants, refreshTokens } from '../database/schema.js';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  const [, value, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return parseInt(value, 10) * multipliers[unit];
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return verify(password, passwordHash);
}

export async function generateAccessToken(payload: {
  sub: string;
  tenantId: string;
  email: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    tenant_id: payload.tenantId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    sub: payload.sub as string,
    tenantId: payload.tenant_id as string,
    email: payload.email as string,
  };
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function generateRefreshToken(
  userId: string,
  deviceInfo?: string
): Promise<string> {
  const token = randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(
    Date.now() + parseExpiry(env.REFRESH_TOKEN_EXPIRY)
  ).toISOString();

  await db.insert(refreshTokens).values({
    id: uuidv4(),
    userId,
    tokenHash,
    deviceInfo: deviceInfo ?? null,
    expiresAt,
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
  deviceInfo?: string
): Promise<{ accessToken: string; refreshToken: string; user: typeof users.$inferSelect } | null> {
  const oldHash = hashRefreshToken(oldToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, oldHash))
    .limit(1);

  if (!stored) return null;

  // Check expiry
  if (new Date(stored.expiresAt) < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
    return null;
  }

  // Delete old token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, stored.userId))
    .limit(1);

  if (!user || !user.isActive) return null;

  // Get tenant
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  if (!tenant || !tenant.isActive) return null;

  // Generate new tokens
  const accessToken = await generateAccessToken({
    sub: user.id,
    tenantId: user.tenantId,
    email: user.email,
  });
  const refreshToken = await generateRefreshToken(user.id, deviceInfo);

  return { accessToken, refreshToken, user };
}

export async function login(
  email: string,
  password: string,
  tenantSlug?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: typeof users.$inferSelect;
  tenant: typeof tenants.$inferSelect;
} | null> {
  let tenant: typeof tenants.$inferSelect | undefined;
  let user: typeof users.$inferSelect | undefined;

  if (tenantSlug) {
    // Find by tenant slug + email
    const [t] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.isActive, true)))
      .limit(1);
    if (!t) return null;
    tenant = t;

    const [u] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email.toLowerCase()),
          eq(users.tenantId, t.id),
          eq(users.isActive, true)
        )
      )
      .limit(1);
    user = u;
  } else {
    // No tenant slug — find user by email across all active tenants
    const [u] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email.toLowerCase()),
          eq(users.isActive, true)
        )
      )
      .limit(1);
    if (!u) return null;
    user = u;

    const [t] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, u.tenantId), eq(tenants.isActive, true)))
      .limit(1);
    tenant = t;
  }

  if (!user || !tenant) return null;

  // Verify password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  // Update last seen
  await db
    .update(users)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(users.id, user.id));

  // Generate tokens
  const accessToken = await generateAccessToken({
    sub: user.id,
    tenantId: tenant.id,
    email: user.email,
  });
  const refreshToken = await generateRefreshToken(user.id);

  return { accessToken, refreshToken, user, tenant };
}

export async function revokeRefreshTokensForUser(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
