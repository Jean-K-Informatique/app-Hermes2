import { create } from 'zustand';
import type { User, Tenant } from '@/types/auth';
import { authClient } from '@/services/api/authClient';
import {
  clearTokens,
  setTenantSlug,
  getTenantSlug,
} from '@/services/storage/secureStore';
import { DEFAULT_BRANDING, type BrandingConfig } from '@/constants/branding';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  branding: BrandingConfig;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  branding: DEFAULT_BRANDING,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password, tenantSlug) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authClient.login(email, password, tenantSlug);
      await setTenantSlug(tenantSlug);

      const branding = mergeBranding(result.tenant.branding);

      set({
        user: result.user,
        tenant: result.tenant,
        branding,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erreur de connexion',
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authClient.logout();
    } catch {
      // Best-effort
    }
    await clearTokens();
    set({
      user: null,
      tenant: null,
      branding: DEFAULT_BRANDING,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const meData = await authClient.getMe();
      if (meData?.user && meData.tenant) {
        const branding = mergeBranding(meData.tenant.branding);
        set({
          user: meData.user,
          tenant: meData.tenant,
          branding,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        await clearTokens();
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch {
      await clearTokens();
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

function mergeBranding(tenantBranding: Tenant['branding']): BrandingConfig {
  if (!tenantBranding) return DEFAULT_BRANDING;
  return {
    ...DEFAULT_BRANDING,
    ...(tenantBranding.appName && { appName: tenantBranding.appName }),
    ...(tenantBranding.primaryColor && {
      primaryColor: tenantBranding.primaryColor,
      userBubbleColor: tenantBranding.primaryColor,
    }),
    ...(tenantBranding.secondaryColor && { secondaryColor: tenantBranding.secondaryColor }),
    ...(tenantBranding.logoUrl && { logoUrl: tenantBranding.logoUrl }),
  };
}
