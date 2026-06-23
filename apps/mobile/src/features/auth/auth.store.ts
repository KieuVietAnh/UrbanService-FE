import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AsyncStorageService } from '@/services/storage/asyncStorage';
import { AuthService } from '@/features/auth/auth.service';
import { User } from '@/types/auth.types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  error: string | null;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,
        error: null,
        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            // TODO: Replace with real API call
            const user = await AuthService.login(email, password);
            set({ user, isLoading: false });
          } catch (err: any) {
            set({ error: err.message, isLoading: false });
          }
        },
        logout: () => {
          set({ user: null });
        },
        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'auth-storage',
        storage: {
          getItem: (key) =>
            AsyncStorageService.getItem<string>(key).then((value) => (value ? JSON.parse(value) : null)),
          setItem: (key, value) =>
            AsyncStorageService.setItem<string>(key, JSON.stringify(value)),
          removeItem: (key) => AsyncStorageService.removeItem(key),
        },
      }
    )
  )
);