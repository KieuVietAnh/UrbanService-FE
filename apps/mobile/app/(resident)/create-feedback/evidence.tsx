import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { colors } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';

export default function EvidenceScreen() {
  const router = useRouter();
  const { evidence, addEvidence, removeEvidence } = useCreateFeedbackStore();
  const [error, setError] = useState<string | null>(null);

  const evidenceList = evidence ?? [];

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        addEvidence(result.assets[0].uri);
        setError(null);
      }
    } catch {
      Alert.alert('Không thể chọn ảnh', 'Vui lòng thử lại sau.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Cần quyền truy cập camera',
          'Vui lòng cấp quyền camera để chụp ảnh minh chứng.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        addEvidence(result.assets[0].uri);
        setError(null);
      }
    } catch {
      Alert.alert('Không thể chụp ảnh', 'Vui lòng thử lại sau.');
    }
  };

  const handleNext = () => {
    if (evidenceList.length === 0) {
      setError('Vui lòng thêm ít nhất một ảnh minh chứng.');
      return;
    }

    router.push('/(resident)/create-feedback/confirm');
  };

  const handlePrev = () => {
    router.replace('/(resident)/create-feedback/location');
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} onPress={handlePrev}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tải minh chứng</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Bước 4/5</Text>
              <Text style={styles.progressPercent}>80%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Icon name="camera" size={22} color={colors.primary} />
            </View>

            <Text style={styles.title}>Thêm ảnh minh chứng</Text>
            <Text style={styles.description}>
              Ảnh chụp hiện trường giúp phản ánh được xác minh và xử lý nhanh hơn.
            </Text>
          </View>

          <View style={styles.uploadCard}>
            {evidenceList.length > 0 ? (
              <View style={styles.imagesGrid}>
                {evidenceList.map((uri: string, index: number) => (
                  <View key={`${uri}-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.image} />

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.removeButton}
                      onPress={() => removeEvidence(index)}
                    >
                      <Icon name="x" size={15} color={colors.surface} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Icon name="image" size={28} color={colors.primary} />
                </View>

                <Text style={styles.emptyTitle}>Chưa có ảnh nào</Text>
                <Text style={styles.emptyDescription}>
                  Bạn có thể chụp ảnh trực tiếp hoặc chọn ảnh từ thư viện.
                </Text>
              </View>
            )}

            <View style={styles.uploadActions}>
              <TouchableOpacity activeOpacity={0.82} style={styles.secondaryButton} onPress={pickImage}>
                <Icon name="image" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Thư viện</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.82} style={styles.secondaryButton} onPress={takePhoto}>
                <Icon name="camera" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.tipCard}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.tipText}>
              Nên chụp rõ vị trí, mức độ hư hỏng và khu vực xung quanh để dễ xác minh.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.88} style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Tiếp theo</Text>
            <Icon name="arrow-right" size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 170,
  },
  progressSection: {
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    overflow: 'hidden',
  },
  progressFill: {
    width: '80%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  introCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 7,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  uploadCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyBox: {
    minHeight: 190,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#BFDBFE',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 5,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  imageContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 15,
    marginTop: 18,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 78,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.background,
  },
  nextButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
});