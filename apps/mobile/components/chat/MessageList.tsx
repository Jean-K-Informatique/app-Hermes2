import React, { useRef, useCallback, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet, type ListRenderItem } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { spacing, fontSize } from '@/constants/theme';
import type { Message } from '@/types/chat';

interface MessageListProps {
  conversationId: string;
  onLoadMore: () => void;
}

export function MessageList({ conversationId, onLoadMore }: MessageListProps) {
  const branding = useAuthStore((s) => s.branding);
  const messages = useChatStore((s) => s.messages[conversationId] ?? []);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const flatListRef = useRef<FlatList>(null);

  // Build data array: messages + streaming bubble
  const data: Message[] = [...messages];
  if (isStreaming && streamingMessage !== null) {
    data.push({
      id: 'streaming',
      conversationId,
      role: 'assistant',
      content: streamingMessage,
      contentType: 'text',
      audioUrl: null,
      audioDurationMs: null,
      tokenCount: null,
      metadata: null,
      createdAt: null,
    });
  }

  // Auto-scroll when new messages arrive or streaming updates
  useEffect(() => {
    if (data.length > 0) {
      // Small delay to allow FlatList to render the new item
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [data.length, streamingMessage]);

  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => (
      <MessageBubble
        message={item}
        isStreaming={item.id === 'streaming'}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: branding.textColor }]}>
          Nouvelle conversation
        </Text>
        <Text style={[styles.emptySubtitle, { color: branding.textSecondary }]}>
          Envoyez un message pour commencer.
        </Text>
      </View>
    ),
    [branding]
  );

  const renderFooter = useCallback(() => {
    if (isStreaming && streamingMessage === '') {
      return <TypingIndicator />;
    }
    return null;
  }, [isStreaming, streamingMessage]);

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={[
        styles.content,
        data.length === 0 && styles.emptyContent,
      ]}
      showsVerticalScrollIndicator={false}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.sm,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
