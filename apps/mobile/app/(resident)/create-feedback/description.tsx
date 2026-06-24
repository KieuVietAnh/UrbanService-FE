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

export default function DescriptionScreen() {
  const router = useRouter();
  const { description, setDescription } = useCreateFeedbackStore();
  const [error, setError] = useState<string | null>(null);

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (error) setError(null);
  };

  const handleNext = () => {
    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setError('Vui lòng mô tả tình huống trước khi tiếp tục.');
      return;
    }

    if (trimmedDescription.length < 10) {
      setError('Mô tả phải có ít nhất 10 ký tự.');
      return;
    }

    router.push('/(resident)/create-feedback/location');
  };

  const handlePrev = () => {
    router.replace('/(resident)/create-feedback/category');
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} onPress={handlePrev}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Mô tả phản ánh</Text>

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
              <Text style={styles.progressLabel}>Bước 2/5</Text>
              <Text style={styles.progressPercent}>40%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Icon name="edit-3" size={22} color={colors.primary} />
            </View>

            <Text style={styles.title}>Mô tả chi tiết vấn đề</Text>
            <Text style={styles.descriptionText}>
              Cung cấp thông tin rõ ràng giúp bộ phận xử lý hiểu đúng tình huống và phản hồi nhanh hơn.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Nội dung phản ánh</Text>

            <TextInput
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Ví dụ: Đèn đường trước nhà số 12 bị hỏng nhiều ngày, khu vực khá tối vào buổi tối..."
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              style={styles.textArea}
            />

            <View style={styles.inputFooter}>
              <Text style={styles.helperText}>Tối thiểu 10 ký tự</Text>
              <Text style={styles.counterText}>{description.length}/500</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.tipCard}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.tipText}>
              Nên ghi rõ thời gian, mức độ ảnh hưởng và đặc điểm dễ nhận biết của vấn đề.
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
    width: '40%',
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
  descriptionText: {
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
  textArea: {
    minHeight: 170,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  inputFooter: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: {
    fontSize: 12,
    color: colors.muted,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 10,
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