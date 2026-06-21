import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mockFeedbacks, Feedback } from '@/mocks/feedbackMock';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const router = useRouter();

  // Normalize id: if it's an array, use the first value; convert to string for comparison
  const ticketId = Array.isArray(id) ? id[0] : id;
  const stringTicketId = String(ticketId);

  const feedback = mockFeedbacks.find((item) => String(item.id) === stringTicketId);

  if (!feedback) {
    return (
      <AppScreen>
        <View style={styles.content}>
          <Text style={styles.title}>Không tìm thấy phản ánh</Text>
          <AppButton
            variant="outline"
            onPress={() => {
              // Go back to the ticket list
              router.back();
            }}
            style={styles.backButton}
          >
            Quay lại
          </AppButton>
        </View>
      </AppScreen>
    );
  }

  const statusColor =
    feedback.status === 'pending'
      ? colors.amber
      : feedback.status === 'in_progress'
      ? colors.purple
      : colors.emerald;

  return (
    <AppScreen>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppButton
            variant="text"
            onPress={() => {
              router.back();
            }}
            style={styles.backButton}
          >
            Quay lại
          </AppButton>
          <Text style={styles.title}>Chi tiết phản ánh</Text>
        </View>

        <AppCard style={styles.detailCard}>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Danh mục:</Text>
            <Text style={styles.detailValue}>{feedback.category}</Text>

            <Text style={styles.detailLabel}>Mô tả:</Text>
            <Text style={styles.detailValue}>{feedback.description}</Text>

            <Text style={styles.detailLabel}>Vị trí:</Text>
            <Text style={styles.detailValue}>{feedback.location}</Text>

            <Text style={styles.detailLabel}>Trạng thái:</Text>
            <View style={styles.statusBadgeContainer}>
              <Text style={[
                styles.statusBadge,
                { backgroundColor: statusColor },
              ]}>
                {feedback.status === 'pending'
                  ? 'Chưa xử lý'
                  : feedback.status === 'in_progress'
                  ? 'Đang xử lý'
                  : 'Hoàn thành'}
              </Text>
            </View>

            <Text style={styles.detailLabel}>Ngày tạo:</Text>
            <Text style={styles.detailValue}>
              {new Date(feedback.createdAt).toLocaleString('vi-VN')}
            </Text>

            {feedback.evidence.length > 0 && (
              <>
                <Text style={styles.detailLabel}>Minh chứng:</Text>
                <View style={styles.evidenceContainer}>
                  {feedback.evidence.map((uri: string, index: number) => (
                    <View key={index} style={styles.evidenceItem}>
                      <Image source={{ uri }} style={styles.evidenceImage} />
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </AppCard>

        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>Tiến trình xử lý</Text>
          <View style={styles.timelineSteps}>
            {/* Step 1: Đã gửi phản ánh */}
            <View style={[
              styles.timelineStep,
              feedback.status !== 'pending' ? styles.completedStep : '',
            ]}>
              <Text style={styles.timelineStepText}>Đã gửi phản ánh</Text>
            </View>
            <View style={styles.timelineConnector}>
              <View style={styles.timelineLine} />
            </View>

            {/* Step 2: Đang tiếp nhận */}
            <View style={[
              styles.timelineStep,
              feedback.status === 'in_progress' || feedback.status === 'completed'
                ? styles.completedStep
                : '',
            ]}>
              <Text style={styles.timelineStepText}>Đang tiếp nhận</Text>
            </View>
            <View style={styles.timelineConnector}>
              <View style={styles.timelineLine} />
            </View>

            {/* Step 3: Đang xử lý */}
            <View style={[
              styles.timelineStep,
              feedback.status === 'completed' ? styles.completedStep : '',
            ]}>
              <Text style={styles.timelineStepText}>Đang xử lý</Text>
            </View>
            <View style={styles.timelineConnector}>
              <View style={styles.timelineLine} />
            </View>

            {/* Step 4: Hoàn tất */}
            <View style={[
              styles.timelineStep,
              feedback.status === 'completed' ? styles.completedStep : '',
            ]}>
              <Text style={styles.timelineStepText}>Hoàn thành</Text>
            </View>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  detailCard: {
    marginBottom: 24,
  },
  detailContent: {
  },
  detailLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  statusBadgeContainer: {
    alignItems: 'flex-start',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  evidenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  timelineContainer: {
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  timelineSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
  },
  completedStep: {
    // This will be used to style completed steps
  },
  timelineStepText: {
    fontSize: 12,
    color: colors.muted,
  },
  timelineConnector: {
    alignItems: 'center',
  },
  timelineLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
});