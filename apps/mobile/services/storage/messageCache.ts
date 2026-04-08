import { MMKV } from 'react-native-mmkv';
import type { Message } from '@/types/chat';

let storage: MMKV;

function getStorage(): MMKV {
  if (!storage) {
    storage = new MMKV({ id: 'message-cache' });
  }
  return storage;
}

const MAX_CACHED_MESSAGES = 100;

function cacheKey(conversationId: string): string {
  return `messages:${conversationId}`;
}

export function getCachedMessages(conversationId: string): Message[] {
  try {
    const json = getStorage().getString(cacheKey(conversationId));
    if (!json) return [];
    return JSON.parse(json) as Message[];
  } catch {
    return [];
  }
}

export function setCachedMessages(conversationId: string, messages: Message[]): void {
  try {
    const trimmed = messages.slice(-MAX_CACHED_MESSAGES);
    getStorage().set(cacheKey(conversationId), JSON.stringify(trimmed));
  } catch {
    // Silently fail on cache write errors
  }
}

export function appendCachedMessage(conversationId: string, message: Message): void {
  const existing = getCachedMessages(conversationId);
  existing.push(message);
  setCachedMessages(conversationId, existing);
}

export function clearCachedMessages(conversationId: string): void {
  try {
    getStorage().delete(cacheKey(conversationId));
  } catch {
    // Silently fail
  }
}

export function clearAllCache(): void {
  try {
    getStorage().clearAll();
  } catch {
    // Silently fail
  }
}
