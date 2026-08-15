import React, { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { toolsApi } from '@urbanmind/shared-api';
import { semantics } from '@/theme/semantics';
import type { AiConversationListItem } from '../types/messaging.types';

const normalizeConversation = (raw: any): AiConversationListItem | null => {
  if (!raw) return null;
  const id = String(raw.conversationId ?? raw.id ?? raw.uuid ?? raw.key ?? '');
  if (!id) return null;
  return { id };
};

export default function AiConversationRedirectScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
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

  useEffect(() => {
    if (isLoading) return;
    const target = isError || conversations.length === 0
      ? '/(resident)/ai/ai-assistant'
      : `/(resident)/ai/${conversations[0].id}`;
    router.replace(target as any);
  }, [isLoading, isError, conversations, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="large" color={semantics.text.brand} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantics.bg.app,
  },
  spinnerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
