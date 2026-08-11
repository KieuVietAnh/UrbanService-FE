import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { APP_ROLES } from '@urbanmind/shared-types';

/**
 * Main Entry Navigation Router
 * Evaluates session state and dispatches the initial route.
 */
export default function Index() {
  const user = useAuthStore((s) => s.user);

  // 1. Unauthenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // 2. Unsupported Role Guard (Staff, Admin, Provider)
  if (user.role && user.role !== APP_ROLES.SERVICE_USER) {
    return <Redirect href="/unsupported-role" />;
  }

  // 3. Unverified User -> OTP Verification Redirect
  if (user.isVerified === false) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  // 4. Authenticated Service User -> Resident Portal Home
  return <Redirect href="/(resident)" />;
}