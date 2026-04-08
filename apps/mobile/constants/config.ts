import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getApiUrl(): string {
  // Use environment variable if available
  const envUrl = Constants.expoConfig?.extra?.apiUrl;
  if (envUrl) return envUrl;

  // Default based on platform
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }

  // On Android emulator, localhost maps to 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }

  // iOS simulator can use localhost
  return 'http://localhost:3001';
}

export const config = {
  apiUrl: getApiUrl(),
  messagePageSize: 50,
  conversationPageSize: 20,
  maxMessageLength: 50000,
  maxRecordingDurationMs: 120000, // 2 minutes
  cacheEncryptionKeyId: 'hermes-cache-key',
} as const;
