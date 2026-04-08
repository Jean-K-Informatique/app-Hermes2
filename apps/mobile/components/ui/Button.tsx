import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { spacing, fontSize, borderRadius } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const branding = useAuthStore((s) => s.branding);

  const buttonStyles: ViewStyle[] = [
    styles.base,
    sizeStyles[size],
    {
      backgroundColor:
        variant === 'primary'
          ? branding.primaryColor
          : variant === 'secondary'
            ? branding.surfaceColor
            : 'transparent',
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: branding.primaryColor,
      opacity: disabled || loading ? 0.6 : 1,
    },
    style,
  ];

  const labelStyles: TextStyle[] = [
    styles.label,
    {
      color:
        variant === 'ghost'
          ? branding.primaryColor
          : branding.textColor,
      fontSize: size === 'sm' ? fontSize.sm : size === 'lg' ? fontSize.lg : fontSize.md,
    },
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={branding.textColor} size="small" />
      ) : (
        <Text style={labelStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const sizeStyles: Record<string, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontWeight: '600',
  },
});
