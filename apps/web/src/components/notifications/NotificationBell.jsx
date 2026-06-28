import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../contexts/AuthContext';

const notificationTypeConfig = {
  assignment: { label: 'Phân công', icon: Lucide.UserCheck, tone: 'error' },
  alert: { label: 'Cảnh báo', icon: Lucide.AlertTriangle, tone: 'warning' },
  update: { label: 'Cập nhật', icon: Lucide.RefreshCcw, tone: 'info' },
  reminder: { label: 'Nhắc nhở', icon: Lucide.Clock, tone: 'accent' },
  default: { label: 'Thông báo', icon: Lucide.Bell, tone: 'secondary' },
};

const getNotificationType = (type) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('assign')) return 'assignment';
  if (normalized.includes('alert') || normalized.includes('warning')) return 'alert';
  if (normalized.includes('update') || normalized.includes('status')) return 'update';
  if (normalized.includes('remind')) return 'reminder';
  return 'default';
};

const toneClassMap = {
  error: 'bg-error/10 text-error',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  accent: 'bg-accent/10 text-accent',
  secondary: 'bg-secondary/10 text-secondary',
};

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
  } catch {
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
  } = useNotifications(user?.userId);

  const visibleNotifications = useMemo(
    () => (Array.isArray(notifications) ? notifications.slice(0, 5) : []),
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
      <button aria-label="Thông báo" title="Thông báo" tabIndex={0} className="btn btn-ghost btn-circle relative transition duration-200 ease-out hover:bg-base-200">
        <div className="indicator">
          <Lucide.Bell size={20} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="badge badge-xs badge-error indicator-item font-extrabold text-[8px] p-1" aria-hidden>
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      <div tabIndex={0} className="dropdown-content card card-compact w-96 shadow bg-base-100 border border-base-300 mt-2 z-50 transition-opacity duration-200 ease-out opacity-100">
        <div className="card-body p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
            <div>
              <h3 className="font-bold text-sm">Thông Báo</h3>
              <p className="text-[10px] text-gray-500">{unreadCount} chưa đọc · {Array.isArray(notifications) ? notifications.length : 0} tổng</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                disabled={loading || unreadCount === 0}
                className="text-xs text-primary font-semibold hover:underline disabled:text-gray-400"
              >
                Đánh dấu tất cả
              </button>
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="btn btn-xs btn-outline rounded-full"
              >
                Xem tất cả
              </button>
            </div>
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
                const typeKey = getNotificationType(notification?.type);
                const typeData = notificationTypeConfig[typeKey] || notificationTypeConfig.default;
                const toneClasses = toneClassMap[typeData.tone] || toneClassMap.secondary;

                return (
                  <button
                    type="button"
                    key={notification?.notificationId ?? `${notification?.title}-${notification?.createdAt}`}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3 flex gap-3 items-start rounded-3xl transition duration-200 ease-out ${
                      notification?.isRead === false ? 'bg-primary/5 shadow-sm' : 'hover:bg-base-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${toneClasses}`}>
                      <typeData.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs truncate ${notification?.isRead === false ? 'font-bold' : 'text-slate-700'}`}>
                          {notification?.title || 'Thông báo mới'}
                        </h4>
                        <span className="text-[9px] text-gray-400">{formatRelativeTime(notification?.createdAt)}</span>
                      </div>
                      <div className="mt-1 flex items-center flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1">{typeData.label}</span>
                        {notification?.isRead === false && (
                          <span className="rounded-full bg-primary px-2 py-1 text-primary-content">Mới</span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-gray-500 line-clamp-2">
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
              onClick={() => navigate('/notifications')}
              className="w-full py-3 text-xs font-semibold text-primary hover:bg-base-200"
            >
              Xem tất cả thông báo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;
