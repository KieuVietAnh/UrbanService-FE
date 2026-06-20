import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function LocationScreen() {
  const router = useRouter();
  const { location, setLocation } = useCreateFeedbackStore();
  const [error, setError] = useState<string | null>(null);

  const handleUseCurrentLocation = () => {
    // TODO: Get current location using expo-location
    // For now, set a mock location
    setLocation('Số 1 Đường ABC, Quận XYZ, Thành phố Hà Nội');
  };

  const handleNext = () => {
    if (!location) {
      setError('Vui lòng chọn vị trí');
      return;
    }
    setError(null);
    router.push('/(resident)/create-feedback/evidence');
  };

  const handlePrev = () => {
    router.push('/(resident)/create-feedback/description');
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Bước 3/6</Text>
          <Text style={styles.stepDescription}>Xác định vị trí</Text>
        </View>

        {/* Location input */}
        <AppCard style={styles.locationCard}>
          <AppInput
            label="Địa điểm"
            placeholder="Nhập địa điểm hoặc sử dụng vị trí hiện tại"
            value={location}
            onChangeText={(text: string) => {
              setLocation(text);
            }}
          />
          <AppButton
            variant="outline"
            onPress={handleUseCurrentLocation}
            style={styles.useCurrentButton}
          >
            Vị trí hiện tại
          </AppButton>
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
  locationCard: {
    marginBottom: 24,
  },
  useCurrentButton: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 12,
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