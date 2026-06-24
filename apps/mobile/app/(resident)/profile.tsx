import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';
import { useAuthStore } from '@/features/auth/auth.store';
import { colors } from '@/constants/theme';
import { useState } from 'react';

type MenuItem = {
  title: string;
  icon: keyof typeof Icon.glyphMap;
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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
  const userEmail = user?.email ?? '';
  const userRole = user?.role === 'service-user' ? 'Cư dân' : 'Nhân viên';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    logout();
    router.replace('/(auth)/login');
  };

  const accountItems: MenuItem[] = [
    {
      title: 'Thông tin cá nhân',
      icon: 'user',
    },
    {
      title: 'Địa chỉ thường dùng',
      icon: 'map-pin',
    },
    {
      title: 'Cài đặt thông báo',
      icon: 'bell',
    },
  ];

  const supportItems: MenuItem[] = [
    {
      title: 'Hỗ trợ',
      icon: 'help-circle',
    },
    {
      title: 'Điều khoản sử dụng',
      icon: 'file-text',
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity key={item.title} activeOpacity={0.78} style={styles.menuItem}>
      <View style={styles.menuIcon}>
        <Icon name={item.icon} size={20} color={colors.primary} />
      </View>

      <Text style={styles.menuText}>{item.title}</Text>

      <Icon name="chevron-right" size={20} color="#6B7280" />
    </TouchableOpacity>
  );

  return (
    <AppScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.headerButton}
            onPress={() => {
              router.replace('/(resident)');
            }}
          >
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tài khoản</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>

            <View style={styles.editBadge}>
              <Icon name="edit-2" size={14} color={colors.surface} />
            </View>
          </View>

          <Text style={styles.name}>{displayName}</Text>

          {userEmail ? (
            <View style={styles.contactRow}>
              <Icon name="mail" size={15} color="#4B5563" />
              <Text style={styles.contactText}>{userEmail}</Text>
            </View>
          ) : null}

          <View style={styles.rolePill}>
            <Icon name="shield" size={14} color={colors.primary} />
            <Text style={styles.roleText}>{userRole}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CÀI ĐẶT TÀI KHOẢN</Text>
          <View style={styles.menuCard}>{accountItems.map(renderMenuItem)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HỖ TRỢ & PHÁP LÝ</Text>
          <View style={styles.menuCard}>{supportItems.map(renderMenuItem)}</View>
        </View>

        <TouchableOpacity activeOpacity={0.82} style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out" size={18} color="#B91C1C" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={styles.versionBox}>
          <Text style={styles.versionText}>UrbanMind v2.4.0 (2024)</Text>
          <Text style={styles.versionSubtext}>Phát triển bởi Trung tâm Chuyển đổi số</Text>
        </View>
      </ScrollView>
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutModalIcon}>
              <Icon name="log-out" size={24} color="#B91C1C" />
            </View>

            <Text style={styles.logoutModalTitle}>Đăng xuất tài khoản?</Text>

            <Text style={styles.logoutModalDescription}>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?
            </Text>

            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                activeOpacity={0.78}
                style={styles.cancelButton}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.confirmLogoutButton}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmLogoutText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 46,
    paddingHorizontal: 20,
    paddingBottom: 112,
  },
  header: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.text,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primarySoft,
    borderWidth: 4,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primary,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  name: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#4B5563',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingLeft: 14,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B91C1C',
  },
  versionBox: {
    alignItems: 'center',
    marginTop: 28,
  },
  versionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#4B5563',
  },
  versionSubtext: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoutModal: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  logoutModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutModalDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 22,
  },
  logoutModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  confirmLogoutButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.surface,
  },
});