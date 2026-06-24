import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { colors } from '@/constants/theme';
import Icon from '@expo/vector-icons/Feather';

type QuickAction = {
  title: string;
  subtitle: string;
  icon: keyof typeof Icon.glyphMap;
  iconColor: string;
  iconBackground: string;
  disabled?: boolean;
  onPress?: () => void;
};

type StatusItem = {
  label: string;
  icon: keyof typeof Icon.glyphMap;
  color: string;
  background: string;
};

type AlertItem = {
  badge: string;
  title: string;
  time: string;
  badgeColor: string;
};

export default function ResidentHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const getDisplayName = () => {
    if (!user) return 'bạn';

    const fullName = ((user as any).fullName || (user as any).name || '').trim();
    if (fullName) return fullName;

    const emailPrefix = user.email?.split('@')[0] ?? '';
    if (!emailPrefix) return 'bạn';

    return emailPrefix
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const displayName = getDisplayName();

  const statusItems: StatusItem[] = [
    {
      label: 'Đang xử lý',
      icon: 'clock',
      color: colors.primary,
      background: colors.primarySoft,
    },
    {
      label: 'Chờ phản hồi',
      icon: 'message-circle',
      color: '#047857',
      background: '#D1FAE5',
    },
    {
      label: 'Đã xử lý',
      icon: 'check-circle',
      color: '#4B5563',
      background: '#F1F5F9',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Phản ánh đã gửi',
      subtitle: 'Xem lịch sử phản ánh',
      icon: 'clipboard',
      iconColor: colors.primary,
      iconBackground: colors.primarySoft,
      onPress: () => router.push('/(resident)/tickets'),
    },
    {
      title: 'Tin tức gần đó',
      subtitle: 'Cập nhật khu vực',
      icon: 'calendar',
      iconColor: '#047857',
      iconBackground: '#D1FAE5',
      disabled: true,
    },
    {
      title: 'Báo cáo gần đó',
      subtitle: 'Theo dõi cộng đồng',
      icon: 'bar-chart-2',
      iconColor: '#B45309',
      iconBackground: '#FEF3C7',
      disabled: true,
    },
    {
      title: 'Hỗ trợ',
      subtitle: 'Trung tâm trợ giúp',
      icon: 'headphones',
      iconColor: '#7C3AED',
      iconBackground: '#EDE9FE',
      disabled: true,
    },
  ];

  const recentAlerts: AlertItem[] = [
    {
      badge: 'KHẨN CẤP',
      title: 'Sửa chữa đường ống nước',
      time: 'Dự kiến kết thúc 18:00',
      badgeColor: '#EF4444',
    },
    {
      badge: 'BẢO TRÌ',
      title: 'Bảo dưỡng hệ thống điện',
      time: '08:00 - 12:00',
      badgeColor: '#F59E0B',
    },
    {
      badge: 'CẬP NHẬT',
      title: 'Vệ sinh tuyến đường chính',
      time: 'Hoàn tất trong hôm nay',
      badgeColor: colors.primary,
    },
    {
      badge: 'THÔNG BÁO',
      title: 'Kiểm tra đèn chiếu sáng',
      time: 'Bắt đầu lúc 19:30',
      badgeColor: '#64748B',
    },
  ];

  return (
    <AppScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Icon name="grid" size={15} color={colors.primary} />
            </View>
            <Text style={styles.brandText}>UrbanMind</Text>
          </View>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Xin chào, {displayName}</Text>
          <Text style={styles.greetingSubtitle}>
            Hôm nay bạn muốn phản ánh vấn đề gì?
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryCard}
          onPress={() => router.push('/(resident)/create-feedback')}
        >
          <View style={styles.primaryCardContent}>
            <View style={styles.primaryCardText}>
              <Text style={styles.primaryCardTitle}>Gửi phản ánh mới</Text>
              <Text style={styles.primaryCardDescription}>
                Báo cáo các vấn đề hạ tầng hoặc môi trường ngay lập tức.
              </Text>

              <View style={styles.primaryPill}>
                <Text style={styles.primaryPillText}>Gửi ngay</Text>
              </View>
            </View>

            <View style={styles.plusCircle}>
              <Icon name="plus" size={30} color={colors.surface} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.statusRow}>
          {statusItems.map((item) => (
            <View key={item.label} style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: item.background }]}>
                <Icon name={item.icon} size={17} color={item.color} />
              </View>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              activeOpacity={item.disabled ? 1 : 0.78}
              disabled={item.disabled}
              onPress={item.onPress}
              style={styles.quickCard}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.iconBackground }]}>
                <Icon name={item.icon} size={18} color={item.iconColor} />
              </View>
              <Text style={[styles.quickTitle, item.disabled && styles.quickTitleMuted]}>
                {item.title}
              </Text>
              <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.alertSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cảnh báo gần đây</Text>
            <TouchableOpacity activeOpacity={0.75}>
              <Text style={styles.sectionLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alertList}
          >
            {recentAlerts.map((alert) => (
              <View key={alert.title} style={styles.alertCard}>
                <View style={[styles.alertBadge, { backgroundColor: alert.badgeColor }]}>
                  <Text style={styles.alertBadgeText}>{alert.badge}</Text>
                </View>

                <Text style={styles.alertCardTitle} numberOfLines={2}>
                  {alert.title}
                </Text>

                <View style={styles.alertMetaRow}>
                  <Icon name="clock" size={13} color={colors.muted} />
                  <Text style={styles.alertMetaText} numberOfLines={1}>
                    {alert.time}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.mapTitleRow}>
              <View style={styles.mapIcon}>
                <Icon name="map" size={18} color={colors.primary} />
              </View>
              <View style={styles.mapCopy}>
                <Text style={styles.mapTitle}>Bản đồ phản ánh</Text>
                <Text style={styles.mapSubtitle}>Theo dõi tình hình khu vực</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={colors.text} />
          </View>

          <View style={styles.mapPreview}>
            <View style={styles.mapLineOne} />
            <View style={styles.mapLineTwo} />
            <View style={styles.mapLineThree} />
            <View style={styles.mapPill}>
              <View style={styles.mapDot} />
              <Text style={styles.mapPillText}>24 phản ánh mới hôm nay</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 112,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSection: {
    marginBottom: 18,
  },
  greetingTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  primaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 20,
    minHeight: 142,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  primaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryCardText: {
    flex: 1,
    paddingRight: 14,
  },
  primaryCardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 8,
  },
  primaryCardDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: 18,
  },
  primaryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  primaryPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  plusCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  statusCard: {
    flex: 1,
    minHeight: 86,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  statusLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 20,
  },
  quickCard: {
    width: '48%',
    minHeight: 106,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 15,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  quickTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  quickTitleMuted: {
    color: '#4B5563',
  },
  quickSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.muted,
  },
  alertSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  alertList: {
    gap: 12,
    paddingRight: 20,
    paddingBottom: 8,
  },
  alertCard: {
    width: 168,
    minHeight: 124,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  alertBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  alertBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: colors.surface,
  },
  alertCardTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  alertMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 'auto',
  },
  alertMetaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  mapCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginTop: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mapCopy: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: colors.text,
  },
  mapSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  mapPreview: {
    height: 116,
    borderRadius: 15,
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
  mapLineThree: {
    position: 'absolute',
    width: 1,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '12deg' }],
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  mapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  mapPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});