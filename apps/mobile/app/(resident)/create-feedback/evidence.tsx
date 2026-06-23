import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { colors } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function EvidenceScreen() {
  const router = useRouter();
  const { evidence, addEvidence, removeEvidence } = useCreateFeedbackStore();
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      addEvidence(uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      addEvidence(uri);
    }
  };

  const handleNext = () => {
    if (evidence.length === 0) {
      setError('Vui lòng thêm ít nhất một bằng chứng');
      return;
    }
    setError(null);
    router.push('/(resident)/create-feedback/confirm');
  };

  const handlePrev = () => {
    router.push('/(resident)/create-feedback/location');
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Bước 4/6</Text>
          <Text style={styles.stepDescription}>Thêm chứng 증거</Text>
        </View>

        {/* Images container */}
        <AppCard style={styles.imagesCard}>
          <View style={styles.imagesContainer}>
            {evidence.length > 0 ? (
              <View style={styles.imagesList}>
                {evidence.map((uri: string, index: number) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      onPress={() => {
                        removeEvidence(index);
                      }}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noImages}>Chưa có ảnh nào được chọn</Text>
            )}
          </View>

          <View style={styles.buttonRow}>
            <AppButton
              variant="outline"
              onPress={pickImage}
              style={styles.uploadButton}
            >
              Chọn từ thư viện
            </AppButton>
            <AppButton
              variant="outline"
              onPress={takePhoto}
              style={styles.uploadButton}
            >
              Chụp ảnh
            </AppButton>
          </View>
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
  imagesCard: {
    marginBottom: 24,
  },
  imagesContainer: {
  },
  imagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageContainer: {
    width: 100,
    height: 100,
    marginBottom: 12,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noImages: {
    fontSize: 16,
    color: colors.lightMuted,
    textAlign: 'center',
    padding: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadButton: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 4,
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