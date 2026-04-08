import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'hermes_access_token';
const REFRESH_TOKEN_KEY = 'hermes_refresh_token';
const TENANT_SLUG_KEY = 'hermes_tenant_slug';

// On web, SecureStore is not available — use AsyncStorage as fallback
const isSecureStoreAvailable = Platform.OS !== 'web';

async function getItem(key: string): Promise<string | null> {
  if (isSecureStoreAvailable) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  return setItem(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  return setItem(REFRESH_TOKEN_KEY, token);
}

export async function getTenantSlug(): Promise<string | null> {
  return getItem(TENANT_SLUG_KEY);
}

export async function setTenantSlug(slug: string): Promise<void> {
  return setItem(TENANT_SLUG_KEY, slug);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
  ]);
}
