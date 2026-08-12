import Constants from 'expo-constants';
import {
  setApiBaseUrl,
  setTokenStorage,
  setRefreshTokenStorage,
} from '@urbanmind/shared-api';
import { AsyncStorageService } from '@/services/storage/asyncStorage';

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
  console.log('[API Init] Base URL set to:', apiUrl);

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
  console.log('[API Init] Token storage configured with AsyncStorage');

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
  console.log('[API Init] Refresh token storage configured with AsyncStorage');

  isInitialized = true;
};