import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { notificationApi } from '../services/api/notificationApi';
import { signalrService } from '../services/socket/signalrService';

const CACHE_TTL = 60_000;
const stores = new Map();

const createStore = () => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  initialized: false,
  error: '',
  lastFetchedAt: 0,
  listeners: new Set(),
  request: null,
  snapshot: null,
});

const getStore = (userId) => {
  const key = userId || '__anonymous__';
  if (!stores.has(key)) stores.set(key, createStore());
  return stores.get(key);
};

const emit = (store) => {
  store.snapshot = {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    loading: store.loading,
    initialized: store.initialized,
    error: store.error,
  };
  store.listeners.forEach((listener) => listener());
};

const applyItems = (store, response) => {
  const items = Array.isArray(response?.items) ? response.items : [];
  store.notifications = items;
  store.unreadCount = items.filter((item) => item?.isRead === false).length;
  store.initialized = true;
  store.lastFetchedAt = Date.now();
};

const fetchNotifications = async (userId, options = {}, { force = false } = {}) => {
  const store = getStore(userId);
  if (!userId) {
    store.notifications = [];
    store.unreadCount = 0;
    store.initialized = true;
    store.loading = false;
    store.error = '';
    emit(store);
    return null;
  }

  const isDefaultRequest = !options.pageNumber && !options.pageSize && options.isRead === undefined;
  const isFresh = store.initialized && Date.now() - store.lastFetchedAt < CACHE_TTL;
  if (!force && isDefaultRequest && isFresh) return { items: store.notifications };
  if (store.request) return store.request;

  store.loading = !store.initialized;
  store.error = '';
  emit(store);

  store.request = notificationApi
    .getNotifications(options.pageNumber ?? 1, options.pageSize ?? 50, options.isRead)
    .then((response) => {
      applyItems(store, response);
      return response;
    })
    .catch((error) => {
      store.error = error?.message || 'Không thể tải thông báo.';
      throw error;
    })
    .finally(() => {
      store.loading = false;
      store.request = null;
      emit(store);
    });

  return store.request;
};

export function useNotifications(userId) {
  const store = getStore(userId);
  if (!store.snapshot) emit(store);

  const state = useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    () => store.snapshot,
    () => store.snapshot
  );

  const loadNotifications = useCallback(
    (options = {}) => fetchNotifications(userId, options, { force: true }),
    [userId]
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!userId || !notificationId) return;

      const currentStore = getStore(userId);
      const target = currentStore.notifications.find(
        (item) => item?.notificationId === notificationId
      );

      if (target?.isRead === false) {
        currentStore.notifications = currentStore.notifications.map((item) => (
          item?.notificationId === notificationId
            ? { ...item, isRead: true }
            : item
        ));
        currentStore.unreadCount = Math.max(0, currentStore.unreadCount - 1);
        emit(currentStore);
      }

      try {
        await notificationApi.markNotificationAsRead(notificationId);
      } catch (error) {
        currentStore.error = error?.message || 'Không thể đánh dấu thông báo đã đọc.';
        await fetchNotifications(userId, {}, { force: true });
      }
    },
    [userId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const currentStore = getStore(userId);
    if (currentStore.unreadCount === 0) return;

    const previousItems = currentStore.notifications;
    const previousUnreadCount = currentStore.unreadCount;

    currentStore.notifications = currentStore.notifications.map((item) => ({
      ...item,
      isRead: true,
    }));
    currentStore.unreadCount = 0;
    emit(currentStore);

    try {
      await notificationApi.markAllNotificationsAsRead();
    } catch (error) {
      currentStore.notifications = previousItems;
      currentStore.unreadCount = previousUnreadCount;
      currentStore.error = error?.message || 'Không thể đánh dấu tất cả đã đọc.';
      emit(currentStore);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications(userId).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;

    signalrService.start();
    const handleNotification = () => {
      fetchNotifications(userId, {}, { force: true }).catch(() => {});
    };

    signalrService.on('NotificationReceived', handleNotification);
    return () => signalrService.off('NotificationReceived', handleNotification);
  }, [userId]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    initialized: state.initialized,
    error: state.error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}

export default useNotifications;
