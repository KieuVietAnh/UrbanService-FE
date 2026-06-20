import { Redirect } from 'expo-router';
import { AppLoading } from '@/components/ui/AppLoading';
import { useAuthStore } from '@/features/auth/auth.store';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <AppLoading message="Đang khởi tạo..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'service-user') {
    return <Redirect href="/(resident)" />;
  }

  if (user.role === 'system-staff') {
    return <Redirect href="/(staff)" />;
  }

  return <Redirect href="/(auth)/login" />;
}