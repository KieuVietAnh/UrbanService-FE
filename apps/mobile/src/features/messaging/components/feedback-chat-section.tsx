import React, { useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const keyboardOffset = Platform.OS === 'ios'
    ? (insets.bottom || 0) + 24
    : 0;

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
      return { tempId };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messagingKeys.feedbackMessages(feedbackId) });
      void qc.invalidateQueries({
        queryKey: messagingKeys.supportThreads(),
        refetchType: 'none',
      });
      // scroll to bottom after small delay
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
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
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View style={[styles.wrap, { flex: 1, paddingBottom: insets.bottom || 0 }]}> 
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
              contentContainerStyle={{ paddingVertical: 10, paddingBottom: (composerHeight || 72) + 24 + (insets.bottom || 0) }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.list}
            />
          </View>

          <View style={styles.composerWrap}>
            <MessageComposer
              onSend={handleSend}
              sending={!feedbackId || sendMutation.isPending || isLoading}
              onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)}
              onHeightChange={(h: number) => setComposerHeight(h)}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18, backgroundColor: semantics.bg.surface, borderTopWidth: 1, borderTopColor: semantics.border.default, position: 'relative' },
  chatBody: { flex: 1, justifyContent: 'space-between' },
  listWrap: { flex: 1 },
  list: { flex: 1 },
  initialLoading: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  composerWrap: { width: '100%', zIndex: 20, backgroundColor: semantics.bg.surface, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'stretch', marginBottom: 24 },
  headerRow: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: 'Geist-SemiBold', color: semantics.text.lightMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { padding: 20, alignItems: 'center' },
  emptyTitle: { fontFamily: 'Geist-SemiBold', fontSize: 14, color: semantics.text.primary, marginBottom: 6 },
  emptySub: { fontFamily: 'Geist-Regular', fontSize: 13, color: semantics.text.muted, textAlign: 'center' },
});
