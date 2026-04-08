import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { spacing, borderRadius } from '@/constants/theme';

export function TypingIndicator() {
  const branding = useAuthStore((s) => s.branding);

  return (
    <View style={[styles.container, { backgroundColor: branding.assistantBubbleColor }]}>
      <Dot delay={0} color={branding.textSecondary} />
      <Dot delay={150} color={branding.textSecondary} />
      <Dot delay={300} color={branding.textSecondary} />
    </View>
  );
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    marginLeft: spacing.md,
    marginVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
