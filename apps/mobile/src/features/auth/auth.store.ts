import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AsyncStorageService } from '@/services/storage/asyncStorage';
import { AuthService } from '@/features/auth/auth.service';
import { User } from '@/types/auth.types';
import { extractApiErrorMessage } from '@urbanmind/shared-api';

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  sendOtp: () => Promise<void>;
  verifyOtp: (otp: string) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

const withRequestTimeout = <T>(request: Promise<T>, timeoutMs = 60000): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error(`timeout of ${timeoutMs}ms exceeded`);
      (timeoutError as Error & { code?: string }).code = 'ECONNABORTED';
      console.warn('[Auth request timeout]', { timeoutMs, message: timeoutError.message });
      reject(timeoutError);
    }, timeoutMs);
  });

  return Promise.race([
    request.then(
      (value) => {
        if (timeoutId) clearTimeout(timeoutId);
        return value;
      },
      (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        throw error;
      },
    ),
    timeoutPromise,
  ]);
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          console.log('[Auth login] start', { email });
          set({ isLoading: true, error: null });
          try {
            console.log('[Auth login] invoking AuthService.login');
            const user = await withRequestTimeout(AuthService.login(email, password));
            console.log('[Auth login] completed', { userId: user?.id, email: user?.email, role: user?.role });
            set({ user, isLoading: false });
            return user;
          } catch (err: any) {
            const msg = extractApiErrorMessage(err, 'Đăng nhập thất bại');
            console.error('[Auth login failed]', {
              code: err?.code || null,
              message: err?.message || null,
              status: err?.status || null,
              response: err?.response || null,
              stack: err?.stack || null,
            });
            set({ error: msg, isLoading: false });
            throw new Error(msg);
          } finally {
            set({ isLoading: false });
          }
        },

        register: async (data: RegisterData) => {
          set({ isLoading: true, error: null });
          try {
            const user = await withRequestTimeout(AuthService.register(data));
            set({ user, isLoading: false });
            return user;
          } catch (err: any) {
            const msg = extractApiErrorMessage(err, 'Đăng ký thất bại');
            set({ error: msg, isLoading: false });
            throw new Error(msg);
          } finally {
            set({ isLoading: false });
          }
        },

        sendOtp: async () => {
          set({ isLoading: true, error: null });
          try {
            await withRequestTimeout(AuthService.sendOtp());
            set({ isLoading: false });
          } catch (err: any) {
            const msg = extractApiErrorMessage(err, 'Gửi mã OTP thất bại');
            set({ error: msg, isLoading: false });
            throw new Error(msg);
          } finally {
            set({ isLoading: false });
          }
        },

        verifyOtp: async (otp: string) => {
          set({ isLoading: true, error: null });
          try {
            const user = await withRequestTimeout(AuthService.verifyOtp(otp));
            // Merge verified status
            const updatedUser = { ...user, isVerified: true };
            set({ user: updatedUser, isLoading: false });
            return updatedUser;
          } catch (err: any) {
            const msg = extractApiErrorMessage(err, 'Mã OTP không chính xác');
            set({ error: msg, isLoading: false });
            throw new Error(msg);
          } finally {
            set({ isLoading: false });
          }
        },

        logout: async () => {
          try {
            await AuthService.logout();
          } catch {
            /* silent */
          }
          set({ user: null, error: null });
        },

        clearError: () => set({ error: null }),

        setUser: (user: User | null) => set({ user }),
      }),
      {
        name: 'urbanmind-auth',
        storage: {
          getItem: (key) =>
            AsyncStorageService.getItem<string>(key).then((v) => (v ? JSON.parse(v) : null)),
          setItem: (key, value) =>
            AsyncStorageService.setItem<string>(key, JSON.stringify(value)),
          removeItem: (key) => AsyncStorageService.removeItem(key),
        },
        partialize: (state) => ({ user: state.user }) as AuthState,
      }
    )
  )
);