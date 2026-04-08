import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_BRANDING } from '@/constants/branding';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DEFAULT_BRANDING.backgroundColor },
      }}
    />
  );
}
