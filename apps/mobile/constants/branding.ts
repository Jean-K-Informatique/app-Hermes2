export interface BrandingConfig {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondary: string;
  userBubbleColor: string;
  assistantBubbleColor: string;
  borderRadius: number;
  fontFamily: string;
  logoUrl?: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'HermesChat',
  primaryColor: '#6366F1',
  secondaryColor: '#8B5CF6',
  backgroundColor: '#0F172A',
  surfaceColor: '#1E293B',
  textColor: '#F8FAFC',
  textSecondary: '#94A3B8',
  userBubbleColor: '#6366F1',
  assistantBubbleColor: '#1E293B',
  borderRadius: 16,
  fontFamily: 'System',
};
