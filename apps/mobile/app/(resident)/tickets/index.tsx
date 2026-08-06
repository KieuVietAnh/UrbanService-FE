import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppCard } from '@/components/ui/AppCard';
import { TicketStatusBadge } from '@/components/ui/TicketStatusBadge';
import { SkeletonCard } from '@/components/ui/AppSkeleton';
import { feedbackApi } from '@/services/api/feedbackApi';
import { colors } from '@/constants/theme';

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'PROCESSING', label: 'Đang xử lý' },
  { key: 'AWAITING_REVIEW', label: 'Đang xem xét' },
  { key: 'RESOLVED', label: 'Đã xử lý' },
  { key: 'CLOSED', label: 'Đã đóng' },
];

function TicketCard({ ticket, onPress }: { ticket: any; onPress: () => void }) {
  const createdAt = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleDateString('vi-VN')
    : '';

  return (
    <Pressable onPress={onPress} className="mb-3 mx-5">
      <AppCard shadow="sm" pressable>
        <View className="p-4">
          {/* Top row */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-sans-medium text-text-muted">
              #{ticket.code ?? ticket.feedbackCode ?? '—'}
            </Text>
            <TicketStatusBadge status={ticket.status ?? 'PENDING'} size="sm" />
          </View>

          {/* Title */}
          <Text className="text-sm font-sans-bold text-text mb-1.5" numberOfLines={2}>
            {ticket.title ?? 'Chưa có tiêu đề'}
          </Text>

          {/* Category */}
          {ticket.categoryName && (
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <Icon name="tag" size={12} color={colors.muted} />
              <Text className="text-xs text-text-muted">{ticket.categoryName}</Text>
            </View>
          )}

          {/* Location */}
          <View className="flex-row items-center gap-1.5 mb-3">
            <Icon name="map-pin" size={12} color={colors.muted} />
            <Text className="text-xs text-text-muted flex-1" numberOfLines={1}>
              {ticket.locationText ?? 'Không có địa chỉ'}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View className="flex-row items-center gap-1">
              <Icon name="calendar" size={11} color={colors.lightMuted} />
              <Text className="text-2xs text-text-light">{createdAt}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </View>
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
}

export default function TicketsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const searchTimer = React.useRef<any>(null);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 400);
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feedbacks', 'list', activeFilter, debouncedSearch],
    queryFn: () =>
      feedbackApi.list({
        pageSize: 20,
        status: activeFilter || undefined,
        search: debouncedSearch || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const tickets = data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-surface border-b border-border-light">
        <Text className="text-xl font-sans-bold text-text">Phản ánh của tôi</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-sans-semibold text-primary bg-primary-soft px-2.5 py-1 rounded-full">
            {data?.totalItems ?? 0}
          </Text>
        </View>
      </View>

      {/* Search bar */}
      <View className="px-5 pt-3 pb-2 bg-surface">
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm phản ánh..."
            placeholderTextColor={colors.lightMuted}
            value={search}
            onChangeText={handleSearchChange}
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(''); setDebouncedSearch(''); }} hitSlop={8}>
              <Icon name="x" size={14} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View className="bg-surface pb-3">
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={isLoading ? Array(4).fill(null) : tickets}
        keyExtractor={(item, i) =>
          item ? String(item.feedbackId ?? item.id ?? i) : String(i)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center px-10 pt-16">
              <Icon name="inbox" size={48} color="#CBD5E1" />
              <Text className="text-base font-sans-semibold text-text-muted mt-4 text-center">
                Không có phản ánh nào
              </Text>
              <Text className="text-sm text-text-light text-center mt-2">
                {debouncedSearch
                  ? `Không tìm thấy kết quả cho "${debouncedSearch}"`
                  : 'Hãy gửi phản ánh đầu tiên của bạn!'}
              </Text>
              <Pressable
                onPress={() => router.push('/(resident)/create-feedback' as any)}
                className="mt-5 bg-primary px-5 py-3 rounded-xl"
              >
                <Text className="text-sm font-sans-semibold text-white">
                  Gửi phản ánh ngay
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          !item ? (
            <View className="mx-5 mb-3">
              <SkeletonCard />
            </View>
          ) : (
            <TicketCard
              ticket={item}
              onPress={() =>
                router.push(
                  `/(resident)/tickets/${item.feedbackId ?? item.id}` as any
                )
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: 'Geist-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  filterChipTextActive: {
    color: colors.primary,
    fontFamily: 'Geist-SemiBold',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 120,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
});