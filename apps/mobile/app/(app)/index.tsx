import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Avatar } from '@/components/ui/Avatar';
import { spacing, fontSize, borderRadius } from '@/constants/theme';
import { formatRelativeDate } from '@/utils/dateFormat';
import { SIDEBAR_WIDTH } from '@/utils/platform';
import type { Conversation } from '@/types/chat';

export default function ConversationsScreen() {
  const branding = useAuthStore((s) => s.branding);
  const conversations = useChatStore((s) => s.conversations);
  const isLoading = useChatStore((s) => s.isLoadingConversations);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations(1, search || undefined);
    setRefreshing(false);
  }, [fetchConversations, search]);

  const handleNewConversation = useCallback(async () => {
    const conv = await createConversation();
    router.push(`/(app)/chat/${conv.id}`);
  }, [createConversation]);

  const handleSearch = useCallback(
    (text: string) => {
      setSearch(text);
      fetchConversations(1, text || undefined);
    },
    [fetchConversations]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const doDelete = () => deleteConversation(id);
      if (Platform.OS === 'web') {
        if (confirm('Supprimer cette conversation ?')) doDelete();
      } else {
        Alert.alert('Supprimer', 'Supprimer cette conversation ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: doDelete },
        ]);
      }
    },
    [deleteConversation]
  );

  const filteredConversations = conversations;

  const renderItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => (
      <Animated.View entering={FadeIn.delay(index * 50).duration(200)}>
        <TouchableOpacity
          style={[styles.conversationItem, { backgroundColor: branding.surfaceColor }]}
          onPress={() => router.push(`/(app)/chat/${item.id}`)}
          onLongPress={() => handleDelete(item.id)}
          activeOpacity={0.7}
        >
          <Avatar name={item.title} size={44} />
          <View style={styles.convInfo}>
            <View style={styles.convHeader}>
              <Text
                style={[styles.convTitle, { color: branding.textColor }]}
                numberOfLines={1}
              >
                {item.title || 'Nouvelle conversation'}
              </Text>
              <Text style={[styles.convDate, { color: branding.textSecondary }]}>
                {formatRelativeDate(item.lastMessageAt)}
              </Text>
            </View>
            {item.lastMessagePreview && (
              <Text
                style={[styles.convPreview, { color: branding.textSecondary }]}
                numberOfLines={2}
              >
                {item.lastMessagePreview}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    ),
    [branding, handleDelete]
  );

  const renderEmpty = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: branding.textColor }]}>
            Aucune conversation
          </Text>
          <Text style={[styles.emptySubtitle, { color: branding.textSecondary }]}>
            Commencez une nouvelle conversation avec votre assistant.
          </Text>
        </View>
      ) : null,
    [isLoading, branding]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: branding.backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: branding.textColor }]}>
          {branding.appName}
        </Text>
        <TouchableOpacity onPress={() => router.push('/(app)/settings')}>
          <Text style={[styles.settingsIcon, { color: branding.textSecondary }]}>
            {'\u2699'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: branding.surfaceColor }]}>
        <TextInput
          style={[styles.searchInput, { color: branding.textColor }]}
          placeholder="Rechercher..."
          placeholderTextColor={branding.textSecondary}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Conversations list */}
      {isLoading && conversations.length === 0 ? (
        <LoadingSpinner fullScreen />
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            filteredConversations.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={branding.primaryColor}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB — New conversation */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: branding.primaryColor }]}
        onPress={handleNewConversation}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  settingsIcon: {
    fontSize: 24,
  },
  searchContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 80,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  convInfo: {
    flex: 1,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  convTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  convDate: {
    fontSize: fontSize.xs,
  },
  convPreview: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
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
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
