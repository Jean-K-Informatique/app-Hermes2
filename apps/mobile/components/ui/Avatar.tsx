import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/authStore';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const branding = useAuthStore((s) => s.branding);

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: branding.primaryColor,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: size * 0.4, color: branding.textColor },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#374151',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
