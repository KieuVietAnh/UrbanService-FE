import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';

// Staff home — Phase 2. Currently shows a placeholder.
export default function StaffHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff — Phase 2</Text>
      {user && (
        <Text style={styles.subtitle}>
          {user.email}{'\n'}Role: {user.role}
        </Text>
      )}
      <Text style={styles.link} onPress={handleLogout}>Đăng xuất</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Geist-Bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  link: {
    fontSize: 15,
    fontFamily: 'Geist-SemiBold',
    color: '#0052CC',
    marginTop: 8,
  },
});