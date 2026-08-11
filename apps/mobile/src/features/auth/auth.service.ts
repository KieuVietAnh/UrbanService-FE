import {
  authApi,
  setAuthToken,
  setAuthRefreshToken,
  clearAuthTokens,
} from '@urbanmind/shared-api';
import { getInternalRole } from '@urbanmind/shared-types';
import { User } from '@/types/auth.types';

const extractData = (response: any) => {
  if (typeof response === 'string') {
    if (response.includes('<!DOCTYPE html>') || response.includes('<html')) {
      throw new Error('Không thể kết nối đến máy chủ API (phản hồi trang HTML 404/500). Vui lòng kiểm tra cấu hình EXPO_PUBLIC_API_URL.');
    }
    try {
      return JSON.parse(response);
    } catch {
      throw new Error('Máy chủ phản hồi định dạng dữ liệu không hợp lệ.');
    }
  }

  if (response && typeof response === 'object') {
    if ('data' in response && response.data && typeof response.data === 'object') {
      return response.data;
    }
    return response;
  }

  return response;
};

const buildUser = (rawResponse: any): User => {
  const data = extractData(rawResponse);
  const userPayload = data.user || data;
  const token =
    data.token ||
    data.accessToken ||
    data.authToken ||
    data.access_token ||
    (userPayload && (userPayload.token || userPayload.accessToken || userPayload.authToken || userPayload.access_token));

  return {
    id: userPayload.userId ?? userPayload.id ?? data.userId ?? data.id ?? '',
    email: userPayload.email ?? data.email ?? '',
    role: getInternalRole(userPayload.role ?? data.role ?? 'service-user'),
    token: token || '',
    fullName: userPayload.fullName ?? data.fullName ?? '',
    isVerified: Boolean(userPayload.isVerified ?? data.isVerified ?? false),
    phone: userPayload.phone ?? data.phone ?? '',
    avatarUrl: userPayload.avatarUrl ?? data.avatarUrl ?? null,
  };
};

const extractRefreshToken = (response: any) => {
  if (typeof response === 'string') {
    try {
      response = JSON.parse(response);
    } catch {
      return null;
    }
  }

  const data = response && typeof response === 'object'
    ? (response.data && typeof response.data === 'object' ? response.data : response)
    : {};

  return data.refreshToken || data.refresh_token || null;
};

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    console.log('[AuthService login] before authApi.login', { email });
    const response = await authApi.login(email, password);
    console.log('[AuthService login] authApi.login resolved', { responseType: typeof response, hasData: !!response });
    const user = buildUser(response);
    const refreshToken = extractRefreshToken(response);

    if (user.token) {
      console.log('[AuthService login] saving auth token');
      await setAuthToken(user.token);
      console.log('[AuthService login] auth token saved');
    }

    if (refreshToken) {
      console.log('[AuthService login] saving refresh token');
      await setAuthRefreshToken(refreshToken);
      console.log('[AuthService login] refresh token saved');
    }

    return user;
  }

  static async register(payload: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
  }): Promise<User> {
    const response = await authApi.register(
      payload.fullName.trim(),
      payload.email.trim(),
      payload.password,
      payload.phone.trim()
    );
    const user = buildUser(response);
    const refreshToken = extractRefreshToken(response);

    if (user.token) {
      await setAuthToken(user.token);
    }

    if (refreshToken) {
      await setAuthRefreshToken(refreshToken);
    }

    return user;
  }

  static async googleLogin(idToken: string): Promise<User> {
    const response = await authApi.googleLogin(idToken);
    const user = buildUser(response);
    const refreshToken = extractRefreshToken(response);

    if (user.token) {
      await setAuthToken(user.token);
    }

    if (refreshToken) {
      await setAuthRefreshToken(refreshToken);
    }

    return user;
  }

  static async sendOtp(): Promise<void> {
    const response = await authApi.sendOtp();
    extractData(response);
  }

  static async verifyOtp(otp: string): Promise<User> {
    const response = await authApi.verifyOtp(otp);
    const user = buildUser(response);
    const refreshToken = extractRefreshToken(response);

    if (user.token) {
      await setAuthToken(user.token);
    }

    if (refreshToken) {
      await setAuthRefreshToken(refreshToken);
    }

    return user;
  }

  static async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      /* silent */
    }

    await clearAuthTokens();
  }
}
