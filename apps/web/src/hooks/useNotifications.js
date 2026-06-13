import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../services/api/notificationApi';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateState = useCallback((response) => {
    const items = Array.isArray(response?.items) ? response.items : [];
    setNotifications(items);
    setUnreadCount(items.filter((item) => !item.isRead).length);
  }, []);

  const loadNotifications = useCallback(
    async ({ pageNumber = 1, pageSize = 10, isRead } = {}) => {
      if (!userId) {
        setNotifications([]);
        setUnreadCount(0);
        return null;
      }

      setLoading(true);
      setError('');

      try {
        const response = await notificationApi.getNotifications(pageNumber, pageSize, isRead);
        updateState(response);
        return response;
      } catch (err) {
        const message = err?.message || 'Unable to load notifications.';
        setError(message);
        setNotifications([]);
        setUnreadCount(0);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId, updateState]
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      setError('');
      try {
        await notificationApi.markNotificationAsRead(notificationId);
        await loadNotifications();
      } catch (err) {
        setError(err?.message || 'Unable to mark notification as read.');
      }
    },
    [loadNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    setError('');
    try {
      await notificationApi.markAllNotificationsAsRead();
      await loadNotifications();
    } catch (err) {
      setError(err?.message || 'Unable to mark all notifications as read.');
    }
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;
    loadNotifications();
  }, [userId, loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}

export default useNotifications;
