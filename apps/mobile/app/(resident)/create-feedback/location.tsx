import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';

export default function LocationScreen() {
  const router = useRouter();
  const { location, setLocation } = useCreateFeedbackStore();
  const [error, setError] = useState<string | null>(null);

  const handleLocationChange = (text: string) => {
    setLocation(text);
    if (error) setError(null);
  };

  const handleUseCurrentLocation = () => {
    setLocation('Số 1 Đường ABC, Quận XYZ, Thành phố Hà Nội');
    setError(null);
  };

  const handleNext = () => {
    const trimmedLocation = location.trim();

    if (!trimmedLocation) {
      setError('Vui lòng nhập hoặc chọn vị trí phản ánh.');
      return;
    }

    router.push('/(resident)/create-feedback/evidence');
  };

  const handlePrev = () => {
    router.replace('/(resident)/create-feedback/description');
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} onPress={handlePrev}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Chọn vị trí</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Bước 3/5</Text>
              <Text style={styles.progressPercent}>60%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Icon name="map-pin" size={22} color={colors.primary} />
            </View>

            <Text style={styles.title}>Vấn đề xảy ra ở đâu?</Text>
            <Text style={styles.description}>
              Nhập địa chỉ cụ thể hoặc dùng vị trí hiện tại để giúp đơn vị xử lý xác định đúng khu vực.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Địa điểm phản ánh</Text>

            <View style={styles.inputBox}>
              <Icon name="map-pin" size={18} color={colors.primary} />
              <TextInput
                value={location}
                onChangeText={handleLocationChange}
                placeholder="Nhập địa chỉ, tên đường hoặc khu vực..."
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
            >
              <View style={styles.currentLocationIcon}>
                <Icon name="navigation" size={18} color={colors.primary} />
              </View>

              <View style={styles.currentLocationTextBox}>
                <Text style={styles.currentLocationTitle}>Sử dụng vị trí hiện tại</Text>
                <Text style={styles.currentLocationDescription}>
                  Tự động điền vị trí mẫu để kiểm thử giao diện.
                </Text>
              </View>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.mapPreviewCard}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Xem trước khu vực</Text>
              <Icon name="map" size={18} color={colors.primary} />
            </View>

            <View style={styles.mapPreview}>
              <View style={styles.mapLineOne} />
              <View style={styles.mapLineTwo} />
              <View style={styles.mapMarker}>
                <Icon name="map-pin" size={18} color={colors.surface} />
              </View>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.tipText}>
              Nên ghi rõ số nhà, tên đường, tòa nhà hoặc mốc gần nhất để dễ xác minh.
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
    minHeight: 86,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 10,
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
    width: '60%',
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
  formCard: {
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
  inputLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  inputBox: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  currentLocationButton: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLocationIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentLocationTextBox: {
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  currentLocationDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 12,
  },
  mapPreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.text,
  },
  mapPreview: {
    height: 132,
    borderRadius: 17,
    backgroundColor: '#DCEAF4',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLineOne: {
    position: 'absolute',
    width: 240,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
    transform: [{ rotate: '18deg' }],
  },
  mapLineTwo: {
    position: 'absolute',
    width: 220,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.58)',
    transform: [{ rotate: '-24deg' }],
  },
  mapMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
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