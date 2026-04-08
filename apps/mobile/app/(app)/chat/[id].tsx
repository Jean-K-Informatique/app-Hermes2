import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const branding = useAuthStore((s) => s.branding);
  const messages = useChatStore((s) => s.messages[id] ?? []);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const conversations = useChatStore((s) => s.conversations);
  const [page, setPage] = useState(1);

  const conversation = conversations.find((c) => c.id === id);
  const title = conversation?.title ?? 'Nouvelle conversation';

  const {
    isRecording,
    duration: recordingDuration,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  useEffect(() => {
    if (id) {
      setCurrentConversation(id);
      fetchMessages(id);
    }
    return () => setCurrentConversation(null);
  }, [id, setCurrentConversation, fetchMessages]);

  const handleSend = useCallback(
    (content: string) => {
      if (!id) return;
      sendMessage(id, content);
    },
    [id, sendMessage]
  );

  const handleLoadMore = useCallback(() => {
    if (!id) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(id, nextPage);
  }, [id, page, fetchMessages]);

  const handleStartRecording = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    const text = await stopRecording();
    if (text && id) {
      sendMessage(id, text);
    }
  }, [stopRecording, id, sendMessage]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: branding.backgroundColor }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ChatHeader conversationId={id} title={title} />

        <View style={styles.flex}>
          <MessageList
            conversationId={id}
            onLoadMore={handleLoadMore}
          />
        </View>

        <MessageInput
          onSend={handleSend}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecording={isRecording}
          isDisabled={isStreaming}
          recordingDuration={recordingDuration}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
});
