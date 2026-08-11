import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { APP_ROLES } from '@urbanmind/shared-types';

/**
 * Service User Auth & Role Navigation Guard Hook
 * Enforces:
 * 1. Auth Redirect Flow: Unauthenticated users -> /(auth)/login
 * 2. OTP Redirect Flow: Unverified users (isVerified === false) -> /(auth)/verify-email
 * 3. Service User Role Guard: Non-service-user roles -> /unsupported-role
 * 4. Authenticated & Verified Service User -> /(resident)
 */
export function useAuthGuard() {
  const user = useAuthStore((s) => s.user);
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    const currentGroup = segments[0];
    const currentScreen = segments[1];

    const inAuthGroup = currentGroup === '(auth)';
    const inResidentGroup = currentGroup === '(resident)';
    const inUnsupportedRole = currentGroup === 'unsupported-role';

    // State 1: Unauthenticated
    if (!user) {
      if (inResidentGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // State 2: Unsupported Role Guard (Staff, Admin, Provider, Manager)
    if (user.role && user.role !== APP_ROLES.SERVICE_USER) {
      if (!inUnsupportedRole) {
        router.replace('/unsupported-role');
      }
      return;
    }

    // State 3: Unverified User -> OTP Verification Redirect
    if (user.isVerified === false) {
      if (currentScreen !== 'verify-email' && currentScreen !== 'otp') {
        router.replace('/(auth)/verify-email');
      }
      return;
    }

    // State 4: Fully Authenticated & Verified Service User on Auth/Unsupported screens
    if (inAuthGroup || inUnsupportedRole) {
      router.replace('/(resident)');
    }
  }, [user, segments]);
}
