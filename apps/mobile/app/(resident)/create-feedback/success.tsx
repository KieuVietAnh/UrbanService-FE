import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';

export default function SuccessScreen() {
  const router = useRouter();
  const { reset } = useCreateFeedbackStore();

  const feedbackCode = useMemo(() => {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    return `UM-${randomNumber}`;
  }, []);

  const handleViewFeedback = () => {
    router.push('/(resident)/tickets');
  };

  const handleNewFeedback = () => {
    reset();
    router.replace('/(resident)/create-feedback');
  };

  const handleHome = () => {
    reset();
    router.replace('/(resident)');
  };

  const handleBack = () => {
    router.replace('/(resident)/create-feedback/confirm');
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Gửi thành công</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successCard}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIcon}>
                <Icon name="check" size={42} color={colors.surface} />
              </View>
            </View>

            <Text style={styles.title}>Phản ánh đã được ghi nhận!</Text>

            <Text style={styles.message}>
              Cảm ơn bạn đã đóng góp thông tin. Phản ánh của bạn đã được chuyển đến bộ phận phụ trách để xử lý.
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Mã phản ánh</Text>
              <Text style={styles.codeValue}>{feedbackCode}</Text>
            </View>

            <View style={styles.statusBox}>
              <Icon name="clock" size={17} color={colors.primary} />
              <Text style={styles.statusText}>
                Trạng thái hiện tại: Đang chờ tiếp nhận
              </Text>
            </View>
          </View>

          <View style={styles.actionGroup}>
            <TouchableOpacity activeOpacity={0.88} style={styles.primaryButton} onPress={handleViewFeedback}>
              <Icon name="list" size={18} color={colors.surface} />
              <Text style={styles.primaryButtonText}>Xem phản ánh đã gửi</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.82} style={styles.secondaryButton} onPress={handleNewFeedback}>
              <Icon name="plus-circle" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Gửi phản ánh khác</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.82} style={styles.ghostButton} onPress={handleHome}>
              <Icon name="home" size={18} color="#475569" />
              <Text style={styles.ghostButtonText}>Về trang chủ</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noticeCard}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Bạn có thể theo dõi tiến độ xử lý trong mục “Phản ánh đã gửi”.
            </Text>
          </View>
        </ScrollView>
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
    paddingTop: 24,
    paddingBottom: 120,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  successIconOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 22,
  },
  codeBox: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  statusBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#475569',
  },
  actionGroup: {
    marginTop: 22,
    gap: 12,
  },
  primaryButton: {
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
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  ghostButton: {
    height: 50,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
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
});