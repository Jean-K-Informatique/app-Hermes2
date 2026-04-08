import { config } from '@/constants/config';
import { getAccessToken } from '@/services/storage/secureStore';
import { authClient } from './authClient';
import type {
  Conversation,
  ConversationListResponse,
  ConversationDetailResponse,
} from '@/types/chat';
import type { ApiError, TranscriptionResponse } from '@/types/api';

class HermesClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${config.apiUrl}/api/v1`;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    let token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Wraps a fetch call with automatic 401 → refresh → retry logic.
   */
  private async fetchWithAuth(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const headers = await this.getHeaders();
    const res = await fetch(url, { ...init, headers: { ...headers, ...init.headers } });

    if (res.status === 401) {
      const refreshed = await authClient.refresh();
      if (!refreshed) throw new Error('Session expired');

      const retryHeaders = await this.getHeaders();
      return fetch(url, { ...init, headers: { ...retryHeaders, ...init.headers } });
    }

    return res;
  }

  // ─── Conversations ────────────────────────────────────────

  async listConversations(page = 1, limit = 20, search?: string): Promise<ConversationListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);

    const res = await this.fetchWithAuth(`${this.baseUrl}/conversations?${params}`);
    if (!res.ok) {
      const err = (await res.json()) as ApiError;
      throw new Error(err.error);
    }
    return (await res.json()) as ConversationListResponse;
  }

  async createConversation(title?: string): Promise<Conversation> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = (await res.json()) as ApiError;
      throw new Error(err.error);
    }
    return (await res.json()) as Conversation;
  }

  async getConversation(id: string, page = 1, limit = 50): Promise<ConversationDetailResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const res = await this.fetchWithAuth(`${this.baseUrl}/conversations/${id}?${params}`);
    if (!res.ok) {
      const err = (await res.json()) as ApiError;
      throw new Error(err.error);
    }
    return (await res.json()) as ConversationDetailResponse;
  }

  async updateConversation(
    id: string,
    data: { title?: string; isArchived?: boolean }
  ): Promise<Conversation> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json()) as ApiError;
      throw new Error(err.error);
    }
    return (await res.json()) as Conversation;
  }

  async deleteConversation(id: string): Promise<void> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const err = (await res.json()) as ApiError;
      throw new Error(err.error);
    }
  }

  // ─── Messages (SSE Streaming) ─────────────────────────────

  async sendMessage(
    conversationId: string,
    content: string,
    onToken: (token: string) => void,
    onDone: (fullContent: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const token = await getAccessToken();
    if (!token) {
      onError(new Error('Not authenticated'));
      return;
    }

    try {
      const res = await fetch(
        `${this.baseUrl}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ content, contentType: 'text' }),
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          const refreshed = await authClient.refresh();
          if (!refreshed) {
            onError(new Error('Session expired'));
            return;
          }
          // Retry with new token
          return this.sendMessage(conversationId, content, onToken, onDone, onError);
        }
        const err = (await res.json()) as ApiError;
        onError(new Error(err.error));
        return;
      }

      if (!res.body) {
        onError(new Error('No response body'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            onDone(fullContent);
            return;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.token) {
                fullContent += data.token;
                onToken(data.token);
              }
              if (data.error) {
                onError(new Error(data.error));
                return;
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }

      // If we exit the loop without [DONE], finalize
      if (fullContent) {
        onDone(fullContent);
      }
    } catch (err) {
      onError(err instanceof Error ? err : new Error('Network error'));
    }
  }

  // ─── Transcription ────────────────────────────────────────

  async transcribeAudio(audioUri: string): Promise<TranscriptionResponse> {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();

    // React Native file upload
    const file = {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob;

    formData.append('audio', file);

    const res = await fetch(`${this.baseUrl}/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = (await res.json()) as ApiError;
      throw new Error(err.error);
    }

    return (await res.json()) as TranscriptionResponse;
  }

  // ─── Branding ─────────────────────────────────────────────

  async getTenantBranding(slug: string): Promise<{
    name: string;
    slug: string;
    branding: Record<string, string>;
  }> {
    const res = await fetch(
      `${this.baseUrl}/tenant/branding?slug=${encodeURIComponent(slug)}`
    );
    if (!res.ok) {
      const err = (await res.json()) as ApiError;
      throw new Error(err.error);
    }
    return res.json();
  }
}

export const hermesClient = new HermesClient();
