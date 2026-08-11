import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AsyncStorageService } from '@/services/storage/asyncStorage';
import { AuthService } from '@/features/auth/auth.service';
import { User } from '@/types/auth.types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

interface RegisterData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const user = await AuthService.login(email, password);
            set({ user, isLoading: false });
          } catch (err: any) {
            set({ error: err.message ?? 'Đăng nhập thất bại', isLoading: false });
            throw err;
          }
        },

        register: async (data: RegisterData) => {
          set({ isLoading: true, error: null });
          try {
            await AuthService.register(data);
            set({ isLoading: false });
          } catch (err: any) {
            set({ error: err.message ?? 'Đăng ký thất bại', isLoading: false });
            throw err;
          }
        },

        sendOtp: async (phone: string) => {
          set({ isLoading: true, error: null });
          try {
            await AuthService.sendOtp(phone);
            set({ isLoading: false });
          } catch (err: any) {
            set({ error: err.message ?? 'Gửi OTP thất bại', isLoading: false });
            throw err;
          }
        },

        verifyOtp: async (phone: string, otp: string) => {
          set({ isLoading: true, error: null });
          try {
            const user = await AuthService.verifyOtp(phone, otp);
            set({ user, isLoading: false });
          } catch (err: any) {
            set({ error: err.message ?? 'Mã OTP không chính xác', isLoading: false });
            throw err;
          }
        },

        logout: async () => {
          try {
            await AuthService.logout();
          } catch { /* silent */ }
          set({ user: null, error: null });
        },

        clearError: () => set({ error: null }),

        setUser: (user: User) => set({ user }),
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