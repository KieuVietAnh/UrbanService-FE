import { useCallback } from 'react';
import { AsyncStorageService } from '@/services/storage/asyncStorage';

export const useAsyncStorage = () => {
  const getItem = useCallback(async <T>(key: string): Promise<T | null> => {
    return AsyncStorageService.getItem<T>(key);
  }, []);

  const setItem = useCallback(async <T>(key: string, value: T): Promise<void> => {
    await AsyncStorageService.setItem(key, value);
  }, []);

  const removeItem = useCallback(async (key: string): Promise<void> => {
    await AsyncStorageService.removeItem(key);
  }, []);

  const clear = useCallback(async (): Promise<void> => {
    await AsyncStorageService.clear();
  }, []);

  return { getItem, setItem, removeItem, clear };
};