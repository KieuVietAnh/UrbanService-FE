import {
  authApi,
  setAuthToken,
  setAuthRefreshToken,
  clearAuthTokens,
} from '@urbanmind/shared-api';
import { getInternalRole } from '@urbanmind/shared-types';
import type { User } from '@/types';

type ApiRecord = Record<string, unknown>;

const isApiRecord = (value: unknown): value is ApiRecord =>
  typeof value === 'object' && value !== null;

const extractData = (response: unknown): unknown => {
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

  if (isApiRecord(response)) {
    if (isApiRecord(response.data)) {
      return response.data;
    }
    return response;
  }

  return response;
};

const buildUser = (rawResponse: unknown): User => {
  const extracted = extractData(rawResponse);
  const data = isApiRecord(extracted) ? extracted : {};
  const userPayload = isApiRecord(data.user) ? data.user : data;
  const token =
    data.token ||
    data.accessToken ||
    data.authToken ||
    data.access_token ||
    userPayload.token ||
    userPayload.accessToken ||
    userPayload.authToken ||
    userPayload.access_token;

  return {
    id: (userPayload.userId ?? userPayload.id ?? data.userId ?? data.id ?? '') as string,
    email: (userPayload.email ?? data.email ?? '') as string,
    role: getInternalRole((userPayload.role ?? data.role ?? 'service-user') as string),
    token: (token || '') as string,
    fullName: (userPayload.fullName ?? data.fullName ?? '') as string,
    isVerified: Boolean(userPayload.isVerified ?? data.isVerified ?? false),
    phone: (userPayload.phone ?? data.phone ?? '') as string,
    avatarUrl: (userPayload.avatarUrl ?? data.avatarUrl ?? null) as string | null,
  };
};

const extractRefreshToken = (response: unknown): string | null => {
  if (typeof response === 'string') {
    try {
      response = JSON.parse(response);
    } catch {
      return null;
    }
  }

  const data = isApiRecord(response)
    ? (isApiRecord(response.data) ? response.data : response)
    : {};

  return (data.refreshToken || data.refresh_token || null) as string | null;
};

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    const response = await authApi.login(email, password);
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

  static async verifyOtp(otp: string): Promise<void> {
    // Swagger returns 204 No Content. The authenticated user and tokens must
    // remain the ones established by login/registration.
    await authApi.verifyOtp(otp);
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
