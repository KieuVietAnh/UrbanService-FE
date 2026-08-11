import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { toolsApi } from '@urbanmind/shared-api';
import { Text } from '@/components/ui/Text';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import MessageComposer from '@/features/feedback/components/MessageComposer';
import { semantics } from '@/theme/semantics';
import { useToast } from '@/components/ui/Toast';

interface AiMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | string;
  createdAt: string;
}

const formatTime = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeMessage = (raw: any): AiMessage | null => {
  if (!raw) return null;
  const id = String(raw.messageId ?? raw.id ?? raw.uuid ?? `${raw.createdAt ?? Date.now()}`);
  const content =
    raw.messageText ??
    raw.message ??
    raw.reply ??
    raw.content ??
    raw.data?.message ??
    raw.data?.reply ??
    raw.data?.messageText ??
    '';
  const senderRaw = String(raw.senderType ?? raw.sender ?? raw.role ?? '').toLowerCase();
  const sender = senderRaw.includes('user') ? 'user' : senderRaw.includes('assistant') || senderRaw.includes('ai') ? 'assistant' : 'assistant';

  return {
    id,
    content: String(content),
    sender,
    createdAt: String(raw.createdAt ?? raw.createdAtUtc ?? new Date().toISOString()),
  };
};

const normalizeChatReply = (payload: any) => {
  const data = payload?.data ?? payload ?? {};
  const message =
    data.message ??
    data.messageText ??
    data.reply ??
    data.content ??
    data.data?.message ??
    data.data?.reply ??
    data.data?.messageText ??
    '';
  const conversationId = String(
    data.conversationId ??
    data.conversationID ??
    data.id ??
    data?.conversation?.id ??
    data?.result?.conversationId ??
    ''
  );
  const createdAt = data.createdAt ?? data.createdAtUtc ?? new Date().toISOString();
  return { message: String(message), conversationId, createdAt: String(createdAt) };
};

export default function AiConversationDetailScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<any> | null>(null);
  const queryClient = useQueryClient();
  const [composerHeight, setComposerHeight] = useState(72);
  const keyboardOffset = Platform.OS === 'ios' ? (insets.top || 0) - 120 : 0;
  const isPlaceholderConversation = conversationId === 'ai-assistant';

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AiMessage[]>({
    queryKey: ['ai-conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      if (isPlaceholderConversation) {
        return [
          {
            id: 'welcome',
            content: 'Xin chào! Mình là trợ lý AI. Hãy hỏi về phản ánh, trạng thái xử lý hoặc hướng dẫn nhanh.',
            sender: 'assistant',
            createdAt: new Date().toISOString(),
          },
        ];
      }
      const raw = await toolsApi.getAiConversationMessages(conversationId);
      if (!Array.isArray(raw)) return [];
      return raw
        .map(normalizeMessage)
        .filter((message): message is AiMessage => Boolean(message?.content));
    },
    enabled: Boolean(conversationId),
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const messages = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (isPlaceholderConversation) {
        return toolsApi.getAiChatReply({ message: messageText });
      }
      return toolsApi.getAiChatReply({ conversationId, message: messageText });
    },
    onMutate: async (messageText: string) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: AiMessage = {
        id: tempId,
        content: messageText,
        sender: 'user',
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['ai-conversation-messages', conversationId], (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        return [...arr, optimistic];
      });
      scrollToBottom(true);
      return { tempId };
    },
    onSuccess: (response) => {
      const reply = normalizeChatReply(response);
      queryClient.setQueryData(['ai-conversation-messages', conversationId], (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        if (reply.message) {
          return [...arr, { id: `ai-${Date.now()}`, content: reply.message, sender: 'assistant', createdAt: reply.createdAt }];
        }
        return arr;
      });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (reply.conversationId && reply.conversationId !== conversationId) {
        router.replace(`/(resident)/ai/${reply.conversationId}`);
      }
      scrollToBottom(true);
    },
    onError: (err: any) => {
      console.warn('AI send failed', err);
      toast.error('Gửi tin nhắn AI thất bại. Vui lòng thử lại.');
    },
  });

  const handleSend = async (text: string) => {
    if (!text.trim() || !conversationId) return;
    await sendMutation.mutateAsync(text);
  };

  const renderMessage = ({ item }: { item: AiMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageWrap, isUser ? styles.messageOwnWrap : styles.messageOtherWrap]}>
        <View style={[styles.messageBubble, isUser ? styles.messageOwn : styles.messageOther]}>
          <Text style={[styles.messageSender, isUser ? styles.messageSenderOwn : styles.messageSenderOther]}>
            {isUser ? 'Bạn' : 'AI Assistant'}
          </Text>
          <Text style={[styles.messageText, isUser ? styles.messageTextOwn : styles.messageTextOther]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isUser ? styles.messageTimeOwn : styles.messageTimeOther]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader showBack title="AI Assistant" subtitle="Câu chuyện của bạn" />

      {isError ? (
        <AppErrorState onRetry={refetch}>
          {(error as any)?.message || 'Không thể tải hội thoại AI.'}
        </AppErrorState>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
        >
          <View style={[styles.container, { paddingBottom: insets.bottom || 0 }]}> 
            <View style={styles.chatBody}>
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={{
                  paddingVertical: 10,
                  paddingHorizontal: 0,
                  paddingBottom: (composerHeight || 72) + 24 + (insets.bottom || 0),
                  flexGrow: 1,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={semantics.text.brand}
                />
              }
              ListEmptyComponent={() => (
                <AppEmptyState
                  icon={<Icon name="cpu" size={40} color={semantics.text.lightMuted} />}
                >
                  Chưa có tin nhắn nào trong hội thoại này. Gửi tin nhắn để bắt đầu.
                </AppEmptyState>
              )}
            />
            </View>

            <View style={[styles.composerWrap, { paddingBottom: insets.bottom || 0, position: 'absolute', left: 0, right: 0, bottom: 40 }]}> 
              <Text style={styles.composerLabel}>Gửi câu hỏi đến AI</Text>
              <MessageComposer
                onSend={handleSend}
                sending={(sendMutation as any).isLoading}
                onFocus={() => scrollToBottom(true)}
                onHeightChange={(height) => setComposerHeight(height)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantics.bg.app,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  chatBody: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  list: {
    flex: 1,
  },
  messageList: {
    paddingTop: 16,
    gap: 12,
  },
  composerWrap: {
    width: '100%',
    marginTop: 0,
    backgroundColor: semantics.bg.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'stretch',
  },
  composerLabel: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: semantics.text.muted,
    marginBottom: 8,
  },
  messageWrap: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  messageOwnWrap: {
    justifyContent: 'flex-end',
  },
  messageOtherWrap: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    padding: 14,
  },
  messageOwn: {
    backgroundColor: semantics.bg.primarySoft,
  },
  messageOther: {
    backgroundColor: semantics.bg.surface,
    borderWidth: 1,
    borderColor: semantics.border.default,
  },
  messageSender: {
    fontSize: 12,
    fontFamily: 'Geist-SemiBold',
    marginBottom: 6,
  },
  messageSenderOwn: {
    color: semantics.text.brand,
  },
  messageSenderOther: {
    color: semantics.text.muted,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Geist-Regular',
    lineHeight: 22,
  },
  messageTextOwn: {
    color: semantics.text.primary,
  },
  messageTextOther: {
    color: semantics.text.primary,
  },
  messageTime: {
    marginTop: 8,
    fontSize: 11,
    color: semantics.text.lightMuted,
    textAlign: 'right',
  },
  messageTimeOwn: {
    color: semantics.text.lightMuted,
  },
  messageTimeOther: {
    color: semantics.text.lightMuted,
  },
});
