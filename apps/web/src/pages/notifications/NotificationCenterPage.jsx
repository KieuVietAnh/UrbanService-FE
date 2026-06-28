import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

const notificationTypeConfig = {
  assignment: {
    label: 'Phân công',
    badge: 'Cao',
    tone: 'error',
    icon: Lucide.UserCheck,
  },
  alert: {
    label: 'Cảnh báo',
    badge: 'Nguy cấp',
    tone: 'warning',
    icon: Lucide.AlertTriangle,
  },
  update: {
    label: 'Cập nhật',
    badge: 'Thông tin',
    tone: 'info',
    icon: Lucide.RefreshCcw,
  },
  reminder: {
    label: 'Nhắc nhở',
    badge: 'Trung bình',
    tone: 'accent',
    icon: Lucide.Clock,
  },
  default: {
    label: 'Thông báo',
    badge: 'Thông tin',
    tone: 'secondary',
    icon: Lucide.Bell,
  },
};

const filters = [
  { id: 'all', label: 'Tất cả', icon: Lucide.ListChecks },
  { id: 'unread', label: 'Chưa đọc', icon: Lucide.Mail },
  { id: 'assignment', label: 'Phân công', icon: Lucide.UserCheck },
  { id: 'alert', label: 'Cảnh báo', icon: Lucide.AlertTriangle },
  { id: 'update', label: 'Cập nhật', icon: Lucide.RefreshCcw },
];

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

const getNotificationType = (type) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('assign')) return 'assignment';
  if (normalized.includes('alert') || normalized.includes('warning')) return 'alert';
  if (normalized.includes('update') || normalized.includes('status')) return 'update';
  if (normalized.includes('remind')) return 'reminder';
  return 'default';
};

const getSectionLabel = (date) => {
  if (!date) return 'Trước đó';
  const now = new Date();
  const target = new Date(date);
  const diff = Math.floor((now - target) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return 'Trước đó';
};

const groupByDate = (items) => {
  const groups = {};

  items.forEach((item) => {
    const label = getSectionLabel(item?.createdAt);
    groups[label] = groups[label] || [];
    groups[label].push(item);
  });

  return Object.entries(groups).map(([label, values]) => ({ label, values }));
};

export const NotificationCenterPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications(user?.userId);

  useEffect(() => {
    if (!user?.userId) return;
    loadNotifications({ pageNumber: 1, pageSize: 50 });
  }, [user?.userId, loadNotifications]);

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];

    return notifications
      .filter((notification) => {
        if (activeFilter === 'unread') return notification?.isRead === false;
        if (activeFilter === 'assignment') return getNotificationType(notification?.type) === 'assignment';
        if (activeFilter === 'alert') return getNotificationType(notification?.type) === 'alert';
        if (activeFilter === 'update') return getNotificationType(notification?.type) === 'update';
        return true;
      })
      .filter((notification) => {
        if (!searchQuery.trim()) return true;
        const term = searchQuery.trim().toLowerCase();
        return [notification?.title, notification?.message, notification?.type]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, activeFilter, searchQuery]);

  const groupedNotifications = useMemo(
    () => groupByDate(filteredNotifications),
    [filteredNotifications]
  );

  const summaryCounts = useMemo(() => {
    const summary = {
      all: Array.isArray(notifications) ? notifications.length : 0,
      unread: Array.isArray(notifications) ? notifications.filter((item) => !item.isRead).length : 0,
      assignment: Array.isArray(notifications)
        ? notifications.filter((item) => getNotificationType(item?.type) === 'assignment').length
        : 0,
      alert: Array.isArray(notifications)
        ? notifications.filter((item) => getNotificationType(item?.type) === 'alert').length
        : 0,
      update: Array.isArray(notifications)
        ? notifications.filter((item) => getNotificationType(item?.type) === 'update').length
        : 0,
    };

    return summary;
  }, [notifications]);

  const handleOpenNotification = async (notification) => {
    if (!notification) return;

    try {
      await markAsRead(notification.notificationId);
    } catch (err) {
      console.warn('NotificationCenterPage markAsRead failed', err);
    }

    if (notification?.targetUrl) {
      navigate(notification.targetUrl);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm fade-in-up visible">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Trung tâm thông báo</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Hộp thư thông báo</h1>
            <p className="max-w-2xl text-sm text-slate-500">
              Xem, sắp xếp và quản lý thông báo quan trọng của bạn. Các thông báo chưa đọc được nhóm rõ ràng
              để bạn tập trung vào điều cần xử lý nhanh.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => markAllAsRead()}
              disabled={loading || unreadCount === 0}
              className="btn btn-sm btn-outline btn-primary rounded-full"
            >
              Đánh dấu tất cả đã đọc
            </button>
            <button
              type="button"
              onClick={() => loadNotifications({ pageNumber: 1, pageSize: 50 })}
              className="btn btn-sm btn-primary rounded-full transition duration-200 ease-out hover:shadow-sm"
            >
              Cập nhật
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm fade-in-up visible">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tổng quan</p>
                <p className="text-3xl font-extrabold text-slate-900">{summaryCounts.unread}</p>
                <p className="text-sm text-slate-500">Thông báo chưa đọc trong hộp thư</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Lucide.Bell size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm fade-in-up visible fade-in-up visible">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Bộ lọc</p>
            <div className="mt-4 space-y-3">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition duration-200 ease-out ${
                    activeFilter === filter.id
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <filter.icon size={16} />
                    <span>{filter.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{summaryCounts[filter.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm fade-in-up visible">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Đơn vị ưu tiên</p>
                <p className="text-sm font-semibold text-slate-700">Tổng quan nhanh</p>
              </div>
              <Lucide.Clock className="text-slate-400" size={20} />
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Cao</p>
                <p className="mt-2 text-sm text-slate-700">Phân công và cảnh báo cần phản hồi nhanh.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Thông tin</p>
                <p className="mt-2 text-sm text-slate-700">Cập nhật tiến trình và trạng thái xử lý.</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Danh sách</p>
              <h2 className="text-xl font-bold">Thông báo mới nhất</h2>
              <p className="text-sm text-slate-500">{summaryCounts.all} thông báo · {unreadCount} chưa đọc</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm thông báo..."
                  className="input input-sm input-bordered w-full min-w-[220px] rounded-full pr-10"
                />
                <Lucide.Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={() => loadNotifications({ pageNumber: 1, pageSize: 50 })}
                className="btn btn-sm btn-outline rounded-full"
              >
                Làm mới
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                Đang tải thông báo...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
                {error}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                Không tìm thấy thông báo phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <div key={group.label} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{group.label}</h3>
                    <span className="text-xs text-slate-400">{group.values.length} mục</span>
                  </div>
                  <div className="space-y-3">
                    {group.values.map((notification) => {
                      const typeKey = getNotificationType(notification?.type);
                      const typeData = notificationTypeConfig[typeKey] || notificationTypeConfig.default;
                      const Icon = typeData.icon;

                      return (
                        <button
                          key={notification?.notificationId ?? `${notification?.title}-${notification?.createdAt}`}
                          type="button"
                          onClick={() => handleOpenNotification(notification)}
                          className={`w-full rounded-3xl border p-4 text-left transition ${
                            notification?.isRead === false ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-3xl bg-${typeData.tone}-100 text-${typeData.tone}-600`}>
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900 truncate">
                                      {notification?.title || 'Thông báo mới'}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                      {typeData.label}
                                    </span>
                                    {notification?.isRead === false && (
                                      <span className="rounded-full bg-primary text-primary-content px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                                        Mới
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">
                                    {notification?.message || 'Nội dung thông báo chưa có.'}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right text-xs text-slate-400">
                                  <p>{formatRelativeTime(notification?.createdAt)}</p>
                                  <p className="mt-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                    {typeData.badge}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NotificationCenterPage;
