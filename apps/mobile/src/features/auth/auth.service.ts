import { authApi, setAuthToken } from '@urbanmind/shared-api';
import { User } from '@/types/auth.types';

const normalizeRole = (role: string): 'service-user' | 'system-staff' => {
  if (!role) return 'service-user';
  const lower = role.trim().toLowerCase();
  if (lower.startsWith('service')) return 'service-user';
  if (lower.startsWith('system')) return 'system-staff';
  return 'service-user';
};

const buildUser = (data: any): User => ({
  id: data.userId ?? data.id,
  email: data.email ?? '',
  role: normalizeRole(data.role),
  token: data.token,
  fullName: data.fullName ?? '',
  isVerified: data.isVerified ?? false,
  phone: data.phone ?? '',
  avatarUrl: data.avatarUrl ?? null,
});

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    const response = await authApi.login(email, password);
    const data = 'data' in response ? response.data : response;
    const user = buildUser(data);
    await setAuthToken(data.token);
    return user;
  }

  static async register(payload: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<void> {
    await authApi.register(payload);
  }

  static async sendOtp(phone: string): Promise<void> {
    await (authApi as any).sendOtp?.(phone);
  }

  static async verifyOtp(phone: string, otp: string): Promise<User> {
    const response = await authApi.verifyOtp?.({ phone, otp });
    const data = 'data' in response ? response.data : response;
    const user = buildUser(data);
    await setAuthToken(data.token);
    return user;
  }

  static async logout(): Promise<void> {
    try {
      await authApi.logout?.();
    } catch { /* silent */ }
    await setAuthToken('');
  }
}