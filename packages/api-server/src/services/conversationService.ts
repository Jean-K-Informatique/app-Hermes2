import { eq, and, desc, like, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';
import { conversations, messages } from '../database/schema.js';

export async function listConversations(
  userId: string,
  tenantId: string,
  options: { page?: number; limit?: number; search?: string } = {}
) {
  const { page = 1, limit = 20, search } = options;
  const offset = (page - 1) * limit;

  let query = db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.tenantId, tenantId),
        eq(conversations.isArchived, false),
        search ? like(conversations.title, `%${search}%`) : undefined
      )
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit)
    .offset(offset);

  return query;
}

export async function getConversation(conversationId: string, userId: string, tenantId: string) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
        eq(conversations.tenantId, tenantId)
      )
    )
    .limit(1);

  return conv ?? null;
}

export async function createConversation(userId: string, tenantId: string, title?: string) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.insert(conversations).values({
    id,
    userId,
    tenantId,
    title: title ?? 'Nouvelle conversation',
    lastMessageAt: now,
    messageCount: 0,
  });

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  return conv;
}

export async function updateConversation(
  conversationId: string,
  userId: string,
  tenantId: string,
  data: { title?: string; isArchived?: boolean }
) {
  await db
    .update(conversations)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
        eq(conversations.tenantId, tenantId)
      )
    );

  return getConversation(conversationId, userId, tenantId);
}

export async function deleteConversation(
  conversationId: string,
  userId: string,
  tenantId: string
) {
  // Messages are deleted via CASCADE
  const result = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
        eq(conversations.tenantId, tenantId)
      )
    );

  return true;
}

export async function getMessages(
  conversationId: string,
  options: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function saveMessage(data: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentType?: 'text' | 'audio' | 'image';
  audioUrl?: string;
  audioDurationMs?: number;
  tokenCount?: number;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.insert(messages).values({
    id,
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    contentType: data.contentType ?? 'text',
    audioUrl: data.audioUrl ?? null,
    audioDurationMs: data.audioDurationMs ?? null,
    tokenCount: data.tokenCount ?? null,
    createdAt: now,
  });

  // Update conversation metadata
  const preview = data.content.substring(0, 100);
  await db
    .update(conversations)
    .set({
      lastMessagePreview: preview,
      lastMessageAt: now,
      messageCount: sql`${conversations.messageCount} + 1`,
      updatedAt: now,
    })
    .where(eq(conversations.id, data.conversationId));

  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);

  return msg;
}

export async function getConversationHistory(conversationId: string, limit = 50) {
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  // Return in chronological order
  return msgs.reverse();
}
