import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { mockFeedbacks, Feedback } from '@/mocks/feedbackMock';

export default function TicketsListScreen() {
  const router = useRouter();

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

        <FlatList
          data={mockFeedbacks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
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
    justifyContent: 'space-between',
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