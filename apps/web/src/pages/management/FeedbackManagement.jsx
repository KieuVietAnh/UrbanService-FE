// src/pages/management/FeedbackManagement.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi, toolsApi } from '@urbanmind/shared-api';
import { getCategoryLabel } from '../../utils/categoryLabels';
import {
  ADMIN_FEEDBACK_METRICS,
  calculateAdminFeedbackSummary,
  filterAdminFeedbacksByMetric,
  normalizeAdminFeedbackMetric,
} from '../../utils/adminFeedbackMetrics';
import { peekAdminFeedbackDetail, prefetchAdminFeedbackDetail } from '../../services/cache/adminFeedbackDetailCache';


const ADMIN_FEEDBACK_SNAPSHOT_KEY = 'adminFeedbackListSnapshot';
const ADMIN_FEEDBACK_RETURN_STORAGE_KEY = 'urbanmind-admin-feedback-return';
const ADMIN_FEEDBACK_SNAPSHOT_TTL = 5 * 60 * 1000;
const ADMIN_FEEDBACK_PAGE_SIZE = 10;

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

const normalizeFeedbackEnum = (value) => String(value ?? '')
  .replace(/[-_\s]/g, '')
  .toLowerCase();

const STATUS_META = {
  submitted: { value: 'Submitted', label: 'Mới gửi', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  aireviewed: { value: 'AiReviewed', label: 'AI đã phân loại', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  verified: { value: 'Verified', label: 'Đã xác minh', className: 'bg-sky-50 text-sky-700 ring-sky-100' },
  assigned: { value: 'Assigned', label: 'Đã phân công', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  inprogress: { value: 'InProgress', label: 'Đang xử lý', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  resolved: { value: 'Resolved', label: 'Chờ nghiệm thu', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  submittedforapproval: { value: 'SubmittedForApproval', label: 'Chờ phê duyệt', className: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
  approved: { value: 'Approved', label: 'Đã phê duyệt', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  rejected: { value: 'Rejected', label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  needrework: { value: 'NeedRework', label: 'Cần xử lý lại', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  closed: { value: 'Closed', label: 'Đã đóng', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  cancelled: { value: 'Cancelled', label: 'Đã hủy', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const PRIORITY_META = {
  critical: { label: 'Khẩn cấp', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  urgent: { label: 'Khẩn cấp', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  high: { label: 'Cao', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  medium: { label: 'Trung bình', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  low: { label: 'Thấp', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const getStatusMeta = (status) => STATUS_META[normalizeFeedbackEnum(status)];
const getPriorityMeta = (priority) => PRIORITY_META[normalizeFeedbackEnum(priority)];


const getCategoryName = (feedback, categories = []) => {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const categoryId = feedback?.categoryId ?? feedback?.category?.categoryId ?? feedback?.category?.id;
  const matchedCategory = safeCategories.find((category) =>
    String(category?.categoryId ?? category?.id) === String(categoryId)
  );
  const categoryName =
    feedback?.categoryName ??
    feedback?.category?.categoryName ??
    feedback?.category?.name ??
    matchedCategory?.categoryName ??
    matchedCategory?.name;

  return getCategoryLabel(categoryName);
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
  const areaName = [
    feedback?.wardName,
    feedback?.areaName,
    feedback?.area?.areaName,
    feedback?.area?.name,
    feedback?.ward?.name,
    feedback?.location?.wardName,
    feedback?.location?.areaName,
  ].find((value) => typeof value === 'string' && value.trim());

  return areaName?.trim() || 'Chưa xác định khu vực';
};

const getStatusLabel = (status) => {
  return getStatusMeta(status)?.label || status || 'Chưa rõ';
};

const getPriorityLabel = (priority) => {
  return getPriorityMeta(priority)?.label || priority || 'Trung bình';
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


const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim();

const metricForStatus = (status) => {
  const candidate = { status };
  if (filterAdminFeedbacksByMetric([candidate], 'pending').length) return 'pending';
  if (filterAdminFeedbacksByMetric([candidate], 'inProgress').length) return 'inProgress';
  if (filterAdminFeedbacksByMetric([candidate], 'completed').length) return 'completed';
  return 'total';
};

const feedbackMatchesSearch = (feedback, searchTerm, categories = []) => {
  const normalizedSearch = normalizeSearchText(searchTerm);
  if (!normalizedSearch) return true;

  return [
    feedback?.feedbackId,
    feedback?.id,
    feedback?.title,
    feedback?.description,
    feedback?.locationText,
    getLocationText(feedback),
    getCategoryName(feedback, categories),
    getFeedbackAuthorText(feedback),
    getStatusLabel(feedback?.status),
    getPriorityLabel(feedback?.priority),
  ].some((value) => normalizeSearchText(value).includes(normalizedSearch));
};



const StatusBadge = ({ status }) => {
  const meta = getStatusMeta(status) || { label: getStatusLabel(status), className: 'bg-slate-100 text-slate-600 ring-slate-200' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.className}`}>{meta.label}</span>;
};

const PriorityBadge = ({ priority }) => {
  const meta = getPriorityMeta(priority) || { ...PRIORITY_META.medium, label: getPriorityLabel(priority) };
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

const StatCard = ({ icon: Icon, label, value, helper, tone = 'blue', active = false, onClick }) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`admin-stat-card group min-h-[164px] w-full p-5 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        active ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-200' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>
        </div>
        <div className="flex items-start">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
            <Icon size={20} />
          </span>
        </div>
      </div>
    </button>
  );
};

export const FeedbackManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialSnapshot] = useState(readFeedbackSnapshot);
  const [shouldRestoreListContext] = useState(() => Boolean(location.state?.restoreFeedbackId));
  const [restoredContext] = useState(() => {
    if (!shouldRestoreListContext) return null;

    const stored = readAdminFeedbackReturnContext();
    return {
      ...(stored || {}),
      feedbackId: location.state.restoreFeedbackId,
    };
  });

  const parseUrlFilters = useCallback((params) => ({
    group: normalizeAdminFeedbackMetric(params.get('metric')),
    status: params.get('status') || 'all',
    search: params.get('search') || '',
    page: Math.max(1, Number(params.get('page')) || 1),
  }), []);

  const initialUrlFilters = parseUrlFilters(searchParams);
  const initialFilters = restoredContext
    ? {
        group: normalizeAdminFeedbackMetric(
          restoredContext.metricFilter ?? initialUrlFilters.group
        ),
        status: restoredContext.statusFilter ?? initialUrlFilters.status,
        search: restoredContext.searchTerm ?? initialUrlFilters.search,
        page: Math.max(
          1,
          Number(restoredContext.pageNumber ?? initialUrlFilters.page) || 1
        ),
      }
    : initialUrlFilters;

  const restoreContextRef = useRef(restoredContext);
  const feedbackRequestIdRef = useRef(0);
  const highlightTimerRef = useRef(null);
  const lastWrittenQueryRef = useRef('');
  const [filters, setFilters] = useState(initialFilters);
  const [allFeedbacks, setAllFeedbacks] = useState(() => (
    Array.isArray(initialSnapshot?.allFeedbacks)
      ? initialSnapshot.allFeedbacks
      : Array.isArray(initialSnapshot?.feedbacks)
        ? initialSnapshot.feedbacks
        : []
  ));
  const [categories, setCategories] = useState(() => initialSnapshot?.categories || []);
  const [feedbackSummary, setFeedbackSummary] = useState(() => (
    initialSnapshot?.feedbackSummary || calculateAdminFeedbackSummary(
      initialSnapshot?.allFeedbacks || initialSnapshot?.feedbacks || [],
      initialSnapshot?.totalItems
    )
  ));
  const [loading, setLoading] = useState(() => allFeedbacks.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState(
    restoredContext?.feedbackId || ''
  );

  const fetchFeedbacks = useCallback(async ({ background = false } = {}) => {
    const requestId = ++feedbackRequestIdRef.current;

    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const summaryResponse = await managementFeedbackApi.getFeedbackSummary();
      if (requestId !== feedbackRequestIdRef.current) return;

      const nextAllFeedbacks = Array.isArray(summaryResponse?.items)
        ? summaryResponse.items
        : [];
      const fallbackSummary = calculateAdminFeedbackSummary(
        nextAllFeedbacks,
        summaryResponse?.total
      );
      const nextSummary = {
        total: Number(summaryResponse?.total ?? fallbackSummary.total) || 0,
        pending: Number(summaryResponse?.pending ?? fallbackSummary.pending) || 0,
        inProgress: Number(summaryResponse?.inProgress ?? fallbackSummary.inProgress) || 0,
        completed: Number(summaryResponse?.completed ?? fallbackSummary.completed) || 0,
      };

      setAllFeedbacks(nextAllFeedbacks);
      setFeedbackSummary(nextSummary);
    } catch (err) {
      if (requestId !== feedbackRequestIdRef.current) return;

      console.error(err);
      if (!background || allFeedbacks.length === 0) {
        setError(err?.message || 'Không thể tải danh sách phản ánh.');
      }
    } finally {
      if (requestId === feedbackRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [allFeedbacks.length]);

  useEffect(() => {
    let cancelled = false;
    toolsApi.getCategories()
      .then((fetchedCategories) => {
        if (!cancelled) setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
      })
      .catch((err) => console.warn('Failed to load categories for feedback management', err));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchFeedbacks({ background: allFeedbacks.length > 0 });

    return () => {
      feedbackRequestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shouldRestoreListContext) return;

    try {
      window.sessionStorage.removeItem(ADMIN_FEEDBACK_RETURN_STORAGE_KEY);
    } catch {
      // Ignore storage failures; URL filters remain the source of truth.
    }
  }, [shouldRestoreListContext]);

  const matchingFeedbacks = useMemo(() => {
    const source = Array.isArray(allFeedbacks) ? allFeedbacks : [];
    return source.filter((feedback) => {
      if (filters.status !== 'all' && String(feedback?.status) !== String(filters.status)) return false;
      if (filters.status === 'all' && !filterAdminFeedbacksByMetric([feedback], filters.group).length) return false;
      return feedbackMatchesSearch(feedback, filters.search, categories);
    });
  }, [allFeedbacks, categories, filters.group, filters.search, filters.status]);

  const pagination = useMemo(() => {
    const totalItems = matchingFeedbacks.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_FEEDBACK_PAGE_SIZE));
    const pageNumber = Math.min(Math.max(1, filters.page), totalPages);
    return {
      pageNumber,
      pageSize: ADMIN_FEEDBACK_PAGE_SIZE,
      totalItems,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages,
    };
  }, [filters.page, matchingFeedbacks.length]);

  const feedbacks = useMemo(() => {
    const startIndex = (pagination.pageNumber - 1) * ADMIN_FEEDBACK_PAGE_SIZE;
    return matchingFeedbacks.slice(startIndex, startIndex + ADMIN_FEEDBACK_PAGE_SIZE);
  }, [matchingFeedbacks, pagination.pageNumber]);

  const filteredFeedbacks = feedbacks;
  const searchTerm = filters.search;
  const statusFilter = filters.status;
  const metricFilter = filters.group;
  const pageNumber = pagination.pageNumber;
  const stats = feedbackSummary;

  useEffect(() => {
    if (loading || filters.page === pagination.pageNumber) return;
    setFilters((current) => ({ ...current, page: pagination.pageNumber }));
  }, [filters.page, loading, pagination.pageNumber]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filters.status !== 'all') nextParams.set('status', filters.status);
    else if (filters.group !== 'total') nextParams.set('metric', filters.group);
    if (filters.search.trim()) nextParams.set('search', filters.search.trim());
    if (filters.page > 1) nextParams.set('page', String(filters.page));

    const nextQuery = nextParams.toString();
    if (nextQuery === searchParams.toString()) return;
    lastWrittenQueryRef.current = nextQuery;
    setSearchParams(nextParams, { replace: true });
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (currentQuery === lastWrittenQueryRef.current) {
      lastWrittenQueryRef.current = '';
      return;
    }
    const urlFilters = parseUrlFilters(searchParams);
    setFilters((current) => (
      current.group === urlFilters.group &&
      current.status === urlFilters.status &&
      current.search === urlFilters.search &&
      current.page === urlFilters.page
        ? current
        : urlFilters
    ));
  }, [parseUrlFilters, searchParams]);

  useEffect(() => {
    writeFeedbackSnapshot({
      feedbacks,
      allFeedbacks,
      categories,
      searchTerm,
      statusFilter,
      metricFilter,
      feedbackSummary,
      ...pagination,
    });
  }, [allFeedbacks, categories, feedbackSummary, feedbacks, metricFilter, pagination, searchTerm, statusFilter]);

  const updateFilters = useCallback((patch) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const handleMetricFilterChange = useCallback((nextMetric) => {
    updateFilters({
      group: normalizeAdminFeedbackMetric(nextMetric),
      status: 'all',
      page: 1,
    });
  }, [updateFilters]);

  const handleStatusFilterChange = useCallback((nextStatus) => {
    restoreContextRef.current = null;
    updateFilters({
      status: nextStatus,
      group: nextStatus === 'all' ? 'total' : metricForStatus(nextStatus),
      page: 1,
    });
  }, [updateFilters]);

  const handleOpenFeedbackDetail = useCallback((feedback) => {
    const feedbackId = feedback?.feedbackId || feedback?.id;
    if (!feedbackId) return;
    const scrollY = document.querySelector('[data-dashboard-scroll-container]')?.scrollTop || 0;

    try {
      window.sessionStorage.setItem(
        ADMIN_FEEDBACK_RETURN_STORAGE_KEY,
        JSON.stringify({
          feedbackId: String(feedbackId),
          searchTerm,
          statusFilter,
          metricFilter,
          pageNumber,
          scrollY,
        })
      );
    } catch (storageError) {
      console.warn('Không thể lưu vị trí danh sách phản ánh', storageError);
    }

    const prefetchedDetail = peekAdminFeedbackDetail(feedbackId);
    navigate(`/management/feedbacks/${feedbackId}`, {
      state: {
        feedback: prefetchedDetail
          ? { ...feedback, ...(prefetchedDetail?.data || prefetchedDetail?.item || prefetchedDetail?.result || prefetchedDetail?.record || prefetchedDetail) }
          : feedback,
        from: '/management/feedbacks',
      },
    });
  }, [metricFilter, navigate, pageNumber, searchTerm, statusFilter]);

  useEffect(() => () => {
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
  }, []);

  useEffect(() => {
    const savedContext = restoreContextRef.current;
    if (!savedContext || loading || filteredFeedbacks.length === 0) return undefined;

    let cancelled = false;
    let animationFrameId;
    let frameCount = 0;

    const consumeReturnContext = () => {
      try { window.sessionStorage.removeItem(ADMIN_FEEDBACK_RETURN_STORAGE_KEY); } catch { /* noop */ }
      restoreContextRef.current = null;
    };

    const restorePosition = () => {
      if (cancelled) return;

      const feedbackId = String(savedContext.feedbackId || '');
      const escapedFeedbackId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(feedbackId)
        : feedbackId.replace(/["\\]/g, '\\$&');
      const targetRow = escapedFeedbackId
        ? document.querySelector(`[data-admin-feedback-id="${escapedFeedbackId}"]`)
        : null;

      if (!targetRow) {
        frameCount += 1;
        if (frameCount < 20) {
          animationFrameId = window.requestAnimationFrame(restorePosition);
          return;
        }

        const scrollContainer = document.querySelector('[data-dashboard-scroll-container]');
        scrollContainer?.scrollTo({
          top: Number(savedContext.scrollY) || 0,
          left: 0,
          behavior: 'auto',
        });
        consumeReturnContext();
        return;
      }

      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setHighlightedFeedbackId(feedbackId);

      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedFeedbackId('');
        highlightTimerRef.current = null;
      }, 2500);

      consumeReturnContext();
    };

    animationFrameId = window.requestAnimationFrame(restorePosition);

    return () => {
      cancelled = true;
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
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
              to="/management/map"
              className="btn h-11 rounded-xl border-0 bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Lucide.Map size={16} />
              Xem bản đồ
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ADMIN_FEEDBACK_METRICS.map((metric) => {
          const Icon = Lucide[metric.icon] || Lucide.Circle;
          return (
            <StatCard
              key={metric.key}
              icon={Icon}
              label={metric.label}
              value={stats[metric.key] ?? 0}
              helper={metric.helper}
              tone={metric.tone}
              active={(statusFilter === 'all' ? metricFilter : metricForStatus(statusFilter)) === metric.key}
              onClick={() => handleMetricFilterChange(metric.key)}
            />
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Danh sách phản ánh</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Hiển thị {filteredFeedbacks.length} trên tổng số {pagination.totalItems} phản ánh
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <label className="relative block min-w-0 flex-1 xl:w-80">
                <span className="sr-only">Tìm kiếm phản ánh</span>
                <Lucide.Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={searchTerm}
                  onChange={(event) => updateFilters({ search: event.target.value, page: 1 })}
                  className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Tìm theo mã, nội dung, vị trí..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => updateFilters({ search: '', page: 1 })}
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
                  onChange={(event) => handleStatusFilterChange(event.target.value)}
                  className="select h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm text-slate-700 focus:border-blue-300 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="all">Tất cả trạng thái</option>
                  {Object.values(STATUS_META).map((meta) => (
                    <option key={meta.value} value={meta.value}>{meta.label}</option>
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
              {searchTerm || statusFilter !== 'all' || metricFilter !== 'total'
                ? 'Thử xóa từ khóa hoặc chọn nhóm trạng thái khác.'
                : 'Danh sách chưa có dữ liệu để hiển thị.'}
            </p>
            {(searchTerm || statusFilter !== 'all' || metricFilter !== 'total') && (
              <button
                type="button"
                onClick={() => updateFilters({ search: '', status: 'all', group: 'total', page: 1 })}
                className="btn btn-outline mt-5 h-10 rounded-xl border-slate-300 px-4 text-sm dark:border-slate-700"
              >
                <Lucide.RotateCcw size={15} />
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="table w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[34%]" />
                <col className="w-[15%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  <th className="whitespace-nowrap px-4 py-4">Mã</th>
                  <th className="px-4 py-4">Nội dung</th>
                  <th className="px-4 py-4">Danh mục</th>
                  <th className="whitespace-nowrap px-4 py-4">Ưu tiên</th>
                  <th className="whitespace-nowrap px-4 py-4">Trạng thái</th>
                  <th className="whitespace-nowrap px-4 py-4">Ngày tạo</th>
                  <th className="whitespace-nowrap px-4 py-4 text-right">Thao tác</th>
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
                      onMouseEnter={() => prefetchAdminFeedbackDetail(feedbackId)}
                      onFocus={() => prefetchAdminFeedbackDetail(feedbackId)}
                      onPointerDown={() => prefetchAdminFeedbackDetail(feedbackId)}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-blue-700 dark:text-blue-300">{formatFeedbackId(feedbackId)}</td>
                      <td className="min-w-0 px-4 py-4">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{feedback.title || 'Không có tiêu đề'}</p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{getLocationText(feedback)}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300"><span className="block truncate" title={getCategoryName(feedback, categories)}>{getCategoryName(feedback, categories)}</span></td>
                      <td className="whitespace-nowrap px-4 py-4"><PriorityBadge priority={feedback.priority} /></td>
                      <td className="whitespace-nowrap px-4 py-4"><StatusBadge status={feedback.status} /></td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(feedback.createdAt)}</td>
                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenFeedbackDetail(feedback);
                          }}
                          className="btn btn-ghost h-9 min-h-0 whitespace-nowrap rounded-xl px-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
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

        {!loading && !error && pagination.totalItems > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trang <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.pageNumber}</span> / {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage || refreshing}
                onClick={() => updateFilters({ page: Math.max(1, pageNumber - 1) })}
                className="btn btn-outline h-10 min-h-0 rounded-xl border-slate-300 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
              >
                <Lucide.ChevronLeft size={16} />
                Trước
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
                  .filter((page) => (
                    page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - pagination.pageNumber) <= 1
                  ))
                  .map((page, index, pages) => {
                    const previousPage = pages[index - 1];
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {previousPage && page - previousPage > 1 && (
                          <span className="px-1 text-sm text-slate-400">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => updateFilters({ page })}
                          disabled={refreshing}
                          aria-current={page === pagination.pageNumber ? 'page' : undefined}
                          className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                            page === pagination.pageNumber
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={!pagination.hasNextPage || refreshing}
                onClick={() => updateFilters({ page: Math.min(pagination.totalPages, pageNumber + 1) })}
                className="btn btn-outline h-10 min-h-0 rounded-xl border-slate-300 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
              >
                Sau
                <Lucide.ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
};
