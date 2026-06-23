import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Feedback } from '@/mocks/feedbackMock';
import { ticketApi } from '@urbanmind/shared-api';

interface RawFeedback {
  feedbackId: string;
  userId: string;
  userName: string;
  categoryId: string;
  categoryName: string;
  title: string;
  locationText: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  commentCount: number;
  supportCount: number;
}

export default function TicketsListScreen() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map API status to UI status
  const mapStatus = (apiStatus: string): Feedback['status'] => {
    const lower = apiStatus.toLowerCase();
    if (lower === 'submitted') return 'pending';
    if (lower === 'verified') return 'in_progress';
    if (['resolved', 'completed', 'closed'].includes(lower)) return 'completed';
    return 'pending'; // default fallback
  };

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch tickets for the current user (resident/service-user)
        const rawFeedbacks = await ticketApi.getTickets({}, { role: 'service-user' });
        // Map API response to UI shape
        const normalized = rawFeedbacks.map((raw: RawFeedback) => ({
          id: raw.feedbackId,
          category: raw.categoryName,
          description: raw.title,
          location: raw.locationText,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          status: mapStatus(raw.status),
          evidence: [], // API list doesn't include evidence; detail screen will fetch if needed
          priority: raw.priority,
          attachmentCount: raw.attachmentCount,
          commentCount: raw.commentCount,
          supportCount: raw.supportCount,
        }));
        setFeedbacks(normalized);
      } catch (err: any) {
        const msg = err?.message || 'Lỗi không xác định';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []); // run once on mount

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.content}>
          <Text style={styles.title}>Danh sách phản ánh</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        <View style={styles.content}>
          <Text style={styles.title}>Danh sách phản ánh</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.red, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        </View>
      </AppScreen>
    );
  }

  const renderItem = ({ item }: { item: Feedback }) => {
    const statusColor =
      item.status === 'pending'
        ? colors.amber
        : item.status === 'in_progress'
          ? colors.purple
          : colors.emerald;

    return (
      <Pressable
        style={styles.feedbackCard}
        onPress={() => {
          router.push({
            pathname: '/(resident)/tickets/[id]',
            params: { id: item.id },
          });
        }}
      >
        <View style={styles.feedbackContent}>
          <View style={styles.feedbackInfo}>
            <Text style={styles.feedbackTitle}>{item.category}</Text>
            <Text style={styles.feedbackDescription}>
              {item.description}
            </Text>
          </View>
          <View style={styles.feedbackMeta}>
            <Text style={styles.feedbackLocation}>📍 {item.location}</Text>
            <Text style={styles.feedbackDate}>
              {/* Format the date for display */}
              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          <View style={styles.statusBadgeContainer}>
            <Text style={[
              styles.statusBadge,
              { backgroundColor: statusColor },
            ]}>
              {item.status === 'pending'
                ? 'Chưa xử lý'
                : item.status === 'in_progress'
                  ? 'Đang xử lý'
                  : 'Hoàn thành'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        <Text style={styles.title}>Danh sách phản ánh</Text>

        {feedbacks.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              Chưa có phản ánh
            </Text>
          </View>
        ) : (
          <FlatList
            data={feedbacks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  feedbackCard: {
    marginBottom: 16,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  feedbackInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  feedbackDescription: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  feedbackMeta: {
    flexDirection: 'row',
  },
  feedbackLocation: {
    fontSize: 14,
    color: colors.text,
  },
  feedbackDate: {
    fontSize: 14,
    color: colors.muted,
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
    minWidth: 0,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
  },
});