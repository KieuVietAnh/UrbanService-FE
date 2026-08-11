import React, { useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { toolsApi } from '@urbanmind/shared-api';
import { Text } from '@/components/ui/Text';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { semantics } from '@/theme/semantics';

interface AiConversationListItem {
  id: string;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
}

const formatTime = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeConversation = (raw: any): AiConversationListItem | null => {
  if (!raw) return null;
  const id = String(raw.conversationId ?? raw.id ?? raw.uuid ?? raw.key ?? '');
  if (!id) return null;

  const preview =
    raw.lastMessage ??
    raw.preview ??
    raw.snippet ??
    raw.summary ??
    raw.description ??
    'Bắt đầu hội thoại mới với trợ lý AI.';

  return {
    id,
    title: String(raw.title ?? raw.name ?? 'AI Assistant'),
    subtitle: String(raw.subtitle ?? raw.description ?? 'Trò chuyện với trợ lý AI'),
    preview: String(preview),
    updatedAt: String(raw.updatedAt ?? raw.lastUpdated ?? raw.createdAt ?? new Date().toISOString()),
    messageCount: Number(raw.messageCount ?? raw.count ?? raw.messagesCount ?? 0) || 0,
  };
};

export default function AiConversationListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<any> | null>(null);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AiConversationListItem[]>({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const raw = await toolsApi.getAiConversations();
      if (!Array.isArray(raw)) return [];
      return raw
        .map(normalizeConversation)
        .filter((conversation): conversation is AiConversationListItem => Boolean(conversation));
    },
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const conversations = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const renderConversation = ({ item }: { item: AiConversationListItem }) => (
    <Pressable
      onPress={() => router.push(`/(resident)/ai/${item.id}` as any)}
      style={({ pressed }) => [styles.threadPressable, pressed && styles.threadPressed]}
    >
      <AppCard shadow="sm" style={styles.threadCard}>
        <View style={styles.threadHeader}>
          <View style={styles.threadTitleWrap}>
            <Text style={styles.threadTitle}>{item.title}</Text>
            <Text style={styles.threadSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>
          <Text style={styles.threadTime}>{formatTime(item.updatedAt)}</Text>
        </View>
        <Text style={styles.threadPreview} numberOfLines={2}>
          {item.preview}
        </Text>
        {item.messageCount > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{item.messageCount} tin nhắn</Text>
          </View>
        ) : null}
      </AppCard>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader showBack title="AI Assistant" subtitle="Trợ lý đô thị thông minh" />

      {isError ? (
        <AppErrorState onRetry={refetch}>
          {(error as any)?.message || 'Không thể tải danh sách hội thoại AI.'}
        </AppErrorState>
      ) : (
          <View style={[styles.container, { paddingBottom: insets.bottom || 0 }]}> 
            <FlatList
              ref={listRef}
              data={conversations}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={semantics.text.brand}
                />
              }
              ListHeaderComponent={() => (
                <View style={styles.headerCopy}>
                  <Text style={styles.heading}>Các cuộc hội thoại AI của bạn</Text>
                  <Text style={styles.subheading}>
                    Hỏi trợ lý về phản ánh, quy trình xử lý, hoặc hướng dẫn đô thị nhanh.
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <AppEmptyState
                  icon={<Icon name="cpu" size={40} color={semantics.text.lightMuted} />}
                >
                  Bạn chưa có hội thoại AI nào. Bắt đầu bằng cách gửi câu hỏi bên dưới.
                </AppEmptyState>
              )}
              contentContainerStyle={{
                ...styles.listContent,
                paddingBottom: (insets.bottom || 0) + 24,
              }}
              renderItem={renderConversation}
            />

          </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantics.bg.app,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerCopy: {
    marginBottom: 16,
  },
  heading: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 24,
    color: semantics.text.primary,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.muted,
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
  },
  threadPressable: {
    marginBottom: 12,
  },
  threadPressed: {
    opacity: 0.9,
  },
  threadCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: semantics.bg.surface,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  threadTitleWrap: {
    flex: 1,
  },
  threadTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 16,
    color: semantics.text.primary,
  },
  threadSubtitle: {
    fontFamily: 'Geist-Regular',
    fontSize: 13,
    color: semantics.text.muted,
    marginTop: 2,
  },
  threadPreview: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  threadTime: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: semantics.text.lightMuted,
  },
  countPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: semantics.bg.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countPillText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: semantics.text.brand,
  },
});
