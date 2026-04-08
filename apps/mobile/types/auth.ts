export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastSeenAt?: string | null;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  branding: TenantBranding | null;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  appName?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: User;
  tenant: Tenant | null;
}
