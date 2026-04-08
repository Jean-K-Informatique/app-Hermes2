import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NetworkStatus } from '@/components/common/NetworkStatus';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { DEFAULT_BRANDING } from '@/constants/branding';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadSession = useAuthStore((s) => s.loadSession);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    async function init() {
      await loadSettings();
      await loadSession();
      await SplashScreen.hideAsync();
    }
    init();
  }, [loadSession, loadSettings]);

  if (isLoading) {
    return null; // Splash screen is still visible
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" />
        <NetworkStatus />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: DEFAULT_BRANDING.backgroundColor },
            animation: 'slide_from_right',
          }}
        />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DEFAULT_BRANDING.backgroundColor,
  },
});
