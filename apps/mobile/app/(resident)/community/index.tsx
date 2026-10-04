import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui';
import { AppCard } from '@/components/ui';
import { SkeletonCard } from '@/components/shared';
import { AppEmptyState } from '@/components/shared';
import { CommunityFeedCard } from '@/features/community';
import { communityApi, communityKeys } from '@/features/community/api';
import type { PublicIncidentItem } from '@/features/community/types';
import { getResidentStage } from '@/features/resident-status';
import { colors } from '@/constants/theme';

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'InProgress', label: 'Đang xử lý' },
  { key: 'SubmittedForApproval', label: 'Đang kiểm tra' },
  { key: 'Approved', label: 'Hoàn thành' },
  { key: 'Closed', label: 'Đã đóng' },
];

const getId = (value: any, ...keys: string[]) => String(keys.map((key) => value?.[key]).find(Boolean) ?? '');
const getName = (value: any, ...keys: string[]) => String(keys.map((key) => value?.[key]).find(Boolean) ?? '');

export default function CommunityFeedScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: areas = [] } = useQuery({
    queryKey: communityKeys.areas(),
    queryFn: () => communityApi.getAreas(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: [...communityKeys.all, 'categories'],
    queryFn: () => communityApi.getCategories(),
  });

  const feedParams = {
    pageSize: 20,
    status: activeFilter || undefined,
    search: debouncedSearch || undefined,
    areaId: selectedAreaId || undefined,
    categoryId: selectedCategoryId || undefined,
  };

  const feedQuery = useInfiniteQuery({
    queryKey: communityKeys.feed(feedParams),
    queryFn: ({ pageParam = 1 }) => communityApi.getFeed({ ...feedParams, pageNumber: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (
      lastPage.hasNextPage || lastPage.pageNumber < lastPage.totalPages
        ? lastPage.pageNumber + 1
        : undefined
    ),
  });

  const items = useMemo(() => {
    const byId = new Map<string, PublicIncidentItem>();
    (feedQuery.data?.pages ?? []).forEach((page) => {
      page.items.forEach((item) => byId.set(item.incidentId, item));
    });
    return [...byId.values()];
  }, [feedQuery.data?.pages]);

  const summary = useMemo(() => ({
    total: feedQuery.data?.pages[0]?.totalItems ?? items.length,
    resolved: items.filter((item) => getResidentStage(item.status) === 'completed').length,
  }), [feedQuery.data?.pages, items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text className="text-xl font-sans-bold text-text">Cộng đồng</Text>
          <Text className="text-sm text-text-muted mt-1">Theo dõi sự vụ công khai quanh khu vực của bạn</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở danh sách sự vụ của tôi"
            onPress={() => router.push('/(resident)/community/following')}
            style={styles.mapButton}
          >
            <Icon name="bookmark" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở bản đồ sự vụ cộng đồng"
            onPress={() => router.push('/(resident)/community/map')}
            style={styles.mapButton}
          >
            <Icon name="map" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage} onRefresh={feedQuery.refetch} tintColor={colors.primary} />}
      >
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm sự vụ, khu vực hoặc vấn đề..."
            placeholderTextColor={colors.lightMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Icon name="x" size={14} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <AppCard shadow="sm" className="mt-4 mb-3">
          <View style={styles.heroPanel}>
            <View style={styles.heroTextWrap}>
              <Text className="text-xs font-sans-semibold text-text-muted">Mạng lưới cộng đồng</Text>
              <Text className="text-lg font-sans-bold text-text mt-1">Theo dõi sự vụ đang được quan tâm</Text>
              <Text className="text-sm text-text-muted mt-2">Cập nhật tiến độ công khai, kết quả đã duyệt và đóng góp ý kiến.</Text>
            </View>
            <View style={styles.heroStatsWrap}>
              <View style={styles.heroStatBox}>
                <Text className="text-xl font-sans-bold text-text">{summary.total}</Text>
                <Text className="text-2xs text-text-muted">Tổng</Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text className="text-xl font-sans-bold text-text">{summary.resolved}</Text>
                <Text className="text-2xs text-text-muted">Đã xử lý ở trang này</Text>
              </View>
            </View>
          </View>
        </AppCard>

        <View style={styles.sectionTitleRow}>
          <Text className="text-base font-sans-semibold text-text">Sự vụ cộng đồng</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable onPress={() => setSelectedAreaId('')} style={[styles.filterChip, !selectedAreaId && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, !selectedAreaId && styles.filterChipTextActive]}>Mọi khu vực</Text>
          </Pressable>
          {(areas as any[]).map((area) => {
            const areaId = getId(area, 'areaId', 'id');
            const active = areaId === selectedAreaId;
            return (
              <Pressable key={areaId} onPress={() => setSelectedAreaId(areaId)} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{getName(area, 'areaName', 'name')}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable onPress={() => setSelectedCategoryId('')} style={[styles.filterChip, !selectedCategoryId && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, !selectedCategoryId && styles.filterChipTextActive]}>Mọi danh mục</Text>
          </Pressable>
          {(categories as any[]).map((category) => {
            const categoryId = getId(category, 'categoryId', 'id');
            const active = categoryId === selectedCategoryId;
            return (
              <Pressable key={categoryId} onPress={() => setSelectedCategoryId(categoryId)} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{getName(category, 'categoryName', 'name')}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {feedQuery.isLoading ? (
          <View>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={index} className="mb-3">
                <SkeletonCard />
              </View>
            ))}
          </View>
        ) : items.length === 0 ? (
          <AppEmptyState icon={<Icon name="layers" size={40} color={colors.lightMuted} />}>
            Không có sự vụ cộng đồng nào phù hợp.
          </AppEmptyState>
        ) : (
          <View style={styles.feedList}>
            {items.map((item) => (
              <CommunityFeedCard
                key={item.incidentId}
                item={item}
                onPress={() => router.push(`/(resident)/community/${item.incidentId}`)}
                onCommentPress={() => router.push(`/(resident)/community/${item.incidentId}?autoFocusComment=1`)}
              />
            ))}
            {feedQuery.hasNextPage ? (
              <Pressable
                accessibilityRole="button"
                disabled={feedQuery.isFetchingNextPage}
                onPress={() => { void feedQuery.fetchNextPage(); }}
                style={styles.loadMoreButton}
              >
                {feedQuery.isFetchingNextPage
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.loadMoreText}>Tải thêm sự vụ</Text>}
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: { flex: 1, marginRight: 12 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  heroPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  heroTextWrap: { flex: 1 },
  heroStatsWrap: {
    flexDirection: 'column',
    gap: 8,
  },
  heroStatBox: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  trendingCard: {
    padding: 4,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  trendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  feedList: {
    gap: 10,
  },
  loadMoreButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loadMoreText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
