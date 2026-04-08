import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { spacing, fontSize, borderRadius } from '@/constants/theme';

interface ChatHeaderProps {
  conversationId: string;
  title: string;
}

export function ChatHeader({ conversationId, title }: ChatHeaderProps) {
  const branding = useAuthStore((s) => s.branding);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [showMenu, setShowMenu] = useState(false);

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle.trim() !== title) {
      await renameConversation(conversationId, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    const doDelete = async () => {
      await deleteConversation(conversationId);
      router.back();
    };

    if (Platform.OS === 'web') {
      if (confirm('Supprimer cette conversation ?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Supprimer la conversation',
        'Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: doDelete },
        ]
      );
    }
    setShowMenu(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: branding.backgroundColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={[styles.backArrow, { color: branding.primaryColor }]}>
          {'<'}
        </Text>
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        {isEditing ? (
          <TextInput
            style={[styles.titleInput, { color: branding.textColor, borderColor: branding.primaryColor }]}
            value={editTitle}
            onChangeText={setEditTitle}
            onBlur={handleSaveTitle}
            onSubmitEditing={handleSaveTitle}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onPress={() => { setEditTitle(title); setIsEditing(true); }}>
            <Text style={[styles.title, { color: branding.textColor }]} numberOfLines={1}>
              {title || 'Nouvelle conversation'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.menuWrapper}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Text style={[styles.menuDots, { color: branding.textSecondary }]}>
            {'\u2022\u2022\u2022'}
          </Text>
        </TouchableOpacity>

        {showMenu && (
          <View style={[styles.dropdown, { backgroundColor: branding.surfaceColor }]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleDelete}
            >
              <Text style={[styles.dropdownText, { color: '#EF4444' }]}>
                Supprimer
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  backArrow: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    borderBottomWidth: 2,
    paddingVertical: 2,
  },
  menuWrapper: {
    position: 'relative',
  },
  menuButton: {
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  menuDots: {
    fontSize: fontSize.lg,
    letterSpacing: 2,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 36,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownText: {
    fontSize: fontSize.md,
  },
});
