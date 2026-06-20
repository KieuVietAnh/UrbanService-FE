import { View, Text, StyleSheet, Image } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { colors } from '@/constants/theme';

export default function ResidentHomeScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('(auth)/login');
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        {/* Header with user info */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.welcome}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.email?.split('@')[0] ?? ''}</Text>
          </View>
          {/* Optional: User avatar placeholder */}
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user?.email?.split('@')[0]?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
        </View>

        {/* Role description */}
        <Text style={styles.roleText}>
          Bạn đang sử dụng hệ thống dưới tư cách{' '}
          <Text style={styles.roleHighlight}>
            {user?.role === 'service-user' ? 'cư dân' : 'nhân viên'}
          </Text>
        </Text>

        {/* Action cards */}
        <View style={styles.actionsContainer}>
          <AppCard style={styles.actionCard}>
            <AppButton
              variant="primary"
              onPress={() => router.push('/(resident)/create-feedback')}
              style={styles.actionButton}
            >
              Tạo phản ánh mới
            </AppButton>
          </AppCard>

          <AppCard style={styles.actionCard}>
            <AppButton
              variant="outline"
              onPress={() => {
                // Placeholder for feedback list
                console.log('Danh sách phản ánh pressed');
              }}
              style={styles.actionButton}
            >
              Danh sách phản ánh
            </AppButton>
          </AppCard>

          {/* Additional cards can be added here */}
          <AppCard style={styles.actionCard}>
            <AppButton
              variant="outline"
              onPress={() => {
                // Placeholder for notifications
                console.log('Thông báo pressed');
              }}
              style={styles.actionButton}
            >
              Thông báo
            </AppButton>
          </AppCard>
        </View>

        {/* Footer with logout */}
        <View style={styles.footer}>
          <AppButton
            variant="text"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Đăng xuất
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  userInfo: {
  },
  welcome: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  roleText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 32,
    textAlign: 'center',
  },
  roleHighlight: {
    fontWeight: '600',
    color: colors.text,
  },
  actionsContainer: {
    gap: 16,
  },
  actionCard: {
  },
  actionButton: {
    width: '100%',
    paddingVertical: 16,
  },
  footer: {
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoutButton: {
  },
});