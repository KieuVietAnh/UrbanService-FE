import { View, Text, StyleSheet } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';

export default function ResidentHomeScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const isResident = user?.role === 'service-user';
  const isStaff = user?.role === 'system-staff';

  const handleLogout = () => {
    logout();
    router.replace('(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resident Home</Text>
      {user && (
        <Text style={styles.subtitle}>
          Welcome, {user.email}!{'\n'}
          Role: {isResident ? 'Resident' : isStaff ? 'Staff' : 'Unknown'}
        </Text>
      )}
      <AppButton onPress={handleLogout}>Logout</AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});