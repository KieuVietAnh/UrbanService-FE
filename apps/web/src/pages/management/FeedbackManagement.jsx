// src/pages/management/FeedbackManagement.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi, toolsApi } from '@urbanmind/shared-api';
import { managementTypes } from '@urbanmind/shared-types';


const ADMIN_FEEDBACK_SNAPSHOT_KEY = 'adminFeedbackListSnapshot';
const ADMIN_FEEDBACK_RETURN_STORAGE_KEY = 'urbanmind-admin-feedback-return';
const ADMIN_FEEDBACK_SNAPSHOT_TTL = 5 * 60 * 1000;
let feedbackRequestInFlight = null;

const readFeedbackSnapshot = () => {
  try {
    const raw = sessionStorage.getItem(ADMIN_FEEDBACK_SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    if (!snapshot || !Array.isArray(snapshot.feedbacks)) return null;
    if (Date.now() - Number(snapshot.savedAt || 0) > ADMIN_FEEDBACK_SNAPSHOT_TTL) {
      sessionStorage.removeItem(ADMIN_FEEDBACK_SNAPSHOT_KEY);
      return null;
    }
    return snapshot;
  } catch {
    sessionStorage.removeItem(ADMIN_FEEDBACK_SNAPSHOT_KEY);
    return null;
  }
};


const readAdminFeedbackReturnContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(
      ADMIN_FEEDBACK_RETURN_STORAGE_KEY
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('Không thể đọc vị trí quay lại danh sách phản ánh', error);
    return null;
  }
};

const writeFeedbackSnapshot = (snapshot) => {
  try {
    let previous = {};
    const raw = sessionStorage.getItem(ADMIN_FEEDBACK_SNAPSHOT_KEY);
    if (raw) previous = JSON.parse(raw) || {};
    sessionStorage.setItem(
      ADMIN_FEEDBACK_SNAPSHOT_KEY,
      JSON.stringify({ ...previous, ...snapshot, savedAt: Date.now() })
    );
  } catch (error) {
    console.warn('Không thể lưu trạng thái danh sách phản ánh', error);
  }
};

const requestFeedbacks = () => {
  if (!feedbackRequestInFlight) {
    feedbackRequestInFlight = managementFeedbackApi
      .getFeedbacks()
      .finally(() => {
        feedbackRequestInFlight = null;
      });
  }
  return feedbackRequestInFlight;
};

const STATUS_META = {
  [managementTypes.feedbackStatus.SUBMITTED]: { label: 'Mới gửi', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  [managementTypes.feedbackStatus.AI_REVIEWED]: { label: 'AI đã phân loại', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  [managementTypes.feedbackStatus.VERIFIED]: { label: 'Đã xác minh', className: 'bg-sky-50 text-sky-700 ring-sky-100' },
  [managementTypes.feedbackStatus.ASSIGNED]: { label: 'Đã phân công', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  [managementTypes.feedbackStatus.IN_PROGRESS]: { label: 'Đang xử lý', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  [managementTypes.feedbackStatus.RESOLVED]: { label: 'Chờ nghiệm thu', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  [managementTypes.feedbackStatus.CLOSED]: { label: 'Đã đóng', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const PRIORITY_META = {
  Critical: { label: 'Khẩn cấp', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  High: { label: 'Cao', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  Medium: { label: 'Trung bình', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  Low: { label: 'Thấp', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const normalizeFeedbackResponse = (response) => {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.items,
    response?.data,
    response?.content,
    response?.result,
    response?.records,
    response?.feedbacks,
    response?.data?.items,
    response?.data?.content,
    response?.data?.result,
    response?.data?.records,
    response?.data?.feedbacks,
    response?.result?.items,
    response?.result?.content,
    response?.result?.records,
  ];

  const matchedArray = candidates.find(Array.isArray);
  return matchedArray || [];
};

const getCategoryName = (categoryId, categories = []) => {
  const safeCategories = Array.isArray(categories) ? categories : [];
  return safeCategories.find((category) => String(category.categoryId) === String(categoryId))?.categoryName || 'Chưa phân loại';
};

const formatFeedbackId = (feedbackId) => {
  if (!feedbackId) return '—';
  const value = String(feedbackId);
  const suffix = value.split('-').pop();
  return suffix ? `UM-${suffix.slice(0, 8).toUpperCase()}` : value;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

const getLocationText = (feedback) => {
  const lat = feedback?.latitude ?? feedback?.lat ?? feedback?.location?.latitude ?? feedback?.location?.lat;
  const lng = feedback?.longitude ?? feedback?.lng ?? feedback?.location?.longitude ?? feedback?.location?.lng;

  if (feedback?.locationText || feedback?.address) return feedback.locationText || feedback.address;
  if (lat && lng) return 'Vị trí đã được đánh dấu trên bản đồ';
  return 'Chưa có vị trí';
};

const getStatusLabel = (status) => {
  return STATUS_META[status]?.label || status || 'Chưa rõ';
};

const getPriorityLabel = (priority) => {
  return PRIORITY_META[priority]?.label || priority || 'Trung bình';
};

const getFeedbackAuthorText = (feedback) => {
  return [
    feedback?.userName,
    feedback?.createdBy,
    feedback?.citizenName,
    feedback?.reporterName,
    feedback?.fullName,
    feedback?.email,
    feedback?.phone,
    feedback?.phoneNumber,
  ]
    .filter(Boolean)
    .join(' ');
};



const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: getStatusLabel(status), className: 'bg-slate-100 text-slate-600 ring-slate-200' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.className}`}>{meta.label}</span>;
};

const PriorityBadge = ({ priority }) => {
  const meta = PRIORITY_META[priority] || { ...PRIORITY_META.Medium, label: getPriorityLabel(priority) };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.className}`}>{meta.label}</span>;
};


const FeedbackTableSkeleton = () => (
  <div className="overflow-hidden">
    <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="grid min-w-[1040px] grid-cols-[120px_minmax(280px,1.4fr)_180px_120px_140px_120px_96px] gap-6">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid min-w-[1040px] grid-cols-[120px_minmax(280px,1.4fr)_180px_120px_140px_120px_96px] items-center gap-6 px-6 py-5"
        >
          <div className="h-4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2">
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-9 w-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, helper, tone = 'blue' }) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }[tone];

  return (
    <div className="admin-stat-card p-5 transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
};

export const FeedbackManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [initialSnapshot] = useState(readFeedbackSnapshot);
  const [restoredContext] = useState(() => {
    const stored = readAdminFeedbackReturnContext();
    return location.state?.restoreFeedbackId
      ? { ...stored, feedbackId: location.state.restoreFeedbackId }
      : stored;
  });
  const restoreContextRef = useRef(restoredContext);
  const highlightTimerRef = useRef(null);
  const shouldDeferBackgroundRefreshRef = useRef(
    Boolean(initialSnapshot?.feedbacks?.length && restoredContext)
  );
  const [restoreComplete, setRestoreComplete] = useState(
    () => !restoredContext
  );
  const [feedbacks, setFeedbacks] = useState(() => initialSnapshot?.feedbacks || []);
  const [categories, setCategories] = useState(() => initialSnapshot?.categories || []);
  const [loading, setLoading] = useState(() => !initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(
    () => restoredContext?.searchTerm ?? initialSnapshot?.searchTerm ?? ''
  );
  const [statusFilter, setStatusFilter] = useState(
    () => restoredContext?.statusFilter ?? initialSnapshot?.statusFilter ?? 'all'
  );
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState(
    restoredContext?.feedbackId || ''
  );

  const fetchFeedbacks = useCallback(async ({ background = false } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await requestFeedbacks();
      const nextFeedbacks = normalizeFeedbackResponse(response);
      setFeedbacks(nextFeedbacks);
      writeFeedbackSnapshot({
        feedbacks: nextFeedbacks,
        categories,
        searchTerm,
        statusFilter,
      });
    } catch (err) {
      console.error(err);
      if (!background && feedbacks.length === 0) {
        setFeedbacks([]);
        setError(err?.message || 'Không thể tải danh sách phản ánh.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categories, feedbacks.length, searchTerm, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    if (!shouldDeferBackgroundRefreshRef.current) {
      fetchFeedbacks({ background: Boolean(initialSnapshot) });
    }

    const loadCategories = async () => {
      try {
        const fetchedCategories = await toolsApi.getCategories();
        if (cancelled) return;
        const nextCategories = Array.isArray(fetchedCategories) ? fetchedCategories : [];
        setCategories(nextCategories);
        writeFeedbackSnapshot({
          feedbacks: initialSnapshot?.feedbacks || feedbacks,
          categories: nextCategories,
          searchTerm,
          statusFilter,
        });
      } catch (err) {
        console.warn('Failed to load categories for feedback management', err);
        if (!initialSnapshot && !cancelled) setCategories([]);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
    // Chỉ chạy lúc mount; requestFeedbacks đã chống gọi trùng trong Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restoreComplete || !shouldDeferBackgroundRefreshRef.current) return;

    shouldDeferBackgroundRefreshRef.current = false;
    fetchFeedbacks({ background: true });
  }, [fetchFeedbacks, restoreComplete]);

  const handleOpenFeedbackDetail = useCallback((feedback) => {
    const feedbackId = feedback?.feedbackId || feedback?.id;
    if (!feedbackId) return;

    const scrollY = document.querySelector(
      '[data-dashboard-scroll-container]'
    )?.scrollTop || 0;

    writeFeedbackSnapshot({
      feedbacks,
      categories,
      searchTerm,
      statusFilter,
    });

    try {
      window.sessionStorage.setItem(
        ADMIN_FEEDBACK_RETURN_STORAGE_KEY,
        JSON.stringify({
          feedbackId: String(feedbackId),
          searchTerm,
          statusFilter,
          scrollY,
        })
      );
    } catch (storageError) {
      console.warn('Không thể lưu vị trí danh sách phản ánh', storageError);
    }

    navigate(`/management/feedbacks/${feedbackId}`, {
      state: {
        feedback,
        from: '/management/feedbacks',
      },
    });
  }, [categories, feedbacks, navigate, searchTerm, statusFilter]);

  useEffect(() => {
    writeFeedbackSnapshot({ feedbacks, categories, searchTerm, statusFilter });
  }, [categories, feedbacks, searchTerm, statusFilter]);

  useEffect(() => () => {
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
  }, []);


  const stats = useMemo(() => {
    const total = feedbacks.length;
    const open = feedbacks.filter((item) => ![managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(item.status)).length;
    const assigned = feedbacks.filter((item) => [managementTypes.feedbackStatus.ASSIGNED, managementTypes.feedbackStatus.IN_PROGRESS].includes(item.status)).length;
    const completed = feedbacks.filter((item) => [managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(item.status)).length;

    return { total, open, assigned, completed };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return feedbacks.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const searchable = [
        item.feedbackId,
        formatFeedbackId(item.feedbackId || item.id),
        item.title,
        item.description,
        item.content,
        item.locationText,
        item.address,
        getLocationText(item),
        getCategoryName(item.categoryId, categories),
        item.status,
        getStatusLabel(item.status),
        item.priority,
        getPriorityLabel(item.priority),
        getFeedbackAuthorText(item),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!keyword || searchable.includes(keyword));
    });
  }, [feedbacks, categories, searchTerm, statusFilter]);

  useEffect(() => {
    const savedContext = restoreContextRef.current;
    if (!savedContext || loading || filteredFeedbacks.length === 0) {
      return undefined;
    }

    let cancelled = false;
    let retryCount = 0;
    let retryTimer;

    const consumeReturnContext = () => {
      try {
        window.sessionStorage.removeItem(
          ADMIN_FEEDBACK_RETURN_STORAGE_KEY
        );
      } catch {
        // Session storage có thể không khả dụng ở chế độ riêng tư.
      }

      restoreContextRef.current = null;
      setRestoreComplete(true);
    };

    const restorePosition = () => {
      if (cancelled) return;

      const feedbackId = String(savedContext.feedbackId || '');
      const escapedFeedbackId = (
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(feedbackId)
          : feedbackId.replace(/["\\]/g, '\\$&')
      );
      const targetRow = escapedFeedbackId
        ? document.querySelector(
          `[data-admin-feedback-id="${escapedFeedbackId}"]`
        )
        : null;
      const scrollContainer = document.querySelector(
        '[data-dashboard-scroll-container]'
      );

      if (!targetRow || !scrollContainer) {
        retryCount += 1;
        if (retryCount < 30) {
          retryTimer = window.setTimeout(restorePosition, 100);
          return;
        }

        scrollContainer?.scrollTo({
          top: Number(savedContext.scrollY) || 0,
          left: 0,
          behavior: 'auto',
        });
        consumeReturnContext();
        return;
      }

      window.requestAnimationFrame(() => {
        if (cancelled) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const rowRect = targetRow.getBoundingClientRect();
        const rowTopInContainer = (
          scrollContainer.scrollTop + rowRect.top - containerRect.top
        );
        const centeredTop = Math.max(
          0,
          rowTopInContainer - Math.max(
            24,
            (scrollContainer.clientHeight - targetRow.offsetHeight) / 2
          )
        );

        scrollContainer.scrollTo({
          top: centeredTop,
          left: 0,
          behavior: 'auto',
        });
        setHighlightedFeedbackId(feedbackId);
        if (highlightTimerRef.current) {
          window.clearTimeout(highlightTimerRef.current);
        }
        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedFeedbackId('');
          highlightTimerRef.current = null;
        }, 2500);
        consumeReturnContext();
      });
    };

    restorePosition();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [filteredFeedbacks, loading]);




  return (
    <div className="admin-page-shell space-y-6">
      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.MessageSquare size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="admin-hero-title">
                Quản lý phản ánh
              </h1>
              <p className="admin-hero-description">
                Theo dõi phản ánh, trạng thái xử lý và các điểm cần điều phối.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:self-center">
            <button
              type="button"
              onClick={() => fetchFeedbacks({ background: feedbacks.length > 0 })}
              className="btn btn-outline h-11 rounded-xl border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={loading || refreshing}
            >
              <Lucide.RefreshCcw size={16} className={loading || refreshing ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <Link
              to="/community/map"
              className="btn h-11 rounded-xl border-0 bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Lucide.Map size={16} />
              Xem bản đồ
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Lucide.Inbox} label="Tổng phản ánh" value={stats.total} helper="Tất cả phản ánh" tone="blue" />
        <StatCard icon={Lucide.AlertCircle} label="Đang mở" value={stats.open} helper="Cần theo dõi" tone="amber" />
        <StatCard icon={Lucide.Wrench} label="Đang xử lý" value={stats.assigned} helper="Đã điều phối" tone="slate" />
        <StatCard icon={Lucide.CheckCircle2} label="Hoàn tất" value={stats.completed} helper="Đã nghiệm thu/đóng" tone="emerald" />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Danh sách phản ánh</h2>
                {refreshing && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <span className="loading loading-spinner loading-xs" />
                    Đang cập nhật
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Hiển thị {filteredFeedbacks.length} trên tổng số {feedbacks.length} phản ánh
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <label className="relative block min-w-0 flex-1 xl:w-80">
                <span className="sr-only">Tìm kiếm phản ánh</span>
                <Lucide.Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Tìm theo mã, nội dung, vị trí..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <Lucide.X size={15} />
                  </button>
                )}
              </label>

              <label className="relative block sm:w-56">
                <span className="sr-only">Lọc theo trạng thái</span>
                <Lucide.Filter className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="select h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm text-slate-700 focus:border-blue-300 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="all">Tất cả trạng thái</option>
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <FeedbackTableSkeleton />
        ) : error ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Lucide.WifiOff size={24} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-slate-100">Không thể tải danh sách phản ánh</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{error}</p>
            <button type="button" onClick={fetchFeedbacks} className="btn btn-outline mt-5 h-10 rounded-xl text-sm">
              <Lucide.RefreshCcw size={15} />
              Thử lại
            </button>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Lucide.MessageSquare size={24} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-slate-100">Không tìm thấy phản ánh phù hợp</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Thử xóa từ khóa hoặc chọn trạng thái khác.'
                : 'Danh sách chưa có dữ liệu để hiển thị.'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="btn btn-outline mt-5 h-10 rounded-xl border-slate-300 px-4 text-sm dark:border-slate-700"
              >
                <Lucide.RotateCcw size={15} />
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  <th className="px-6 py-4">Mã</th>
                  <th className="px-6 py-4">Nội dung</th>
                  <th className="px-6 py-4">Danh mục</th>
                  <th className="px-6 py-4">Ưu tiên</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFeedbacks.map((feedback) => {
                  const feedbackId = feedback.feedbackId || feedback.id;
                  return (
                    <tr
                      key={feedbackId}
                      data-admin-feedback-id={String(feedbackId)}
                      className={`cursor-pointer transition ${
                        String(highlightedFeedbackId) === String(feedbackId)
                          ? 'bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/70'
                      }`}
                      onClick={() => handleOpenFeedbackDetail(feedback)}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700 dark:text-blue-300">{formatFeedbackId(feedbackId)}</td>
                      <td className="max-w-[320px] px-6 py-4">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{feedback.title || 'Không có tiêu đề'}</p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{getLocationText(feedback)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{getCategoryName(feedback.categoryId, categories)}</td>
                      <td className="px-6 py-4"><PriorityBadge priority={feedback.priority} /></td>
                      <td className="px-6 py-4"><StatusBadge status={feedback.status} /></td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(feedback.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenFeedbackDetail(feedback);
                          }}
                          className="btn btn-ghost h-9 min-h-0 rounded-xl px-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
};
