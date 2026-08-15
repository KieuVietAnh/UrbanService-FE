import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/ui';
import { Text } from '@/components/ui';
import FeedbackChatSection from './feedback-chat-section';
import { feedbackApi, reportingKeys } from '@/features/reporting/api';
import { semantics } from '@/theme/semantics';

export default function FeedbackChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const feedbackId = id || '';

  const { data: ticket } = useQuery({
    queryKey: reportingKeys.detail(feedbackId),
    queryFn: () => feedbackApi.getById(feedbackId),
    enabled: Boolean(feedbackId),
    staleTime: 1000 * 30,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantics.bg.app }} edges={["top", "bottom"]}>
      <AppHeader showBack title="Trao đổi phản ánh" onBack={() => router.back()} />

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={{ fontSize: 13, color: semantics.text.muted }} numberOfLines={1} ellipsizeMode="tail">
          {ticket?.title ?? ticket?.code ?? `#${feedbackId}`}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <FeedbackChatSection feedbackId={feedbackId} />
      </View>
    </SafeAreaView>
  );
}
