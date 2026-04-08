import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { spacing, fontSize, borderRadius } from '@/constants/theme';
import { isWeb } from '@/utils/platform';

interface MessageInputProps {
  onSend: (text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
  isDisabled: boolean;
  recordingDuration: number;
}

export function MessageInput({
  onSend,
  onStartRecording,
  onStopRecording,
  isRecording,
  isDisabled,
  recordingDuration,
}: MessageInputProps) {
  const branding = useAuthStore((s) => s.branding);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const pulseScale = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    // Keep focus on input after sending
    inputRef.current?.focus();
  }, [text, onSend]);

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (!isWeb) return;
      if (e.nativeEvent.key === 'Enter' && !(e.nativeEvent as unknown as KeyboardEvent).shiftKey) {
        e.preventDefault?.();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleMicPressIn = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1
    );
    onStartRecording();
  }, [onStartRecording, pulseScale]);

  const handleMicPressOut = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    pulseScale.value = withTiming(1, { duration: 150 });
    onStopRecording();
  }, [onStopRecording, pulseScale]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: branding.backgroundColor }]}>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: branding.surfaceColor },
        ]}
      >
        {isRecording ? (
          <View style={styles.recordingIndicator}>
            <Animated.View
              style={[styles.recordingDot, pulseStyle]}
            />
            <TextInput
              style={[styles.input, { color: '#EF4444' }]}
              value={`Enregistrement... ${formatDuration(recordingDuration)}`}
              editable={false}
            />
          </View>
        ) : (
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: branding.textColor }]}
            placeholder="Votre message..."
            placeholderTextColor={branding.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={50000}
            scrollEnabled
            onKeyPress={handleKeyPress}
            editable={!isDisabled}
          />
        )}

        {hasText ? (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: branding.primaryColor }]}
            onPress={handleSend}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <SendIcon color={branding.textColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: isRecording ? '#EF4444' : branding.surfaceColor,
              },
            ]}
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <MicIcon color={isRecording ? '#FFFFFF' : branding.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SendIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 10,
          borderRightWidth: 10,
          borderBottomWidth: 16,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '90deg' }],
        }}
      />
    </View>
  );
}

function MicIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 10,
          height: 14,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: 16,
          height: 2,
          backgroundColor: color,
          marginTop: 2,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: borderRadius.xl,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    maxHeight: 120,
    paddingVertical: spacing.sm,
    lineHeight: 22,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
});
