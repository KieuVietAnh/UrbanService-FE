import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MessageBubble, { ChatMessage } from './feedback-message-bubble';
import MessageComposer from './message-composer';
import { AppErrorState, useToast } from '@/components/shared';
import { semantics } from '@/theme/semantics';
import { messagingApi, messagingKeys } from '../api';

export default function FeedbackChatSection({ feedbackId }: { feedbackId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const insets = useSafeAreaInsets();
  const [composerHeight, setComposerHeight] = useState<number>(72);

  const {
    data: messages = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ChatMessage[]>({
    queryKey: messagingKeys.feedbackMessages(feedbackId),
    queryFn: () => messagingApi.getFeedbackMessages(feedbackId),
    enabled: Boolean(feedbackId),
    staleTime: 1000 * 10,
  });

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  };

  useEffect(() => {
    if (!messages.length) return undefined;
    const timer = setTimeout(() => scrollToBottom(true), 150);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      return messagingApi.sendFeedbackMessage(feedbackId, messageText);
    },
    onMutate: async (text: string) => {
      await qc.cancelQueries({ queryKey: messagingKeys.feedbackMessages(feedbackId) });
      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = { id: tempId, feedbackId, senderName: 'Bạn', senderType: 'ServiceUser', messageText: text, createdAt: new Date().toISOString() };
      qc.setQueryData<ChatMessage[]>(messagingKeys.feedbackMessages(feedbackId), (old) => {
        const arr = Array.isArray(old) ? old : [];
        return [...arr, optimistic];
      });
      setTimeout(() => scrollToBottom(true), 80);
      return { tempId };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messagingKeys.feedbackMessages(feedbackId) });
      void qc.invalidateQueries({
        queryKey: messagingKeys.supportThreads(),
        refetchType: 'none',
      });
      setTimeout(() => scrollToBottom(true), 200);
    },
    onError: () => {
      if (__DEV__) console.warn('Feedback message send failed');
      toast.error('Unable to send message');
    },
  });

  const handleSend = async (text: string) => {
    if (!text.trim() || !feedbackId) return;
    try {
      await sendMutation.mutateAsync(text);
    } catch {
      // keep composer text; error toast handled in onError
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: semantics.bg.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.wrap, { flex: 1 }]}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Discussion</Text>
          </View>

          <View style={styles.chatBody}>
            <View style={styles.listWrap}>
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m: ChatMessage, i: number) =>
                  String(m?.id ?? m?.messageId ?? m?.tempId ?? `${m?.createdAt ?? ''}-${i}`)
                }
                renderItem={({ item }) => <MessageBubble msg={item} />}
                ListEmptyComponent={isLoading ? (
                  <View style={styles.initialLoading}>
                    <ActivityIndicator size="large" color={semantics.text.brand} />
                  </View>
                ) : isError ? (
                  <AppErrorState onRetry={refetch}>Unable to load this conversation.</AppErrorState>
                ) : (
                  <View style={styles.empty}> 
                    <Text style={styles.emptyTitle}>No conversation yet</Text>
                    <Text style={styles.emptySub}>You can ask staff about this feedback.</Text>
                  </View>
                )}
                contentContainerStyle={{ paddingVertical: 10, paddingBottom: (composerHeight || 72) + 16 }}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => setTimeout(() => scrollToBottom(true), 50)}
                style={styles.list}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.composerContainer}>
        <View style={styles.composerWrap}>
          <MessageComposer
            onSend={handleSend}
            sending={!feedbackId || sendMutation.isPending || isLoading}
            onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)}
            onHeightChange={(h: number) => setComposerHeight(h)}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, backgroundColor: semantics.bg.surface, borderTopWidth: 1, borderTopColor: semantics.border.default, position: 'relative' },
  composerContainer: { borderTopWidth: 1, borderTopColor: semantics.border.default, backgroundColor: semantics.bg.surface },
  chatBody: { flex: 1, justifyContent: 'space-between' },
  listWrap: { flex: 1 },
  list: { flex: 1 },
  initialLoading: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  composerWrap: { width: '100%', zIndex: 20, backgroundColor: semantics.bg.surface, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'stretch' },
  headerRow: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: 'Geist-SemiBold', color: semantics.text.lightMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { padding: 20, alignItems: 'center' },
  emptyTitle: { fontFamily: 'Geist-SemiBold', fontSize: 14, color: semantics.text.primary, marginBottom: 6 },
  emptySub: { fontFamily: 'Geist-Regular', fontSize: 13, color: semantics.text.muted, textAlign: 'center' },
});
