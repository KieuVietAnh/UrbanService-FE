import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../contexts/AuthContext';

const formatRelativeTime = (value) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa xong';

    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  } catch (e) {
    void e;
    return 'Vừa xong';
  }
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
    loadNotifications,
  } = useNotifications(user?.userId);

  const visibleNotifications = useMemo(
    () => (Array.isArray(notifications) ? notifications.slice(0, 6) : []),
    [notifications]
  );

  const handleNotificationClick = async (notification) => {
    if (!notification) return;
    try {
      await markAsRead(notification.notificationId);
    } catch (err) {
      console.warn('NotificationBell markAsRead failed', err);
    }

    if (notification?.targetUrl) {
      navigate(notification.targetUrl);
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle relative">
        <div className="indicator">
          <Lucide.Bell size={20} />
          {unreadCount > 0 && (
            <span className="badge badge-xs badge-error indicator-item font-extrabold text-[8px] p-1">
              {unreadCount}
            </span>
          )}
        </div>
      </label>
      <div tabIndex={0} className="dropdown-content card card-compact w-96 shadow bg-base-100 border border-base-300 mt-2 z-50">
        <div className="card-body p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
            <div>
              <h3 className="font-bold text-sm">Thông Báo</h3>
              <p className="text-[10px] text-gray-500">{unreadCount} chưa đọc</p>
            </div>
            <button
              onClick={markAllAsRead}
              disabled={loading || unreadCount === 0}
              className="text-xs text-primary font-semibold hover:underline disabled:text-gray-400"
            >
              Đánh dấu tất cả
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-base-300">
            {loading ? (
              <div className="px-4 py-6 text-center text-gray-500 text-xs">Đang tải thông báo...</div>
            ) : notificationsError ? (
              <div className="px-4 py-6 text-center text-error text-xs">{notificationsError}</div>
            ) : visibleNotifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-xs">Không có thông báo mới</div>
            ) : (
              visibleNotifications.map((notification) => {
                const isUnread = notification?.isRead === false;
                return (
                  <button
                    type="button"
                    key={notification?.notificationId ?? `${notification?.title}-${notification?.createdAt}`}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3 flex gap-3 items-start transition-colors ${
                      isUnread ? 'bg-primary/5' : 'hover:bg-base-200'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-base-300 text-primary shrink-0">
                      <Lucide.AlertCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs truncate ${isUnread ? 'font-bold' : 'text-slate-700'}`}>
                          {notification?.title || 'Thông báo mới'}
                        </h4>
                        <span className="text-[9px] text-gray-400">{formatRelativeTime(notification?.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                        {notification?.message || 'Không có nội dung thông báo'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {Array.isArray(notifications) && notifications.length > visibleNotifications.length && (
            <button
              type="button"
              onClick={() => loadNotifications({ pageNumber: 1, pageSize: 20 })}
              className="w-full py-2 text-xs font-semibold text-primary hover:bg-base-200"
            >
              Xem thêm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;
