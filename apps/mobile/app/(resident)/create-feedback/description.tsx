import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppTextArea } from '@/components/ui/AppTextArea';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function DescriptionScreen() {
  const router = useRouter();
  const { description, setDescription } = useCreateFeedbackStore();
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (!description) {
      setError('Vui lòng mô tả tình huống');
      return;
    }
    if (description.length < 10) {
      setError('Mô tả phải có ít nhất 10 ký tự');
      return;
    }
    setError(null);
    router.push('/(resident)/create-feedback/location');
  };

  const handlePrev = () => {
    router.push('/(resident)/create-feedback/category');
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Bước 2/6</Text>
          <Text style={styles.stepDescription}>Mô tả tình huống</Text>
        </View>

        {/* Description input */}
        <AppCard style={styles.descriptionCard}>
          <AppTextArea
            label="Mô tả"
            placeholder="Nhập mô tả chi tiết về tình huống..."
            value={description}
            onChangeText={(text: string) => {
              setDescription(text);
            }}
          />
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </AppCard>

        {/* Navigation buttons */}
        <View style={styles.buttonContainer}>
          <AppButton
            variant="outline"
            onPress={handlePrev}
            style={styles.prevButton}
          >
            Quay lại
          </AppButton>
          <AppButton
            variant="primary"
            onPress={handleNext}
            style={styles.nextButton}
          >
            Tiếp theo
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
  descriptionCard: {
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: colors.red,
    marginTop: 12,
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
  nextButton: {
    flex: 1,
    paddingVertical: 16,
  },
});