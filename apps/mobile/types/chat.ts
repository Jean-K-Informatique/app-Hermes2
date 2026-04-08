export interface Conversation {
  id: string;
  userId: string;
  tenantId: string;
  title: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  messageCount: number | null;
  isArchived: boolean | null;
  metadata: unknown;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentType: 'text' | 'audio' | 'image' | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  tokenCount: number | null;
  metadata: unknown;
  createdAt: string | null;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  page: number;
  limit: number;
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: Message[];
  page: number;
  limit: number;
}
