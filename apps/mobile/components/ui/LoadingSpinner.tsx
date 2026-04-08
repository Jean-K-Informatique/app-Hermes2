import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'large', fullScreen = false }: LoadingSpinnerProps) {
  const branding = useAuthStore((s) => s.branding);

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: branding.backgroundColor }]}>
        <ActivityIndicator size={size} color={branding.primaryColor} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={branding.primaryColor} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
