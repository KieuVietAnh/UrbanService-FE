
import React, { useState, useCallback } from 'react';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { fontSizes, fonts } from '@/theme/typography';
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
import { Text } from '@/components/ui';
import { AppCard } from '@/components/ui';
import { TicketStatusBadge } from '@/components/ui';
import { SkeletonCard } from '@/components/shared';
import { feedbackApi } from '@/features/reporting/api';
import { colors } from '@/constants/theme';
import { managementTypes } from '@urbanmind/shared-types';

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: managementTypes.feedbackStatus.SUBMITTED, label: 'Đã gửi' },
  { key: managementTypes.feedbackStatus.ASSIGNED, label: 'Đã phân công' },
  { key: managementTypes.feedbackStatus.IN_PROGRESS, label: 'Đang xử lý' },
  { key: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL, label: 'Chờ nghiệm thu' },
  { key: managementTypes.feedbackStatus.RESOLVED, label: 'Đã xử lý' },
  { key: managementTypes.feedbackStatus.APPROVED, label: 'Đã duyệt' },
  { key: managementTypes.feedbackStatus.CLOSED, label: 'Đã đóng' },
  { key: managementTypes.feedbackStatus.REJECTED, label: 'Bị từ chối' },
];

function TicketCard({ ticket, onPress }: { ticket: any; onPress: () => void }) {
  const createdAt = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleDateString('vi-VN')
    : '';

  const priority = String(ticket.priority ?? 'Medium').toLowerCase();
  const priorityMap: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: 'Khẩn cấp', color: '#DC2626', bg: '#FEE2E2' },
    high: { label: 'Cao', color: '#EA580C', bg: '#FED7AA' },
    medium: { label: 'Trung bình', color: '#B45309', bg: '#FDE68A' },
    low: { label: 'Thấp', color: '#047857', bg: '#A7F3D0' },
  };
  const priorityInfo = priorityMap[priority] ?? { label: 'Trung bình', color: '#B45309', bg: '#FDE68A' };

  return (
    <Pressable onPress={onPress} style={styles.ticketListItem}>
      <AppCard shadow="sm">
        <View style={styles.ticketCardContent}>
          
          <View style={styles.ticketTopRow}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
            {ticket.title ?? 'Chưa có tiêu đề'}
          </Text>
            <TicketStatusBadge status={ticket.status ?? 'PENDING'} size="sm" />
          </View>

          

          {ticket.categoryName && (
            <View style={styles.categoryRow}>
              <Icon name="tag" size={12} color={colors.muted} />
              <Text style={styles.categoryText}>{ticket.categoryName}</Text>
            </View>
          )}

          <View style={styles.locationRow}>
            <Icon name="map-pin" size={12} color={colors.muted} />
            <Text style={styles.locationText} numberOfLines={1}>
              {ticket.locationText ?? 'Không có địa chỉ'}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.dateRow}>
              <Icon name="calendar" size={11} color={colors.lightMuted} />
              <Text style={styles.dateText}>{createdAt}</Text>
            </View>
            <View style={styles.priorityRow}>
              <View style={[styles.priorityDot, { backgroundColor: priorityInfo.color }]} />
              <View style={[styles.priorityPill, { backgroundColor: priorityInfo.bg }]}>
                <Text style={[styles.priorityText, { color: priorityInfo.color }]}>{priorityInfo.label}</Text>
              </View>
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

  const tickets = Array.isArray(data)
    ? data
    : data?.items ?? [];

  const totalCount = Array.isArray(data)
    ? data.length
    : data?.totalItems ?? data?.totalCount ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerEyebrow}>UrbanMind</Text>
          <Text style={styles.headerTitle}>Phản ánh của tôi</Text>
        </View>
        <View style={styles.headerCountPill}>
          <Text style={styles.headerCountText}>{totalCount}</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
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

      <View style={styles.filterSection}>
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
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Icon name="inbox" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Không có phản ánh nào</Text>
              <Text style={styles.emptySubtitle}>
                {debouncedSearch
                  ? `Không tìm thấy kết quả cho "${debouncedSearch}"`
                  : 'Hãy gửi phản ánh đầu tiên của bạn!'}
              </Text>
              <Pressable
                onPress={() => router.push('/(resident)/create-feedback' as any)}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>Gửi phản ánh ngay</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          !item ? (
            <View style={styles.skeletonWrap}>
              <SkeletonCard />
            </View>
          ) : (
            <TicketCard
              ticket={item}
              onPress={() =>
                router.push(
                  `/(resident)/tickets/${item.feedbackId ?? item.id ?? item.ticketId}` as any
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
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['4'],
    paddingBottom: spacing['3.5'],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerEyebrow: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.lightMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes['2xl'],
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: spacing['1'],
  },
  headerCountPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius['pill'],
    paddingHorizontal: spacing['3'],
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerCountText: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes['xs'],
    color: colors.primary,
  },
  searchSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['3.5'],
    paddingBottom: spacing['2.5'],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2.5'],
    backgroundColor: colors.background,
    borderRadius: radius['card'],
    paddingHorizontal: spacing['3.5'],
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  filterSection: {
    backgroundColor: colors.surface,
    paddingBottom: spacing['2.5'],
  },
  filterList: {
    paddingHorizontal: spacing['5'],
    gap: spacing['2'],
  },
  filterChip: {
    paddingHorizontal: spacing['3.5'],
    paddingVertical: 7,
    borderRadius: radius['pill'],
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.medium,
    fontSize: fontSizes['sm'],
    color: colors.muted,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  listContent: {
    paddingTop: spacing['3'],
    paddingBottom: 120,
  },
  ticketListItem: {
    marginBottom: spacing['3'],
    marginHorizontal: spacing['5'],
  },
  ticketCardContent: {
    padding: spacing['3.5'],
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2'],
  },
  ticketTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing['2'],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1.5'],
    marginBottom: 9,
  },
  categoryText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1.5'],
    marginBottom: spacing['2.5'],
  },
  locationText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing['2.5'],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1'],
  },
  dateText: {
    fontFamily: fonts.medium,
    fontSize: fontSizes['2xs'],
    color: colors.lightMuted,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1.5'],
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: radius['pill'],
  },
  priorityPill: {
    borderRadius: radius['pill'],
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['1'],
  },
  priorityText: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes['2xs'],
  },
  skeletonWrap: {
    marginHorizontal: spacing['5'],
    marginBottom: spacing['3'],
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing['3.5'],
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes['xs'],
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing['2'],
    lineHeight: 18,
  },
  emptyButton: {
    marginTop: 18,
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['2.5'],
    borderRadius: radius['control'],
    backgroundColor: colors.primary,
  },
  emptyButtonText: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes['sm'],
    color: colors.surface,
  },
});
