import React from 'react';
import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui';
import { AppCard } from '@/components/ui';
import { TicketStatusBadge } from '@/components/ui';
import { SkeletonCard } from '@/components/shared';
import { feedbackApi } from '@/features/reporting/api';
import { communityKeys } from '@/features/community/api';
import { colors } from '@/constants/theme';

const COMMUNITY_STATS = [
  { icon: 'check-circle', value: '5.2K', label: 'Phản ánh tháng này', color: '#10B981' },
  { icon: 'clock', value: '48h', label: 'Thời gian xử lý TB', color: colors.primary },
  { icon: 'users', value: '12K', label: 'Cư dân tham gia', color: '#7C3AED' },
];

export default function CommunityScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: communityKeys.legacyFeed(),
    queryFn: () =>
      feedbackApi.list({
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const tickets = data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-surface border-b border-border-light">
        <Text className="text-xl font-sans-bold text-text">Gần đây</Text>
        <View className="flex-row items-center gap-1 bg-emerald-light px-2.5 py-1 rounded-full">
          <View style={styles.liveDot} />
          <Text className="text-xs font-sans-semibold text-emerald-dark">Trực tiếp</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Community stats */}
        <View className="px-5 pt-4 mb-5">
          <View style={styles.statsRow}>
            {COMMUNITY_STATS.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDiv} />}
                <View className="flex-1 items-center px-2">
                  <Icon name={s.icon as any} size={20} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text className="text-2xs text-text-muted text-center font-sans-medium mt-0.5">
                    {s.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Impact banner */}
        <View className="mx-5 mb-5">
          <View style={styles.impactBanner}>
            <Text className="text-xs font-sans-semibold text-primary mb-1">TÁC ĐỘNG CỘNG ĐỒNG</Text>
            <Text className="text-base font-sans-bold text-text">
              Góp ý của bạn giúp thành phố tốt hơn
            </Text>
            <Text className="text-sm text-text-muted mt-1 leading-relaxed">
              Hơn 5.000 phản ánh đã được xử lý trong tháng này nhờ sự đóng góp của cư dân như bạn.
            </Text>
          </View>
        </View>

        {/* Recent feed */}
        <View className="px-5">
          <Text className="text-base font-sans-bold text-text mb-3">
            Phản ánh gần đây trong khu vực
          </Text>

          {isLoading
            ? Array(4).fill(null).map((_, i) => <SkeletonCard key={i} />)
            : tickets.map((ticket: any) => (
                <Pressable
                  key={ticket.feedbackId ?? ticket.id}
                  onPress={() =>
                    router.push(
                      `/(resident)/tickets/${ticket.feedbackId ?? ticket.id}` as any
                    )
                  }
                  className="mb-3"
                >
                  <AppCard shadow="sm" pressable>
                    <View className="p-4">
                      <View className="flex-row items-start justify-between gap-2 mb-2">
                        <Text className="text-xs text-text-muted font-sans-medium">
                          #{ticket.code ?? '—'}
                        </Text>
                        <TicketStatusBadge status={ticket.status ?? 'PENDING'} size="sm" />
                      </View>
                      <Text className="text-sm font-sans-semibold text-text mb-1.5" numberOfLines={2}>
                        {ticket.title ?? '—'}
                      </Text>
                      <View className="flex-row items-center gap-1.5 mb-1.5">
                        <Icon name="map-pin" size={12} color={colors.muted} />
                        <Text className="text-xs text-text-muted flex-1" numberOfLines={1}>
                          {ticket.locationText ?? '—'}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <Icon name="calendar" size={12} color={colors.lightMuted} />
                        <Text className="text-2xs text-text-light">
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleDateString('vi-VN')
                            : ''}
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                </Pressable>
              ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  statDiv: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  statValue: {
    fontFamily: 'Geist-Bold',
    fontSize: 18,
    marginTop: 6,
  },
  impactBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
  },
});
