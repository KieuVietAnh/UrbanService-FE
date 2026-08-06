import { Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';

export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(resident)" />;
}