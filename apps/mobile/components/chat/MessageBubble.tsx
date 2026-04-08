import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { spacing, fontSize, borderRadius } from '@/constants/theme';
import { formatTime } from '@/utils/dateFormat';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
  const branding = useAuthStore((s) => s.branding);
  const isUser = message.role === 'user';

  const bubbleColor = isUser
    ? branding.userBubbleColor
    : branding.assistantBubbleColor;

  const markdownStyles = {
    body: {
      color: branding.textColor,
      fontSize: fontSize.md,
      lineHeight: 22,
    },
    code_inline: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      color: '#E2E8F0',
      paddingHorizontal: 4,
      borderRadius: 4,
      fontFamily: 'monospace' as const,
      fontSize: fontSize.sm,
    },
    fence: {
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      marginVertical: spacing.sm,
    },
    code_block: {
      color: '#E2E8F0',
      fontFamily: 'monospace' as const,
      fontSize: fontSize.sm,
    },
    link: {
      color: '#93C5FD',
    },
    strong: {
      color: branding.textColor,
      fontWeight: '700' as const,
    },
    em: {
      color: branding.textColor,
      fontStyle: 'italic' as const,
    },
    bullet_list: {
      marginVertical: spacing.xs,
    },
    ordered_list: {
      marginVertical: spacing.xs,
    },
    list_item: {
      marginVertical: 2,
    },
  };

  return (
    <Animated.View
      entering={isStreaming ? undefined : FadeInDown.duration(200).springify()}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleColor,
            borderBottomRightRadius: isUser ? 4 : borderRadius.lg,
            borderBottomLeftRadius: isUser ? borderRadius.lg : 4,
          },
        ]}
      >
        {isUser ? (
          <Text style={[styles.userText, { color: branding.textColor }]}>
            {message.content}
          </Text>
        ) : (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        )}
      </View>
      {message.createdAt && !isStreaming && (
        <Text
          style={[
            styles.timestamp,
            {
              color: branding.textSecondary,
              alignSelf: isUser ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {formatTime(message.createdAt)}
        </Text>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  userText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: fontSize.xs,
    marginTop: 2,
    marginHorizontal: spacing.xs,
  },
});
