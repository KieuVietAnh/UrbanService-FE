import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui';
import { AppHeader } from '@/components/ui';
import { AppEmptyState } from '@/components/shared';
import { AppErrorState } from '@/components/shared';
import { AppButton } from '@/components/ui';
import { semantics } from '@/theme/semantics';
import type { ConversationMessage } from '../types/messaging.types';
import { messagingApi, messagingKeys } from '../api';

const STATIC_THREAD_META: Record<string, { title: string; subtitle: string; description: string }> = {
  'ai-assistant': {
    title: 'Trợ lý AI',
    subtitle: 'Trợ lý đô thị thông minh',
    description: 'Đặt câu hỏi về quy trình phản ánh, trạng thái xử lý hoặc hướng dẫn nhanh.',
  },
  'staff-support': {
    title: 'Nhân viên hỗ trợ',
    subtitle: 'Liên hệ trực tiếp với cán bộ xử lý',
    description: 'Nhận thông tin hỗ trợ theo phản ánh và yêu cầu trợ giúp cụ thể.',
  },
};

const formatTime = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function InboxConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();

  const isPlaceholder = conversationId === 'ai-assistant' || conversationId === 'staff-support';
  const threadMeta = STATIC_THREAD_META[conversationId ?? ''] ?? {
    title: 'Hội thoại',
    subtitle: 'Thông tin hỗ trợ',
    description: 'Xem nội dung trao đổi gần nhất.',
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<ConversationMessage[]>({
    queryKey: messagingKeys.inboxConversation(conversationId ?? ''),
    queryFn: async () => {
      if (!conversationId || isPlaceholder) return [];
      const raw = await messagingApi.getAiConversationMessages(conversationId);
      if (!Array.isArray(raw)) return [];
      return raw.map((item: any) => ({
        id: String(item.messageId ?? item.id ?? item.uuid ?? Math.random()),
        senderName: item.senderName ?? item.authorName ?? (item.role === 'assistant' ? 'Trợ lý AI' : 'Bạn'),
        content: item.content ?? item.message ?? item.text ?? '',
        createdAt: item.createdAt ?? item.createdAtUtc ?? new Date().toISOString(),
        role: item.role ?? item.senderRole ?? 'assistant',
      }));
    },
    enabled: Boolean(conversationId) && !isPlaceholder,
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const messages = Array.isArray(data) ? data : [];
  const isInitialLoading = isLoading && messages.length === 0;

  const renderMessage = (message: ConversationMessage) => {
    const isOwn = message.role === 'user';
    return (
      <View key={message.id} style={[styles.messageBubble, isOwn ? styles.messageOwn : styles.messageOther]}>
        <Text style={[styles.messageSender, isOwn && styles.messageSenderOwn]}>{message.senderName}</Text>
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{message.content}</Text>
        <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>{formatTime(message.createdAt)}</Text>
      </View>
    );
  };

  // AI Assistant local chat (UI-only, delegates the existing AI endpoint through messagingApi)
  const isAiAssistant = conversationId === 'ai-assistant';
  const [aiMessages, setAiMessages] = React.useState<ConversationMessage[]>([]);
  const [aiLoading, setAiLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isAiAssistant) return;
    // initialize with welcome message
    setAiMessages([
      {
        id: 'welcome',
        senderName: 'Trợ lý AI',
        content: 'Xin chào! Mình có thể giúp gì cho bạn hôm nay? Bạn có thể chọn một hành động nhanh bên dưới.',
        createdAt: new Date().toISOString(),
        role: 'assistant',
      },
    ]);
  }, [isAiAssistant]);

  const sendAiMessage = async (text: string) => {
    if (!text || aiLoading) return;
    const userMsg: ConversationMessage = {
      id: `u-${Date.now()}`,
      senderName: 'Bạn',
      content: text,
      createdAt: new Date().toISOString(),
      role: 'user',
    };
    setAiMessages((s) => [...s, userMsg]);
    setAiLoading(true);
    try {
      const reply = await messagingApi.sendAiMessage({ message: text });
      const aiMsg: ConversationMessage = {
        id: `ai-${Date.now()}`,
        senderName: 'Trợ lý AI',
        content: reply?.message ?? String(reply),
        createdAt: reply?.createdAt ?? new Date().toISOString(),
        role: 'assistant',
      };
      setAiMessages((s) => [...s, aiMsg]);
      // If user asked for a ticket (#123), navigate to ticket
      const ticketMatch = /ticket\s*#?(\d+)/i.exec(text);
      if (ticketMatch) {
        const id = ticketMatch[1];
        router.push(`/(resident)/tickets/${id}` as any);
      }
    } catch (err) {
      setAiMessages((s) => [...s, { id: `ai-err-${Date.now()}`, senderName: 'Trợ lý AI', content: 'Không thể kết nối AI. Vui lòng thử lại sau.', createdAt: new Date().toISOString(), role: 'assistant' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleQuickAction = (action: 'create' | 'check' | 'faq') => {
    if (action === 'create') {
      router.push('/(resident)/create' as any);
      return;
    }
    if (action === 'check') {
      // open search/ask user for ticket id — simple UX: navigate to Tickets
      router.push('/(resident)/tickets' as any);
      return;
    }
    if (action === 'faq') {
      // show a small FAQ screen — reuse community or docs; navigate to community for now
      router.push('/(resident)/community' as any);
      return;
    }
  };

  const handleEscalateToStaff = (ticketId?: string) => {
    if (ticketId) {
      router.push(`/(resident)/tickets/${ticketId}` as any);
    } else {
      // if no ticket, open inbox so user can contact staff
      router.push('/(resident)/inbox' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader showBack title={threadMeta.title} />

      {isError && messages.length === 0 ? (
        <AppErrorState onRetry={refetch}>
          {(error as any)?.message || 'Không thể tải nội dung hội thoại.'}
        </AppErrorState>
      ) : isInitialLoading ? (
        <View style={styles.initialLoading}>
          <ActivityIndicator size="large" color={semantics.text.brand} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={semantics.text.brand}
            />
          }
        >
          <View style={styles.threadHeader}>
            <View style={styles.threadBadge}>
              <Icon name={conversationId === 'ai-assistant' ? 'cpu' : 'message-square'} size={18} color={semantics.text.brand} />
            </View>
            <View style={styles.threadHeadline}>
              <Text style={styles.threadTitle}>{threadMeta.title}</Text>
              <Text style={styles.threadSubtitle}>{threadMeta.subtitle}</Text>
            </View>
          </View>
          <Text style={styles.threadDescription}>{threadMeta.description}</Text>

          {isPlaceholder ? (
            isAiAssistant ? (
              // AI Assistant chat UI
              <View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, marginBottom: 8 }}>Trợ lý AI — Hành động nhanh</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => handleQuickAction('create')} style={{ padding: 8, backgroundColor: '#F3F0FF', borderRadius: 8 }}>
                      <Text>Tạo phản ánh</Text>
                    </Pressable>
                    <Pressable onPress={() => handleQuickAction('check')} style={{ padding: 8, backgroundColor: '#F3F0FF', borderRadius: 8 }}>
                      <Text>Kiểm tra ticket</Text>
                    </Pressable>
                    <Pressable onPress={() => handleQuickAction('faq')} style={{ padding: 8, backgroundColor: '#F3F0FF', borderRadius: 8 }}>
                      <Text>FAQ</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.messageList}>
                  {aiMessages.map((m) => (
                    <View key={m.id} style={[styles.messageBubble, m.role === 'assistant' ? { backgroundColor: '#7C3AED', borderRadius: 12 } : {}]}>
                      <Text style={[styles.messageSender, m.role === 'assistant' ? { color: '#FFFFFF' } : {}]}>{m.senderName}</Text>
                      <Text style={[styles.messageText, m.role === 'assistant' ? { color: '#FFFFFF' } : {}]}>{m.content}</Text>
                      <Text style={[styles.messageTime, m.role === 'assistant' ? { color: '#EDE9FE' } : {}]}>{formatTime(m.createdAt)}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, color: semantics.text.muted, marginBottom: 6 }}>Gợi ý nhanh</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => sendAiMessage('Tôi muốn báo ngập nước')} style={{ padding: 8, backgroundColor: '#EEF2FF', borderRadius: 8 }}>
                      <Text>Tôi muốn báo ngập nước</Text>
                    </Pressable>
                    <Pressable onPress={() => sendAiMessage('Làm sao để gửi phản ánh?')} style={{ padding: 8, backgroundColor: '#EEF2FF', borderRadius: 8 }}>
                      <Text>FAQ</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ marginTop: 14 }}>
                  <Pressable onPress={() => handleEscalateToStaff(undefined)} style={{ padding: 12, backgroundColor: '#2563EB', borderRadius: 8 }}>
                    <Text style={{ color: '#fff', textAlign: 'center' }}>Liên hệ nhân viên</Text>
                  </Pressable>
                </View>
              </View>
            ) : messages.length === 0 ? (
              <AppEmptyState icon={<Icon name="message-square" size={40} color={semantics.text.lightMuted} />}>
                Chưa có tin nhắn nào trong hội thoại này.
              </AppEmptyState>
            ) : (
              <View style={styles.messageList}>{messages.map(renderMessage)}</View>
            )
          ) : (
            <View style={styles.messageList}>{messages.map(renderMessage)}</View>
          )}

          <View style={styles.actionsRow}>
            {conversationId === 'staff-support' ? (
              <AppButton
                variant="primary"
                onPress={() => router.push('/(resident)/notifications' as any)}
              >
                Mở Thông báo
              </AppButton>
            ) : (
              <AppButton
                variant="primary"
                onPress={() => {
                  router.push('/(resident)' as any);
                }}
              >
                Quay về Home
              </AppButton>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantics.bg.app,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  initialLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  threadBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: semantics.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadHeadline: {
    flex: 1,
  },
  threadTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 20,
    color: semantics.text.primary,
  },
  threadSubtitle: {
    fontFamily: 'Geist-Regular',
    fontSize: 13,
    color: semantics.text.muted,
    marginTop: 4,
  },
  threadDescription: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.primary,
    lineHeight: 22,
    marginBottom: 24,
  },
  messageList: {
    gap: 12,
  },
  messageBubble: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: semantics.bg.surface,
    marginBottom: 12,
  },
  messageOwn: {
    backgroundColor: semantics.bg.primarySoft,
  },
  messageOther: {
    backgroundColor: semantics.bg.surface,
  },
  messageSender: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: semantics.text.primary,
    marginBottom: 6,
  },
  messageSenderOwn: {
    color: semantics.text.brand,
  },
  messageText: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  messageTextOwn: {
    color: semantics.text.primary,
  },
  messageTime: {
    fontFamily: 'Geist-Medium',
    fontSize: 12,
    color: semantics.text.lightMuted,
    textAlign: 'right',
  },
  messageTimeOwn: {
    color: semantics.text.muted,
  },
  actionsRow: {
    marginTop: 20,
  },
});
