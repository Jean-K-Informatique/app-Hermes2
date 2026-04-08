import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { spacing, fontSize, borderRadius } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const branding = useAuthStore((s) => s.branding);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: branding.textSecondary }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: branding.surfaceColor,
            color: branding.textColor,
            borderColor: error
              ? '#EF4444'
              : isFocused
                ? branding.primaryColor
                : 'transparent',
          },
          style,
        ]}
        placeholderTextColor={branding.textSecondary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  error: {
    color: '#EF4444',
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
