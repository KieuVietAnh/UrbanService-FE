import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import Icon from '@expo/vector-icons/Feather';

type StepPreview = {
  title: string;
  description: string;
  icon: keyof typeof Icon.glyphMap;
};

const stepPreviews: StepPreview[] = [
  {
    title: 'Chọn loại vấn đề',
    description: 'Xác định nhóm phản ánh phù hợp',
    icon: 'grid',
  },
  {
    title: 'Mô tả & vị trí',
    description: 'Cung cấp thông tin chi tiết',
    icon: 'map-pin',
  },
  {
    title: 'Minh chứng',
    description: 'Thêm ảnh để dễ xác minh',
    icon: 'camera',
  },
];

export default function CreateFeedbackIndex() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/(resident)/create-feedback/category');
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.headerButton}
            onPress={() => router.replace('/(resident)')}
          >
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Gửi phản ánh</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Icon name="plus-circle" size={34} color={colors.surface} />
            </View>

            <Text style={styles.heroTitle}>Bắt đầu gửi phản ánh mới</Text>

            <Text style={styles.heroDescription}>
              Báo cáo nhanh các vấn đề hạ tầng, môi trường hoặc an ninh đô thị để được tiếp nhận và xử lý kịp thời.
            </Text>

            <View style={styles.heroBadge}>
              <Icon name="zap" size={14} color={colors.primary} />
              <Text style={styles.heroBadgeText}>Chỉ mất khoảng 2 phút</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quy trình thực hiện</Text>

            <View style={styles.stepsCard}>
              {stepPreviews.map((step, index) => (
                <View key={step.title} style={styles.stepItem}>
                  <View style={styles.stepNumberBox}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>

                  <View style={styles.stepIcon}>
                    <Icon name={step.icon} size={18} color={colors.primary} />
                  </View>

                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.noticeCard}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Thông tin phản ánh càng rõ ràng thì quá trình xác minh và xử lý càng nhanh.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.88} style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>Bắt đầu</Text>
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
    paddingTop: 12,
    paddingBottom: 170,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 22,
    minHeight: 250,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.surface,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.surface,
    opacity: 0.92,
    marginBottom: 18,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primary,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  stepNumberBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.surface,
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
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
  startButton: {
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
  startButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
});