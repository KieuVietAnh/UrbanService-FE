import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

const categoryFilters = [
  { id: 'all', label: 'Tất cả', icon: Lucide.Inbox, accent: 'bg-slate-100 text-slate-700' },
  { id: 'status', label: 'Cập nhật trạng thái', icon: Lucide.CircleDot, accent: 'bg-sky-100 text-sky-700' },
  { id: 'rework', label: 'Yêu cầu làm lại', icon: Lucide.RefreshCcw, accent: 'bg-amber-100 text-amber-700' },
  { id: 'resolution', label: 'Kết quả xử lý', icon: Lucide.CheckCircle2, accent: 'bg-emerald-100 text-emerald-700' },
  { id: 'community', label: 'Hoạt động cộng đồng', icon: Lucide.Users, accent: 'bg-violet-100 text-violet-700' },
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

const getCategory = (notification) => {
  const text = `${notification?.title || ''} ${notification?.message || ''} ${notification?.type || ''}`.toLowerCase();
  if (text.includes('rework') || text.includes('làm lại') || text.includes('bổ sung') || text.includes('request info') || text.includes('yêu cầu thêm')) {
    return 'rework';
  }
  if (text.includes('resolution') || text.includes('result') || text.includes('resolved') || text.includes('hoàn tất') || text.includes('approved') || text.includes('phê duyệt')) {
    return 'resolution';
  }
  if (text.includes('community') || text.includes('comment') || text.includes('support') || text.includes('cộng đồng') || text.includes('bình luận')) {
    return 'community';
  }
  return 'status';
};

const getPriority = (notification) => {
  const text = `${notification?.title || ''} ${notification?.message || ''}`.toLowerCase();
  if (text.includes('urgent') || text.includes('nguy') || text.includes('cấp') || text.includes('rework') || text.includes('làm lại')) {
    return { label: 'Cao', tone: 'bg-rose-100 text-rose-700 border-rose-200' };
  }
  if (text.includes('update') || text.includes('cập nhật') || text.includes('status')) {
    return { label: 'Trung bình', tone: 'bg-sky-100 text-sky-700 border-sky-200' };
  }
  return { label: 'Thông tin', tone: 'bg-slate-100 text-slate-700 border-slate-200' };
};

const getCategoryConfig = (category) => {
  const base = categoryFilters.find((item) => item.id === category) || categoryFilters[0];
  return {
    label: base.label,
    icon: base.icon,
    accent: base.accent,
  };
};

const getRelatedFeedback = (notification) => {
  const values = [
    notification?.feedbackId,
    notification?.ticketId,
    notification?.data?.feedbackId,
    notification?.data?.ticketId,
    notification?.relatedFeedbackId,
  ];

  for (const value of values) {
    if (value) return `Feedback #${value}`;
  }

  const targetUrl = notification?.targetUrl || notification?.data?.targetUrl || '';
  const match = targetUrl.match(/\/tickets\/([^/]+)/i);
  if (match?.[1]) return `Feedback #${match[1]}`;
  return 'Thông báo chung';
};

const getActionRoute = (notification, category) => {
  const feedbackId = notification?.feedbackId || notification?.ticketId || notification?.data?.feedbackId || notification?.data?.ticketId || notification?.relatedFeedbackId;
  if (feedbackId) {
    if (category === 'rework') return `/tickets/${feedbackId}/rework`;
    if (category === 'resolution') return `/tickets/${feedbackId}/result`;
    return `/tickets/${feedbackId}`;
  }
  if (notification?.targetUrl) return notification.targetUrl;
  return '/tickets';
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
  const [activeCategory, setActiveCategory] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
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
        if (showUnreadOnly && notification?.isRead !== false) return false;
        if (activeCategory === 'all') return true;
        return getCategory(notification) === activeCategory;
      })
      .filter((notification) => {
        if (!searchQuery.trim()) return true;
        const term = searchQuery.trim().toLowerCase();
        return [notification?.title, notification?.message, notification?.type]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, activeCategory, showUnreadOnly, searchQuery]);

  const groupedNotifications = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

  const summaryCounts = useMemo(() => {
    const items = Array.isArray(notifications) ? notifications : [];
    return {
      all: items.length,
      unread: items.filter((item) => !item.isRead).length,
      status: items.filter((item) => getCategory(item) === 'status').length,
      rework: items.filter((item) => getCategory(item) === 'rework').length,
      resolution: items.filter((item) => getCategory(item) === 'resolution').length,
      community: items.filter((item) => getCategory(item) === 'community').length,
    };
  }, [notifications]);

  const actionableCount = useMemo(() => {
    return filteredNotifications.filter((item) => item?.isRead === false).length;
  }, [filteredNotifications]);

  const handleMarkRead = async (notification) => {
    if (!notification?.notificationId) return;
    try {
      await markAsRead(notification.notificationId);
    } catch (err) {
      console.warn('NotificationCenterPage markAsRead failed', err);
    }
  };

  return (
    <div className="space-y-4 text-slate-800">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.7)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] backdrop-blur">
              <Lucide.Inbox size={14} />
              Service-user action inbox
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Thông báo được chuyển thành nhiệm vụ rõ ràng</h1>
              <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
                Mỗi thông báo đều có thể mở trực tiếp, được phân loại theo loại việc cần làm và giúp bạn phản hồi nhanh hơn.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => markAllAsRead()} disabled={loading || unreadCount === 0} className="btn btn-sm rounded-full border-white/20 bg-white/15 text-white hover:bg-white/25">
              <Lucide.CheckCheck size={14} />
              Đánh dấu tất cả đã đọc
            </button>
            <button type="button" onClick={() => loadNotifications({ pageNumber: 1, pageSize: 50 })} className="btn btn-sm rounded-full border-white/20 bg-white text-slate-800 hover:bg-slate-100">
              <Lucide.RefreshCw size={14} />
              Làm mới
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Chưa đọc</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summaryCounts.unread}</div>
          <div className="text-sm text-slate-500">Thông báo cần xử lý ngay</div>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Cần hành động</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{actionableCount}</div>
          <div className="text-sm text-slate-500">Thông báo chưa đọc và có CTA</div>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Danh mục</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summaryCounts.rework + summaryCounts.resolution + summaryCounts.community + summaryCounts.status}</div>
          <div className="text-sm text-slate-500">Được sắp xếp theo mục tiêu hành động</div>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((filter) => {
              const isActive = activeCategory === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveCategory(filter.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                >
                  <filter.icon size={14} />
                  <span>{filter.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? 'bg-white/20 text-white' : filter.accent}`}>
                    {summaryCounts[filter.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={showUnreadOnly} onChange={() => setShowUnreadOnly((prev) => !prev)} className="checkbox checkbox-sm border-slate-300 checked:border-slate-900 checked:bg-slate-900" />
            Chỉ chưa đọc
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-[320px]">
            <Lucide.Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo tiêu đề hoặc tin nhắn..."
              className="input input-sm w-full rounded-full border-slate-200 bg-slate-50 pl-9 text-sm"
            />
          </div>
          <div className="text-sm text-slate-500">{filteredNotifications.length} thông báo phù hợp</div>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Đang tải hộp thư...
          </div>
        ) : error ? (
          <div className="rounded-[1.6rem] border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Không có thông báo phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          groupedNotifications.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-sm font-black uppercase tracking-[0.24em] text-slate-500">{group.label}</h2>
                <span className="text-xs text-slate-400">{group.values.length} mục</span>
              </div>
              <div className="space-y-3">
                {group.values.map((notification) => {
                  const category = getCategory(notification);
                  const categoryConfig = getCategoryConfig(category);
                  const priority = getPriority(notification);
                  const Icon = categoryConfig.icon;
                  const relatedFeedback = getRelatedFeedback(notification);

                  return (
                    <article key={notification?.notificationId ?? `${notification?.title}-${notification?.createdAt}`} className={`rounded-[1.5rem] border p-4 shadow-sm transition ${notification?.isRead === false ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${categoryConfig.accent}`}>
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black text-slate-900">{notification?.title || 'Thông báo mới'}</h3>
                              {notification?.isRead === false && <span className="rounded-full bg-rose-500 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">Mới</span>}
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-600">{notification?.message || 'Nội dung thông báo chưa có.'}</p>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                              <span className={`rounded-full border px-2.5 py-1 font-semibold ${priority.tone}`}>{priority.label}</span>
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600">{categoryConfig.label}</span>
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600">{relatedFeedback}</span>
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-500">{formatRelativeTime(notification?.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <button type="button" onClick={() => navigate(getActionRoute(notification, category))} className="btn btn-sm rounded-full border-slate-200 bg-slate-900 text-white hover:bg-slate-700">
                            <Lucide.ExternalLink size={14} />
                            Mở phản ánh
                          </button>
                          <button type="button" onClick={() => handleMarkRead(notification)} className="btn btn-sm rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                            <Lucide.MailCheck size={14} />
                            Đánh dấu đã đọc
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default NotificationCenterPage;
