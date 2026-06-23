import { setApiBaseUrl, setTokenStorage } from '@urbanmind/shared-api';
import { AsyncStorageService } from '@/services/storage/asyncStorage';

let isInitialized = false;

export const initApi = () => {
  if (isInitialized) return;

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    setApiBaseUrl(apiUrl);
    console.log('[API Init] Base URL set to:', apiUrl);
  } else {
    console.warn('[API Init] EXPO_PUBLIC_API_URL is not defined');
  }

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

  isInitialized = true;
};