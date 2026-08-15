import React, { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { semantics } from '@/theme/semantics';
import { useAiConversationsQuery } from '../hooks';

export default function AiConversationRedirectScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
  } = useAiConversationsQuery();

  const conversations = useMemo(() => Array.isArray(data) ? data : [], [data]);

  useEffect(() => {
    if (isLoading) return;
    const target = isError || conversations.length === 0
      ? '/(resident)/ai/ai-assistant'
      : `/(resident)/ai/${conversations[0].id}`;
    router.replace(target as Href);
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
