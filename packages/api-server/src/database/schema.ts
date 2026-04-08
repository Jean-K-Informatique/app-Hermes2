import {
  sqliteTable,
  text,
  integer,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Using SQLite-compatible schema (works with both SQLite dev and can be adapted for Postgres)

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  hermesApiUrl: text('hermes_api_url').notNull(),
  hermesApiKey: text('hermes_api_key').notNull(), // Encrypted (AES-256-GCM)
  brandingConfig: text('branding_config', { mode: 'json' }).$type<{
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    appName?: string;
  }>(),
  maxUsers: integer('max_users').default(50),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  pushToken: text('push_token'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSeenAt: text('last_seen_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  title: text('title'),
  lastMessagePreview: text('last_message_preview'),
  lastMessageAt: text('last_message_at'),
  messageCount: integer('message_count').default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  contentType: text('content_type', { enum: ['text', 'audio', 'image'] }).default('text'),
  audioUrl: text('audio_url'),
  audioDurationMs: integer('audio_duration_ms'),
  tokenCount: integer('token_count'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  deviceInfo: text('device_info'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Type exports
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
