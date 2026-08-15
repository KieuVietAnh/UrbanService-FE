import React, { useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '@urbanmind/shared-api';
import MessageBubble, { ChatMessage } from './feedback-message-bubble';
import MessageComposer from './message-composer';
import { useToast } from '@/components/shared';
import { semantics } from '@/theme/semantics';

export default function FeedbackChatSection({ feedbackId }: { feedbackId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const insets = useSafeAreaInsets();
  const [composerHeight, setComposerHeight] = useState<number>(72);
  const keyboardOffset = Platform.OS === 'ios'
    ? (insets.bottom || 0) + 24
    : 0;

  const { data: messages = [], isLoading, refetch } = useQuery<ChatMessage[]>({
    queryKey: ['feedback-messages', feedbackId],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/feedbacks/${feedbackId}/messages`, { params: { includeInternal: false } });
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : (data?.items ?? []);
    },
    staleTime: 1000 * 10,
  });

  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await axiosClient.post(`/api/feedbacks/${feedbackId}/messages`, { messageText, isInternal: false });
      return res?.data ?? res;
    },
    onMutate: async (text: string) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = { id: tempId, feedbackId, senderName: 'Bạn', senderType: 'ServiceUser', messageText: text, createdAt: new Date().toISOString() };
      qc.setQueryData<ChatMessage[]>(['feedback-messages', feedbackId], (old) => {
        const arr = Array.isArray(old) ? old : [];
        return [...arr, optimistic];
      });
      return { tempId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback-messages', feedbackId] });
      refetch();
      // scroll to bottom after small delay
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    },
    onError: (err: unknown) => {
      console.warn('send failed', err);
      toast.error('Unable to send message');
    },
  });

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    try {
      await sendMutation.mutateAsync(text);
    } catch (e) {
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
              ListEmptyComponent={() => (
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
              sending={(sendMutation as any).isLoading}
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
  composerWrap: { width: '100%', zIndex: 20, backgroundColor: semantics.bg.surface, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'stretch', marginBottom: 24 },
  headerRow: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: 'Geist-SemiBold', color: semantics.text.lightMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { padding: 20, alignItems: 'center' },
  emptyTitle: { fontFamily: 'Geist-SemiBold', fontSize: 14, color: semantics.text.primary, marginBottom: 6 },
  emptySub: { fontFamily: 'Geist-Regular', fontSize: 13, color: semantics.text.muted, textAlign: 'center' },
});
