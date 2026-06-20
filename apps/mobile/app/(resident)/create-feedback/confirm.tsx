import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';

export default function ConfirmScreen() {
  const router = useRouter();
  const { category, description, location, evidence } = useCreateFeedbackStore();

  const handleSubmit = () => {
    // TODO: Submit to mock service
    console.log('Submitting feedback:', { category, description, location, evidence });
    // For now, just go to success step
    router.push('/(resident)/create-feedback/success');
  };

  const handlePrev = () => {
    router.push('/(resident)/create-feedback/evidence');
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Bước 5/6</Text>
          <Text style={styles.stepDescription}>Xác nhận phản hồi</Text>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryContainer}>
          <AppCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Danh mục:</Text>
            <Text style={styles.summaryValue}>{category || 'Chưa chọn'}</Text>
          </AppCard>

          <AppCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Mô tả:</Text>
            <Text style={styles.summaryValue}>{description || 'Chưa có mô tả'}</Text>
          </AppCard>

          <AppCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Vị trí:</Text>
            <Text style={styles.summaryValue}>{location || 'Chưa có vị trí'}</Text>
          </AppCard>

          <AppCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Bằng chứng ({evidence.length}):</Text>
            {evidence.length > 0 ? (
              <View style={styles.evidenceList}>
                {evidence.map((uri: string, index: number) => (
                  <View key={index} style={styles.evidenceItem}>
                    <Text style={styles.evidenceText}>Ảnh {index + 1}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noEvidence}>Chưa có ảnh nào</Text>
            )}
          </AppCard>
        </View>

        {/* Submit button */}
        <View style={styles.buttonContainer}>
          <AppButton
            variant="primary"
            onPress={handlePrev}
            style={styles.prevButton}
          >
            Quay lại
          </AppButton>
          <AppButton
            variant="primary"
            onPress={handleSubmit}
            style={styles.submitButton}
          >
            Gửi phản ánh
          </AppButton>
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
    justifyContent: 'space-between',
  },
  stepIndicator: {
    marginBottom: 32,
    alignItems: 'center',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  summaryContainer: {
    marginBottom: 32,
    gap: 16,
  },
  summaryCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  evidenceList: {
    marginTop: 12,
  },
  evidenceItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 6,
  },
  evidenceText: {
    fontSize: 14,
    color: colors.text,
  },
  noEvidence: {
    fontSize: 14,
    color: colors.lightMuted,
    textAlign: 'center',
    padding: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 12,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 16,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
  },
});