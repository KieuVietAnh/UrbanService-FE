import { authApi } from '@urbanmind/shared-api';
import { setTokenStorage, setAuthToken, setApiBaseUrl } from '@urbanmind/shared-api';
import { AsyncStorageService } from '@/services/storage/asyncStorage';
import { User } from '@/types/auth.types';

let isInitialized = false;

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    if (!isInitialized) {
      // Configure API base URL from environment (Expo injects variables into process.env)
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (apiUrl) {
        setApiBaseUrl(apiUrl);
      }
      // Override token storage to use AsyncStorage for React Native
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
      isInitialized = true;
    }

    const response = await authApi.login(email, password);
    // Handle both cases: if interceptor returns data directly or if it returns AxiosResponse
    const data = 'data' in response ? response.data : response;
    const { token, userId, email: emailValue, fullName, role: rawRole, isVerified } = data;

    // Normalize role: map backend roles to mobile expected roles
    const normalizeRole = (role: string): 'service-user' | 'system-staff' => {
      if (!role) return 'service-user'; // fallback
      const lower = role.trim().toLowerCase();
      if (lower.startsWith('service')) return 'service-user';
      if (lower.startsWith('system')) return 'system-staff';
      // fallback to service-user if unknown
      return 'service-user';
    };
    const normalizedRole = normalizeRole(rawRole);

    // Build user object matching Mobile User shape, but keep extra fields for persistence
    const userObj: User & { fullName?: string; isVerified?: boolean } = {
      id: userId,
      email: emailValue,
      role: normalizedRole,
      token,
      // extra fields (not part of User type but stored)
      fullName,
      isVerified,
    };

    // Save token for axios interceptor
    await setAuthToken(token);
    return userObj as User;
  }

  // TODO: Add other auth methods like register, logout, etc.
}