import { config } from '@/constants/config';
import type { LoginResponse, RefreshResponse, MeResponse } from '@/types/auth';
import type { ApiError } from '@/types/api';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/services/storage/secureStore';

class AuthClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${config.apiUrl}/api/v1/auth`;
  }

  async login(email: string, password: string, tenantSlug: string): Promise<LoginResponse> {
    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug }),
    });

    if (!res.ok) {
      const error = (await res.json()) as ApiError;
      throw new Error(error.error || 'Login failed');
    }

    const data = (await res.json()) as LoginResponse;

    await setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);

    return data;
  }

  async refresh(): Promise<RefreshResponse | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as RefreshResponse;

      await setAccessToken(data.accessToken);
      await setRefreshToken(data.refreshToken);

      return data;
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    const token = await getAccessToken();
    if (token) {
      try {
        await fetch(`${this.baseUrl}/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Best-effort logout
      }
    }
  }

  async getMe(): Promise<MeResponse | null> {
    const token = await getAccessToken();
    if (!token) return null;

    const res = await fetch(`${this.baseUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      // Try refresh
      const refreshed = await this.refresh();
      if (!refreshed) return null;

      const retryRes = await fetch(`${this.baseUrl}/me`, {
        headers: { Authorization: `Bearer ${refreshed.accessToken}` },
      });

      if (!retryRes.ok) return null;
      return (await retryRes.json()) as MeResponse;
    }

    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  }

  async updateProfile(data: {
    displayName?: string;
    avatarUrl?: string;
    pushToken?: string;
  }): Promise<void> {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${this.baseUrl}/me`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = (await res.json()) as ApiError;
      throw new Error(error.error || 'Update failed');
    }
  }
}

export const authClient = new AuthClient();
