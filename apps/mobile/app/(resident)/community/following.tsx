import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';

import { AppCard, AppHeader, Text, TicketStatusBadge } from '@/components/ui';
import { AppEmptyState, AppErrorState, SkeletonCard } from '@/components/shared';
import { communityApi, communityKeys } from '@/features/community/api';
import type { PublicIncidentItem } from '@/features/community/types';
import { getResidentStage, getResidentStatusLabel } from '@/features/resident-status';
import { colors } from '@/constants/theme';
import { fonts } from '@/theme/typography';

type ViewFilter = 'all' | 'active' | 'completed';

const FILTERS: Array<{ key: ViewFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang theo dõi' },
  { key: 'completed', label: 'Hoàn thành' },
];

function MyIncidentCard({ item, onPress }: { item: PublicIncidentItem; onPress: () => void }) {
  const updatedAt = item.updatedAt ?? item.createdAt;

  return (
    <AppCard pressable shadow="sm" onPress={onPress} style={styles.card}>
      {item.coverImageUrl ? (
        <Image source={{ uri: item.coverImageUrl }} style={styles.cover} resizeMode="cover" />
      ) : null}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={styles.categoryPill}>
            <Icon name="layers" size={12} color={colors.primary} />
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.categoryName || 'Sự vụ đô thị'}
            </Text>
          </View>
          <TicketStatusBadge
            status={item.status ?? 'New'}
            label={getResidentStatusLabel(item.status)}
            size="sm"
          />
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title || 'Sự vụ chưa có tiêu đề'}
        </Text>

        <View style={styles.metaRow}>
          <Icon name="map-pin" size={14} color={colors.muted} />
          <Text style={styles.metaText} numberOfLines={2}>
            {item.locationText || item.areaName || 'Chưa cập nhật địa điểm'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metric}>
            <Icon name="file-text" size={13} color={colors.muted} />
            <Text style={styles.metricText}>{Number(item.reportCount ?? 0)} phản ánh</Text>
          </View>
          <Text style={styles.updatedText}>
            {updatedAt ? new Date(updatedAt).toLocaleDateString('vi-VN') : '—'}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}

export default function MyIncidentsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<ViewFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
  }), [debouncedSearch]);

  const query = useInfiniteQuery({
    queryKey: communityKeys.myIncidents(params),
    queryFn: ({ pageParam = 1 }) => communityApi.getMyIncidents({
      ...params,
      pageNumber: pageParam,
      pageSize: 20,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (
      lastPage.hasNextPage || lastPage.pageNumber < lastPage.totalPages
        ? lastPage.pageNumber + 1
        : undefined
    ),
  });

  const incidents = useMemo(() => {
    const byId = new Map<string, PublicIncidentItem>();
    (query.data?.pages ?? []).forEach((page) => {
      page.items.forEach((item) => byId.set(item.incidentId, item));
    });
    const items = [...byId.values()];
    if (filter === 'all') return items;
    return items.filter((item) => {
      const completed = getResidentStage(item.status) === 'completed';
      return filter === 'completed' ? completed : !completed;
    });
  }, [filter, query.data?.pages]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader showBack title="Sự vụ của tôi" />

      <FlatList
        data={query.isLoading ? Array.from({ length: 3 }, (_, index) => ({ __skeleton: index })) : incidents}
        keyExtractor={(item: any, index) => String(item.incidentId ?? item.__skeleton ?? index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={query.refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <Icon name="bookmark" size={21} color={colors.primary} />
              </View>
              <View style={styles.introCopy}>
                <Text style={styles.introTitle}>Theo dõi tập trung</Text>
                <Text style={styles.introText}>
                  Gồm các sự vụ bạn đang theo dõi hoặc có phản ánh liên quan.
                </Text>
              </View>
            </View>

            <View style={styles.searchBar}>
              <Icon name="search" size={17} color={colors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                placeholder="Tìm theo tên hoặc địa điểm..."
                placeholderTextColor={colors.lightMuted}
                returnKeyType="search"
              />
              {search ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => setSearch('')} hitSlop={8}>
                  <Icon name="x" size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => {
                const active = filter === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {query.data ? (
              <Text style={styles.resultCount}>{incidents.length} sự vụ</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isError ? (
            <AppErrorState onRetry={query.refetch}>Không thể tải danh sách sự vụ của bạn.</AppErrorState>
          ) : !query.isLoading ? (
            <AppEmptyState icon={<Icon name="bookmark" size={40} color={colors.lightMuted} />}>
              {debouncedSearch
                ? 'Không tìm thấy sự vụ phù hợp.'
                : 'Bạn chưa theo dõi hoặc chưa có phản ánh liên quan đến sự vụ nào.'}
            </AppEmptyState>
          ) : null
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingMoreText}>Đang tải thêm sự vụ...</Text>
            </View>
          ) : null
        }
        renderItem={({ item }: { item: any }) => (
          item.__skeleton !== undefined ? (
            <View style={styles.skeleton}><SkeletonCard /></View>
          ) : (
            <MyIncidentCard
              item={item}
              onPress={() => router.push(`/(resident)/community/${item.incidentId}` as any)}
            />
          )
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  intro: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  introIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  introCopy: { flex: 1 },
  introTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  introText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  filterTextActive: { fontFamily: fonts.semibold, color: colors.primary },
  resultCount: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginBottom: 10 },
  card: { marginBottom: 12, overflow: 'hidden' },
  cover: { width: '100%', height: 150, backgroundColor: '#E2E8F0' },
  cardBody: { padding: 15 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  categoryPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.text, marginTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 9 },
  metaText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  updatedText: { fontFamily: fonts.regular, fontSize: 12, color: colors.lightMuted },
  skeleton: { marginBottom: 12 },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  loadingMoreText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
