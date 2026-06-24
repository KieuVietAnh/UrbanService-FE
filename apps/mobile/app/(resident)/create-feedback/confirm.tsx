import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';

type SummaryItem = {
  label: string;
  value: string;
  icon: keyof typeof Icon.glyphMap;
};

export default function ConfirmScreen() {
  const router = useRouter();
  const { category, description, location, evidence } = useCreateFeedbackStore();

  const evidenceList = evidence ?? [];

  const handleSubmit = () => {
    router.push('/(resident)/create-feedback/success');
  };

  const handlePrev = () => {
    router.replace('/(resident)/create-feedback/evidence');
  };

  const summaryItems: SummaryItem[] = [
    {
      label: 'Loại vấn đề',
      value: category || 'Chưa chọn loại vấn đề',
      icon: 'grid',
    },
    {
      label: 'Mô tả phản ánh',
      value: description || 'Chưa có mô tả',
      icon: 'file-text',
    },
    {
      label: 'Vị trí',
      value: location || 'Chưa có vị trí',
      icon: 'map-pin',
    },
    {
      label: 'Minh chứng',
      value:
        evidenceList.length > 0
          ? `${evidenceList.length} ảnh đã được tải lên`
          : 'Chưa có ảnh minh chứng',
      icon: 'image',
    },
  ];

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} onPress={handlePrev}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Xác nhận thông tin</Text>

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
              <Text style={styles.progressLabel}>Bước 5/5</Text>
              <Text style={styles.progressPercent}>100%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Icon name="check-circle" size={24} color={colors.primary} />
            </View>

            <Text style={styles.title}>Kiểm tra lại phản ánh</Text>
            <Text style={styles.description}>
              Vui lòng xác nhận thông tin trước khi gửi để bộ phận xử lý tiếp nhận chính xác hơn.
            </Text>
          </View>

          <View style={styles.summaryList}>
            {summaryItems.map((item) => (
              <View key={item.label} style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Icon name={item.icon} size={19} color={colors.primary} />
                </View>

                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.noticeCard}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Sau khi gửi, phản ánh sẽ được ghi nhận và chuyển đến đơn vị phụ trách để kiểm tra.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.88} style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Gửi phản ánh</Text>
            <Icon name="send" size={18} color={colors.surface} />
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
    width: '100%',
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
    width: 48,
    height: 48,
    borderRadius: 16,
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
  summaryList: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.text,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 15,
    marginTop: 18,
  },
  noticeText: {
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
  submitButton: {
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
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
});