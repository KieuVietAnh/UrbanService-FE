import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppCard } from '@/components/ui/AppCard';
import { SkeletonCard } from '@/components/ui/AppSkeleton';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { CommunityFeedCard } from '@/components/community/CommunityFeedCard';
import { communityApi } from '@/services/api/communityApi';
import { colors } from '@/constants/theme';
import { FloatingChatMenu } from '@/components/ui/FloatingChatMenu';

const FILTERS = [
  { key: 'latest', label: 'Mới nhất' },
  { key: 'resolved', label: 'Đã xử lý' },
  { key: 'trending', label: 'Phổ biến' },
];

export default function CommunityFeedScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('latest');
  const [searchText, setSearchText] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['community-feed-mobile', activeFilter, searchText],
    queryFn: () =>
      communityApi.getFeed({
        pageNumber: 1,
        pageSize: 12,
        status: activeFilter === 'resolved' ? 'resolved' : undefined,
        search: searchText || undefined,
      }),
  });

  const items = data?.items ?? [];

  const summary = useMemo(() => ({
    total: data?.totalItems ?? items.length,
    resolved: items.filter((item: any) => String(item?.status || '').toUpperCase() === 'RESOLVED').length,
    active: Math.max(1, items.length),
  }), [data?.totalItems, items]);

  const trendingItems = useMemo(() => {
    return items.slice(0, 3).map((item: any) => ({
      title: item?.title ?? 'Phản ánh cộng đồng',
      count: item?.supportCount ?? 0,
      tag: item?.locationText ?? 'Địa điểm',
    }));
  }, [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text className="text-xl font-sans-bold text-text">Cộng đồng</Text>
          <Text className="text-sm text-text-muted mt-1">Ghé lại bảng tin, theo dõi phản ánh và trao đổi</Text>
        </View>
        <Pressable onPress={() => router.push('/(resident)/community/map' as any)} style={styles.mapButton}>
          <Icon name="map" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm phản ánh..."
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
              <Text className="text-lg font-sans-bold text-text mt-1">Theo dõi phản ánh đang được quan tâm</Text>
              <Text className="text-sm text-text-muted mt-2">Tìm nhanh vấn đề, chia sẻ tình trạng xử lý và đóng góp ý kiến.</Text>
            </View>
            <View style={styles.heroStatsWrap}>
              <View style={styles.heroStatBox}>
                <Text className="text-xl font-sans-bold text-text">{summary.total}</Text>
                <Text className="text-2xs text-text-muted">Tổng</Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text className="text-xl font-sans-bold text-text">{summary.resolved}</Text>
                <Text className="text-2xs text-text-muted">Đã xử lý</Text>
              </View>
            </View>
          </View>
        </AppCard>

        <View style={styles.sectionTitleRow}>
          <Text className="text-base font-sans-semibold text-text">Đang nổi bật</Text>
          <Pressable onPress={() => setActiveFilter('trending')}>
            <Text className="text-sm font-sans-semibold text-primary">Xem thêm</Text>
          </Pressable>
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

        <AppCard shadow="sm" className="mb-4">
          <View style={styles.trendingCard}>
            <View style={styles.trendingHeader}>
              <Icon name="trending-up" size={16} color={colors.primary} />
              <Text className="text-sm font-sans-semibold text-text">Trending reports</Text>
            </View>
            {trendingItems.map((item, index) => (
              <View key={`${item.title}-${index}`} style={styles.trendingItem}>
                <View style={styles.trendingDot} />
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-sans-semibold text-text" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-xs text-text-muted mt-1">{item.tag} • {item.count} lượt ủng hộ</Text>
                </View>
              </View>
            ))}
          </View>
        </AppCard>

        {isLoading ? (
          <View>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={index} className="mb-3">
                <SkeletonCard />
              </View>
            ))}
          </View>
        ) : items.length === 0 ? (
          <AppEmptyState icon={<Icon name="layers" size={40} color={colors.lightMuted} />}>
            Không có phản ánh nào phù hợp trong bảng tin cộng đồng.
          </AppEmptyState>
        ) : (
          <View style={styles.feedList}>
            {items.map((item: any) => (
              <CommunityFeedCard
                key={item.feedbackId ?? item.id}
                item={item}
                onPress={() => router.push(`/(resident)/community/${item.feedbackId ?? item.id}` as any)}
              />
            ))}
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
    padding: 4,
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
});
