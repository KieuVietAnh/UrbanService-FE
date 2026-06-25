import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ticketApi } from '@urbanmind/shared-api';
import Icon from '@expo/vector-icons/Feather';

type RawFeedback = {
  feedbackId?: string;
  id?: string;
  userId?: string;
  userName?: string;
  categoryId?: string;
  categoryName?: string;
  category?: string;
  title?: string;
  description?: string;
  locationText?: string;
  location?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  attachmentCount?: number;
  commentCount?: number;
  supportCount?: number;
};

type TicketItem = {
  id: string;
  title: string;
  category: string;
  location: string;
  status: string;
  createdAt: string;
  attachmentCount: number;
  commentCount: number;
  supportCount: number;
};

type StatusMeta = {
  label: string;
  color: string;
  background: string;
};

const getStatusMeta = (status?: string): StatusMeta => {
  const normalized = (status ?? '').toLowerCase();

  if (normalized === 'verified' || normalized === 'in_progress') {
    return {
      label: 'Đang xử lý',
      color: '#7C3AED',
      background: '#EDE9FE',
    };
  }

  if (
    normalized === 'resolved' ||
    normalized === 'completed' ||
    normalized === 'closed' ||
    normalized === 'complete'
  ) {
    return {
      label: 'Đã xử lý',
      color: '#047857',
      background: '#D1FAE5',
    };
  }

  return {
    label: 'Chờ tiếp nhận',
    color: '#B45309',
    background: '#FEF3C7',
  };
};

const formatDate = (value?: string) => {
  if (!value) return 'Chưa có ngày';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const normalizeTicket = (raw: RawFeedback): TicketItem => {
  const id = String(raw.feedbackId ?? raw.id ?? '');

  return {
    id,
    title: raw.title || raw.description || 'Phản ánh chưa có tiêu đề',
    category: raw.categoryName || raw.category || 'Chưa phân loại',
    location: raw.locationText || raw.location || 'Chưa có vị trí',
    status: raw.status || 'Submitted',
    createdAt: raw.createdAt || '',
    attachmentCount: raw.attachmentCount ?? 0,
    commentCount: raw.commentCount ?? 0,
    supportCount: raw.supportCount ?? 0,
  };
};

export default function TicketsListScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      return dateB - dateA;
    });
  }, [tickets]);

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const rawFeedbacks = await ticketApi.getTickets({}, { role: 'service-user' });
      const normalized = (rawFeedbacks ?? [])
        .map((item: RawFeedback) => normalizeTicket(item))
        .filter((item: TicketItem) => item.id);

      setTickets(normalized);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách phản ánh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets(false);
  };

  const handleOpenTicket = (id: string) => {
    router.push({
      pathname: '/(resident)/tickets/[id]',
      params: { id },
    });
  };

  const renderTicketCard = ({ item }: { item: TicketItem }) => {
    const statusMeta = getStatusMeta(item.status);

    return (
      <Pressable
        style={styles.ticketCard}
        onPress={() => handleOpenTicket(item.id)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.category}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: statusMeta.background }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <Text style={styles.ticketTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.infoRow}>
          <Icon name="map-pin" size={15} color={colors.primary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="calendar" size={15} color="#64748B" />
          <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.countGroup}>
            <View style={styles.countItem}>
              <Icon name="thumbs-up" size={15} color={colors.primary} />
              <Text style={styles.countText}>{item.supportCount}</Text>
            </View>

            <View style={styles.countItem}>
              <Icon name="message-circle" size={15} color={colors.primary} />
              <Text style={styles.countText}>{item.commentCount}</Text>
            </View>

            <View style={styles.countItem}>
              <Icon name="paperclip" size={15} color={colors.primary} />
              <Text style={styles.countText}>{item.attachmentCount}</Text>
            </View>
          </View>

          <View style={styles.detailButton}>
            <Text style={styles.detailText}>Chi tiết</Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateTitle}>Đang tải phản ánh...</Text>
          <Text style={styles.stateDescription}>
            Vui lòng chờ trong giây lát.
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Icon name="alert-circle" size={30} color="#DC2626" />
          </View>

          <Text style={styles.stateTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.stateDescription}>{error}</Text>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.primaryButton}
            onPress={() => fetchTickets()}
          >
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (sortedTickets.length === 0) {
      return (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Icon name="file-text" size={30} color={colors.primary} />
          </View>

          <Text style={styles.stateTitle}>Chưa có phản ánh nào</Text>
          <Text style={styles.stateDescription}>
            Bạn chưa gửi phản ánh nào. Hãy tạo phản ánh mới để góp phần cải thiện khu vực sống.
          </Text>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.primaryButton}
            onPress={() => router.push('/(resident)/create-feedback')}
          >
            <Icon name="plus-circle" size={17} color={colors.surface} />
            <Text style={styles.primaryButtonText}>Gửi phản ánh mới</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={sortedTickets}
        keyExtractor={(item) => item.id}
        renderItem={renderTicketCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    );
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>UrbanMind</Text>
            <Text style={styles.headerTitle}>Phản ánh đã gửi</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.78}
            style={styles.headerButton}
            onPress={() => router.push('/(resident)/create-feedback')}
          >
            <Icon name="plus" size={21} color={colors.surface} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Icon name="clipboard" size={20} color={colors.primary} />
          </View>

          <View style={styles.summaryTextBox}>
            <Text style={styles.summaryTitle}>
              {tickets.length} phản ánh
            </Text>
            <Text style={styles.summaryDescription}>
              Theo dõi trạng thái các phản ánh bạn đã gửi.
            </Text>
          </View>
        </View>

        {renderContent()}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 48,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    color: colors.text,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTextBox: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  summaryDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 112,
    gap: 12,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '900',
  },
  ticketTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#334155',
  },
  cardFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: colors.text,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    color: colors.primary,
  },
  centerState: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stateTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  stateDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryButtonText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    color: colors.surface,
  },
});