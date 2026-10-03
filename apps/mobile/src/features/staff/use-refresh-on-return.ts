import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * React Query already starts the first request when a screen mounts. Refreshing
 * again on the first focus doubles that request and can trip the API rate limit.
 * Only refresh after the user actually leaves the screen and comes back.
 */
export function useRefreshOnReturn(refresh: () => void | Promise<unknown>) {
  const hasFocused = useRef(false);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useFocusEffect(useCallback(() => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      return;
    }

    void refreshRef.current();
  }, []));
}
