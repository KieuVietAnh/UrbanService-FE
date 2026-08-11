import React, { useState, useCallback } from 'react';
import { View, SafeAreaView, FlatList, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMessages, useSendMessage } from '../hooks/useMessages';
import MessageBubble from '../components/MessageBubble';
import ChatComposer from '../components/ChatComposer';
import { axiosClient } from '@urbanmind/shared-api';
import { useQueryClient } from '@tanstack/react-query';

const ChatScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMutation = useSendMessage(conversationId as string);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await axiosClient.get(`/api/inbox/conversations/${conversationId}/messages`, { params: { pageNumber: page + 1, pageSize: 30 } });
      const items = res?.data?.items ?? res?.data ?? [];
      qc.setQueryData(['inbox', 'messages', conversationId], (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        return [...items, ...arr];
      });
      setPage((p) => p + 1);
    } catch (e) {
      // ignore
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, page, loadingOlder, qc]);

  const handleSend = (text: string) => {
    // mutate may be typed differently in this workspace; use any cast to keep UI-only flow
    (sendMutation as any).mutate({ content: text });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Chat</Text></View>
      {isLoading ? <Text style={{ padding: 12 }}>Loading...</Text> : (
        <FlatList
          data={(messages ?? []) as any[]}
          inverted
          keyExtractor={(m: any, i: number) => String(m?.id ?? m?.messageId ?? `${m?.createdAt ?? ''}-${i}`)}
          renderItem={({ item }) => <MessageBubble message={item} isMine={item.senderId == null} />}
          onEndReached={() => loadOlder()}
          onEndReachedThreshold={0.1}
          ListFooterComponent={loadingOlder ? <Text style={{ padding: 8 }}>Loading older messages...</Text> : null}
        />
      )}
      <ChatComposer onSend={handleSend} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700' },
});

export default ChatScreen;
