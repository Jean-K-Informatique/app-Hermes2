import { create } from 'zustand';
import type { Conversation, Message } from '@/types/chat';
import { hermesClient } from '@/services/api/hermesClient';
import {
  getCachedMessages,
  setCachedMessages,
  appendCachedMessage,
  clearCachedMessages,
} from '@/services/storage/messageCache';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  streamingMessage: string | null;
  isStreaming: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  fetchConversations: (page?: number, search?: string) => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  fetchMessages: (conversationId: string, page?: number) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  streamingMessage: null,
  isStreaming: false,
  isLoadingConversations: false,
  isLoadingMessages: false,
  error: null,

  fetchConversations: async (page = 1, search) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const data = await hermesClient.listConversations(page, 20, search);
      set({ conversations: data.conversations, isLoadingConversations: false });
    } catch (err) {
      set({
        isLoadingConversations: false,
        error: err instanceof Error ? err.message : 'Erreur de chargement',
      });
    }
  },

  createConversation: async (title) => {
    const conv = await hermesClient.createConversation(title);
    set((state) => ({
      conversations: [conv, ...state.conversations],
    }));
    return conv;
  },

  deleteConversation: async (id) => {
    await hermesClient.deleteConversation(id);
    clearCachedMessages(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: (() => {
        const copy = { ...state.messages };
        delete copy[id];
        return copy;
      })(),
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
    }));
  },

  renameConversation: async (id, title) => {
    const updated = await hermesClient.updateConversation(id, { title });
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title: updated.title } : c
      ),
    }));
  },

  setCurrentConversation: (id) => {
    set({ currentConversationId: id });
  },

  fetchMessages: async (conversationId, page = 1) => {
    // Show cached messages immediately
    if (page === 1) {
      const cached = getCachedMessages(conversationId);
      if (cached.length > 0) {
        set((state) => ({
          messages: { ...state.messages, [conversationId]: cached },
        }));
      }
    }

    set({ isLoadingMessages: true });
    try {
      const data = await hermesClient.getConversation(conversationId, page);
      const newMessages = data.messages;

      if (page === 1) {
        set((state) => ({
          messages: { ...state.messages, [conversationId]: newMessages },
          isLoadingMessages: false,
        }));
        setCachedMessages(conversationId, newMessages);
      } else {
        // Prepend older messages
        set((state) => {
          const existing = state.messages[conversationId] ?? [];
          const merged = [...newMessages, ...existing];
          return {
            messages: { ...state.messages, [conversationId]: merged },
            isLoadingMessages: false,
          };
        });
      }
    } catch (err) {
      set({
        isLoadingMessages: false,
        error: err instanceof Error ? err.message : 'Erreur de chargement',
      });
    }
  },

  sendMessage: async (conversationId, content) => {
    // Optimistically add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      contentType: 'text',
      audioUrl: null,
      audioDurationMs: null,
      tokenCount: null,
      metadata: null,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      return {
        messages: { ...state.messages, [conversationId]: [...existing, userMessage] },
        streamingMessage: '',
        isStreaming: true,
      };
    });

    appendCachedMessage(conversationId, userMessage);

    // Update conversation in list
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessagePreview: content.substring(0, 100),
              lastMessageAt: new Date().toISOString(),
              messageCount: (c.messageCount ?? 0) + 1,
            }
          : c
      ),
    }));

    await hermesClient.sendMessage(
      conversationId,
      content,
      // onToken
      (token) => {
        set((state) => ({
          streamingMessage: (state.streamingMessage ?? '') + token,
        }));
      },
      // onDone
      (fullContent) => {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          conversationId,
          role: 'assistant',
          content: fullContent,
          contentType: 'text',
          audioUrl: null,
          audioDurationMs: null,
          tokenCount: null,
          metadata: null,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const existing = state.messages[conversationId] ?? [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...existing, assistantMessage],
            },
            streamingMessage: null,
            isStreaming: false,
          };
        });

        appendCachedMessage(conversationId, assistantMessage);

        // Update conversation preview
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessagePreview: fullContent.substring(0, 100),
                  lastMessageAt: new Date().toISOString(),
                  messageCount: (c.messageCount ?? 0) + 1,
                }
              : c
          ),
        }));
      },
      // onError
      (error) => {
        set({
          streamingMessage: null,
          isStreaming: false,
          error: error.message,
        });
      }
    );
  },

  clearError: () => set({ error: null }),
}));
