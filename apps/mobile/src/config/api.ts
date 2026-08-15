import Constants from 'expo-constants';
import {
  setApiBaseUrl,
  setUnauthorizedHandler,
  setTokenStorage,
  setRefreshTokenStorage,
} from '@urbanmind/shared-api';
import { AsyncStorageService } from '@/services/storage/asyncStorage';
import { queryClient } from '@/config/query-client';
import { useAuthStore } from '@/features/auth/auth.store';

let isInitialized = false;

// Shared Backend Target API URL (matching web app target https://api.urbanservice.me)
export const DEFAULT_API_URL = 'https://api.urbanservice.me';

export const getEffectiveApiUrl = () => {
  const configuredTargetUrl = String(
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    ''
  ).trim();
  return configuredTargetUrl || DEFAULT_API_URL;
};

export const initApi = () => {
  if (isInitialized) return;

  const apiUrl = getEffectiveApiUrl();
  setApiBaseUrl(apiUrl);

  setTokenStorage(
    async () => {
      return await AsyncStorageService.getItem<string>('urbanmind_auth_token');
    },
    async (token: string) => {
      await AsyncStorageService.setItem('urbanmind_auth_token', token);
    },
    async () => {
      await AsyncStorageService.removeItem('urbanmind_auth_token');
    }
  );

  setRefreshTokenStorage(
    async () => {
      return await AsyncStorageService.getItem<string>('urbanmind_refresh_token');
    },
    async (token: string) => {
      await AsyncStorageService.setItem('urbanmind_refresh_token', token);
    },
    async () => {
      await AsyncStorageService.removeItem('urbanmind_refresh_token');
    }
  );

  setUnauthorizedHandler(async () => {
    queryClient.clear();
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().clearError();
  });

  isInitialized = true;
};
