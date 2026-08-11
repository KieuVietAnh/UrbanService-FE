import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import useConversations from '../hooks/useConversations';
import ConversationList from '../components/ConversationList';

const InboxScreen: React.FC = () => {
  const router = useRouter();
  const { data, isLoading } = useConversations();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Inbox</Text></View>
      <ConversationList conversations={(data ?? []) as any[]} loading={isLoading} onOpen={(id) => router.push(`/(resident)/inbox/${id}` as any)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 20, fontWeight: '700' },
});

export default InboxScreen;
