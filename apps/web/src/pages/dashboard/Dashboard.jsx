// src/pages/dashboard/Dashboard.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { analyticsApi } from '../../services/api/analyticsApi';
import { axiosClient, toolsApi, managementFeedbackApi } from '@urbanmind/shared-api';
import { SentimentDonutChart } from '../../components/charts/CustomCharts';
import * as Lucide from 'lucide-react';
import { normalizeRole } from '../../utils/roleMap';
import { APP_ROLES, getStatusLabel, managementTypes, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
import { signalrService } from '../../services/socket/signalrService';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { ADMIN_FEEDBACK_METRICS, calculateAdminFeedbackSummary } from '../../utils/adminFeedbackMetrics';
import { getCommunityFeed } from '../../services/api/feedApi';
import usePublicLandingFeed from '../../hooks/usePublicLandingFeed';
import PublicPageMotion from '../../components/public/PublicPageMotion';
import CompactPublicIncidentMap from '../../components/public/CompactPublicIncidentMap';
import { readAdminDashboardCache, writeAdminDashboardCache } from '../../services/cache/adminDashboardCache';

const DASHBOARD_AREA_STORAGE_KEY =
  'urbanmind-dashboard-area-filter-v2';
const DASHBOARD_SNAPSHOT_STORAGE_KEY =
  'urbanmind-service-user-dashboard-snapshot';

const readDashboardSnapshot = () => {
  if (typeof window === 'undefined') return null;

  try {
    const rawSnapshot = window.sessionStorage.getItem(
      DASHBOARD_SNAPSHOT_STORAGE_KEY
    );
    if (!rawSnapshot) return null;

    const parsedSnapshot = JSON.parse(rawSnapshot);
    return parsedSnapshot && typeof parsedSnapshot === 'object'
      ? parsedSnapshot
      : null;
  } catch {
    return null;
  }
};

const writeDashboardSnapshot = (snapshot) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      DASHBOARD_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // Storage can be unavailable in private mode.
  }
};

const normalizeTicketCollection = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const normalizeTicketPage = (response) => {
  const payload = (
    response?.data &&
    !Array.isArray(response.data) &&
    typeof response.data === 'object'
  )
    ? response.data
    : response;
  const items = normalizeTicketCollection(payload);
  const totalItems = Number(
    payload?.totalItems ??
    payload?.totalCount ??
    payload?.count ??
    items.length
  );

  return {
    items,
    totalItems: Number.isFinite(totalItems)
      ? totalItems
      : items.length,
  };
};

const getAreaId = (area) => area?.areaId ?? area?.id ?? '';
const getAreaName = (area) => (
  area?.areaName ||
  area?.name ||
  area?.displayName ||
  'Chưa xác định khu vực'
);
const getTicketAreaId = (ticket) => (
  ticket?.areaId ??
  ticket?.area?.areaId ??
  ticket?.area?.id ??
  ''
);

const readTrackedAreaId = () => {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(
      DASHBOARD_AREA_STORAGE_KEY
    ) || '';
  } catch {
    return '';
  }
};

const buildTicketListUrl = ({
  status = '',
  search = '',
  sort = '',
} = {}) => {
  const params = new URLSearchParams();

  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);

  const queryString = params.toString();
  return queryString ? `/tickets?${queryString}` : '/tickets';
};

const SAFE_DASHBOARD_STATS = {
  totalUsers: 0,
  processingRate: 0,
  csatScore: 0,
  avgResolutionTimeHours: 0,
  slaBreaches: 0,
  apiStatus: 'Ổn định',
  aiStatus: 'Đang bật',
  storageUsage: '0 KB',
  sentimentTrend: {
    Positive: 0,
    Neutral: 0,
    Negative: 0,
  },
  categoryDistribution: [],
};

const normalizeDashboardStats = (rawStats) => ({
  ...SAFE_DASHBOARD_STATS,
  ...(rawStats && typeof rawStats === 'object' ? rawStats : {}),
  sentimentTrend: {
    ...SAFE_DASHBOARD_STATS.sentimentTrend,
    ...(rawStats?.sentimentTrend && typeof rawStats.sentimentTrend === 'object' ? rawStats.sentimentTrend : {}),
  },
  categoryDistribution: Array.isArray(rawStats?.categoryDistribution)
    ? rawStats.categoryDistribution
    : SAFE_DASHBOARD_STATS.categoryDistribution,
});

const TrackedAreaSelector = ({
  areas,
  value,
  onChange,
}) => {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedArea = areas.find(
    (area) => String(getAreaId(area)) === String(value)
  );
  const showingAllAreas = !value;

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener(
        'pointerdown',
        closeOnOutsideClick
      );
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative min-w-0"
      data-dashboard-area-selector
    >
      <button
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${open
            ? 'border-secondary/40 bg-secondary/5 ring-2 ring-secondary/10'
            : 'border-base-300 bg-base-100 hover:border-secondary/25 hover:bg-secondary/5'
          }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Lucide.MapPinHouse size={16} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-base-content/45">
            Khu vực theo dõi
          </span>
          <strong className="mt-0.5 block truncate text-sm font-bold">
            {selectedArea
              ? getAreaName(selectedArea)
              : 'Tất cả khu vực'}
          </strong>
        </span>

        <Lucide.ChevronDown
          size={15}
          className={`shrink-0 text-base-content/35 transition-transform ${open ? 'rotate-180 text-secondary' : ''
            }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <menu
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
          role="listbox"
          aria-label="Chọn khu vực theo dõi"
        >
          <li>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${showingAllAreas
                  ? 'bg-secondary/10 font-semibold text-secondary'
                  : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                }`}
              role="option"
              aria-selected={showingAllAreas}
            >
              <span className="truncate">Tất cả khu vực</span>
              {showingAllAreas ? (
                <Lucide.Check
                  size={15}
                  className="shrink-0"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </li>

          {areas.length === 0 ? (
            <li className="px-3 py-3 text-sm text-base-content/45">
              Chưa có khu vực cụ thể
            </li>
          ) : (
            areas.map((area) => {
              const areaId = String(getAreaId(area));
              const selected = areaId === String(value);

              return (
                <li key={areaId}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(areaId);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selected
                        ? 'bg-secondary/10 font-semibold text-secondary'
                        : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                      }`}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className="truncate">
                      {getAreaName(area)}
                    </span>
                    {selected ? (
                      <Lucide.Check
                        size={15}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </menu>
      ) : null}
    </div>
  );
};


const CitizenDashboardThemeStyles = () => (
  <style>{`
    html:not([data-theme="dark"]) .citizen-dashboard-page {
      --public-surface: rgba(248, 251, 255, 0.97);
      --public-surface-soft: rgba(232, 239, 248, 0.95);
      --public-surface-strong: #f7faff;
      --public-border: rgba(148, 163, 184, 0.52);
      --public-border-soft: rgba(186, 205, 229, 0.86);
      --public-copy: #4f6077;
      --public-muted: #718198;
      --public-shadow: 0 22px 60px rgba(15, 23, 42, 0.12);
    }

    html:not([data-theme="dark"]) .citizen-dashboard-page-shell {
      border-color: rgba(148, 163, 184, 0.38);
      background:
        linear-gradient(
          180deg,
          rgba(226, 235, 247, 0.84) 0%,
          rgba(242, 247, 252, 0.58) 52%,
          rgba(235, 242, 250, 0.72) 100%
        );
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.78),
        0 24px 70px rgba(15, 23, 42, 0.06);
    }

    html[data-theme="dark"] .citizen-dashboard-page-shell {
      border-color: rgba(96, 165, 250, 0.15);
      background:
        linear-gradient(
          180deg,
          rgba(10, 28, 53, 0.62) 0%,
          rgba(7, 20, 39, 0.28) 58%,
          rgba(5, 13, 27, 0.12) 100%
        );
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.025),
        0 28px 78px rgba(0, 0, 0, 0.2);
    }

    html[data-theme="dark"] .citizen-dashboard-page .citizen-dashboard-hero {
      background:
        radial-gradient(circle at 10% 12%, rgba(37, 99, 235, 0.2), transparent 31%),
        radial-gradient(circle at 91% 16%, rgba(8, 145, 178, 0.12), transparent 29%),
        linear-gradient(145deg, #0d1d36 0%, #081426 100%) !important;
      border-color: rgba(96, 165, 250, 0.18) !important;
    }

    .citizen-dashboard-page .citizen-dashboard-hero-backdrop {
      background:
        radial-gradient(circle at 9% 12%, rgba(37, 99, 235, 0.14), transparent 31%),
        radial-gradient(circle at 91% 16%, rgba(8, 145, 178, 0.12), transparent 29%),
        linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(219, 234, 254, 0.24));
    }

    html[data-theme="dark"] .citizen-dashboard-page .citizen-dashboard-hero-backdrop {
      background:
        radial-gradient(circle at 9% 12%, rgba(37, 99, 235, 0.18), transparent 32%),
        radial-gradient(circle at 91% 16%, rgba(8, 145, 178, 0.1), transparent 29%),
        linear-gradient(145deg, rgba(13, 29, 54, 0.18), rgba(8, 20, 38, 0.08)) !important;
    }

    .citizen-dashboard-page .citizen-dashboard-hero-map {
      color: #2563eb;
      opacity: 0.18;
    }

    html[data-theme="dark"] .citizen-dashboard-page .citizen-dashboard-hero-map {
      color: #67e8f9;
      opacity: 0.1;
    }

    html[data-theme="dark"] .citizen-dashboard-page .citizen-dashboard-panel {
      background: linear-gradient(155deg, #0d1d36, #081426) !important;
      border-color: rgba(96, 165, 250, 0.18) !important;
      box-shadow: 0 22px 58px rgba(0, 0, 0, 0.24) !important;
    }

    html[data-theme="dark"] .citizen-dashboard-page .citizen-dashboard-map-panel {
      background:
        radial-gradient(circle at 82% 12%, rgba(34, 211, 238, 0.08), transparent 28%),
        linear-gradient(145deg, rgba(12, 32, 58, 0.98), rgba(8, 22, 42, 0.98)) !important;
      border-color: rgba(96, 165, 250, 0.18) !important;
    }
  `}</style>
);

const getCommunityFeedbackId = (item) => (
  item?.feedbackId || item?.id || item?.ticketId || ''
);

const getCommunityAreaName = (item) => (
  item?.areaName ||
  item?.wardName ||
  item?.districtName ||
  item?.locationText ||
  'Chưa xác định khu vực'
);

const formatCommunityDate = (value) => {
  if (!value) return 'Vừa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Vừa cập nhật';

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
};

const CitizenCommunityPreview = () => {
  const {
    items,
    loading,
    error,
    reload,
  } = usePublicLandingFeed();
  const previewItems = items.slice(0, 3);

  return (
    <section
      data-public-reveal
      className="citizen-dashboard-panel overflow-hidden rounded-[26px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[0_16px_42px_rgba(15,23,42,0.07)]"
      aria-labelledby="citizen-community-title"
    >
      <header className="flex flex-col gap-4 border-b border-[var(--public-border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Cộng đồng quanh bạn
          </p>
          <h2
            id="citizen-community-title"
            className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--public-title)] sm:text-3xl"
          >
            Cập nhật đô thị mới nhất
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--public-copy)]">
            Những phản ánh công khai mới nhất và vị trí đang được cộng đồng quan tâm.
          </p>
        </div>

        <Link
          to="/community/feed"
          state={{ resetFeedScroll: true }}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 text-sm font-semibold text-[var(--public-title)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-primary"
        >
          Xem bảng tin
          <Lucide.ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <div className="border-b border-[var(--public-border)] p-5 sm:p-6 xl:border-b-0 xl:border-r">
          {loading ? (
            <div className="space-y-3" aria-label="Đang tải cập nhật cộng đồng">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-3 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] p-4"
                  aria-hidden="true"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-base-300/45" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-3/4 rounded-full bg-base-300/45" />
                    <div className="mt-2 h-3 w-1/2 rounded-full bg-base-300/30" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-[22px] border border-dashed border-rose-300/60 bg-rose-500/[0.05] px-6 text-center">
              <Lucide.CloudOff size={23} className="text-rose-500" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-[var(--public-title)]">
                Chưa tải được cập nhật cộng đồng
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--public-copy)]">
                Dữ liệu công khai đang tạm thời chưa phản hồi. Các chức năng cá nhân vẫn hoạt động bình thường.
              </p>
              <button
                type="button"
                onClick={reload}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 text-sm font-semibold text-[var(--public-title)] transition hover:border-blue-300 hover:text-primary"
              >
                <Lucide.RefreshCw size={14} aria-hidden="true" />
                Tải lại
              </button>
            </div>
          ) : previewItems.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] px-6 text-center">
              <Lucide.Inbox size={24} className="text-[var(--public-muted)]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-[var(--public-title)]">
                Chưa có cập nhật công khai mới
              </h3>
              <p className="mt-2 text-sm text-[var(--public-copy)]">
                Các phản ánh đủ điều kiện công khai sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {previewItems.map((item) => {
                const feedbackId = getCommunityFeedbackId(item);
                const badgeClass = STATUS_BADGE_CLASSES[item?.status] || STATUS_BADGE_CLASSES.default;

                return (
                  <li key={feedbackId}>
                    <Link
                      to={feedbackId ? `/community/feed/${feedbackId}` : '/community/feed'}
                      className="group grid gap-3 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] p-4 transition hover:border-blue-300 hover:bg-[var(--public-surface-strong)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200/70 bg-blue-500/[0.07] text-primary" aria-hidden="true">
                        <Lucide.MapPin size={17} />
                      </span>

                      <span className="min-w-0">
                        <strong className="block truncate text-sm font-semibold text-[var(--public-title)] transition group-hover:text-primary ">
                          {item?.title || 'Phản ánh đô thị'}
                        </strong>
                        <span className="mt-1.5 flex items-center gap-2 text-xs text-[var(--public-muted)]">
                          <span className="truncate">{getCommunityAreaName(item)}</span>
                          <span aria-hidden="true">•</span>
                          <time className="shrink-0" dateTime={item?.updatedAt || item?.createdAt || undefined}>
                            {formatCommunityDate(item?.updatedAt || item?.createdAt)}
                          </time>
                        </span>
                      </span>

                      <span className="flex items-center justify-between gap-3 pl-[52px] sm:justify-end sm:pl-0">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${badgeClass}`}>
                          {getStatusLabel(item?.status, 'Đang cập nhật')}
                        </span>
                        <Lucide.ChevronRight size={15} className="text-[var(--public-muted)] transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <aside className="p-5 sm:p-6" aria-label="Bản đồ sự cố công khai">
          <CompactPublicIncidentMap
            items={previewItems}
            loading={loading}
            error={error}
          />
        </aside>
      </div>
    </section>
  );
};

export const Dashboard = () => {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);
  const navigate = useNavigate();

  const [cachedDashboard] = useState(() => (
    currentRole === APP_ROLES.ADMINISTRATOR
      ? readAdminDashboardCache()
      : readDashboardSnapshot()
  ));
  const [stats, setStats] = useState(
    () => cachedDashboard?.stats || SAFE_DASHBOARD_STATS
  );
  const [tickets, setTickets] = useState(
    () => Array.isArray(cachedDashboard?.tickets)
      ? cachedDashboard.tickets
      : []
  );
  const [ticketTotal, setTicketTotal] = useState(() => {
    const cachedTotal = Number(cachedDashboard?.ticketTotal);
    if (Number.isFinite(cachedTotal)) return cachedTotal;
    return Array.isArray(cachedDashboard?.tickets)
      ? cachedDashboard.tickets.length
      : 0;
  });
  const [feedbackSummary, setFeedbackSummary] = useState(() => (
    cachedDashboard?.feedbackSummary || calculateAdminFeedbackSummary(
      cachedDashboard?.tickets || [],
      cachedDashboard?.ticketTotal
    )
  ));
  const [categories, setCategories] = useState(
    () => Array.isArray(cachedDashboard?.categories)
      ? cachedDashboard.categories
      : []
  );
  const [areas, setAreas] = useState(
    () => Array.isArray(cachedDashboard?.areas)
      ? cachedDashboard.areas
      : []
  );
  const [selectedAreaId, setSelectedAreaId] = useState(
    readTrackedAreaId
  );
  const [loading, setLoading] = useState(!cachedDashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [communityAreaCount, setCommunityAreaCount] = useState(0);
  const [
    communityAreaCountLoading,
    setCommunityAreaCountLoading,
  ] = useState(false);
  const [showStaffFilter, setShowStaffFilter] = useState(false);
  const [staffFilter, setStaffFilter] = useState('all');
  const dashboardRequestIdRef = useRef(0);

  const fetchScopedTickets = useCallback(async () => {
    if (!user) return { items: [], totalItems: 0 };

    if (currentRole === APP_ROLES.SERVICE_USER) {
      const response = await axiosClient.get('/api/user/feedbacks', {
        params: {
          PageNumber: 1,
          PageSize: 1000,
        },
      });
      return normalizeTicketPage(response);
    }

    if (currentRole === APP_ROLES.SERVICE_PROVIDER) {
      const response = await ticketApi.getTickets(
        { operatorId: user.operatorId },
        { role: currentRole }
      );
      return normalizeTicketPage(response);
    }

    if (currentRole === APP_ROLES.SYSTEM_STAFF) {
      const response = await managementFeedbackApi.getFeedbacks({
        pageIndex: 0,
        pageSize: 10,
      });
      return normalizeTicketPage(response);
    }

    if (currentRole === APP_ROLES.ADMINISTRATOR) {
      const summary = await managementFeedbackApi.getFeedbackSummary();
      return {
        items: Array.isArray(summary?.items) ? summary.items : [],
        totalItems: Number(summary?.total) || 0,
        feedbackSummary: summary,
      };
    }

    const response = await ticketApi.getTickets(
      {},
      { role: currentRole }
    );
    return normalizeTicketPage(response);
  }, [currentRole, user]);

  useEffect(() => {
    if (!user) return;

    const loadDashboardContent = async () => {
      const requestId = ++dashboardRequestIdRef.current;
      const hasCachedContent = Boolean(cachedDashboard);

      if (hasCachedContent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [
          resStats,
          fetchedCategories,
          fetchedAreas,
          ticketPage,
        ] = await Promise.all([
          currentRole === APP_ROLES.SERVICE_USER
            ? Promise.resolve(SAFE_DASHBOARD_STATS)
            : analyticsApi.getSystemDashboardStats(currentRole),
          toolsApi.getCategories().catch(() => []),
          currentRole === APP_ROLES.SERVICE_USER
            ? toolsApi.getAreas().catch(() => [])
            : Promise.resolve([]),
          fetchScopedTickets(),
        ]);
        const nextStats = normalizeDashboardStats(resStats);
        const nextCategories = Array.isArray(fetchedCategories)
          ? fetchedCategories
          : [];
        const nextAreas = Array.isArray(fetchedAreas)
          ? fetchedAreas
          : [];
        const nextTickets = Array.isArray(ticketPage?.items)
          ? ticketPage.items
          : [];
        const nextTicketTotal = Number.isFinite(
          Number(ticketPage?.totalItems)
        )
          ? Number(ticketPage.totalItems)
          : nextTickets.length;
        const nextFeedbackSummary = currentRole === APP_ROLES.ADMINISTRATOR
          ? {
            ...calculateAdminFeedbackSummary(nextTickets, nextTicketTotal),
            ...(ticketPage?.feedbackSummary || {}),
          }
          : null;

        if (requestId !== dashboardRequestIdRef.current) return;

        setStats(nextStats);
        setCategories(nextCategories);
        setAreas(nextAreas);
        setTickets(nextTickets);
        setTicketTotal(nextTicketTotal);
        if (currentRole === APP_ROLES.ADMINISTRATOR) {
          setFeedbackSummary(nextFeedbackSummary);
        }

        if (currentRole === APP_ROLES.SERVICE_USER) {
          writeDashboardSnapshot({
            stats: nextStats,
            categories: nextCategories,
            areas: nextAreas,
            tickets: nextTickets,
            ticketTotal: nextTicketTotal,
          });
        } else if (currentRole === APP_ROLES.ADMINISTRATOR) {
          writeAdminDashboardCache({
            stats: nextStats,
            categories: nextCategories,
            tickets: nextTickets,
            ticketTotal: nextTicketTotal,
            feedbackSummary: nextFeedbackSummary,
          });
        }
      } catch (err) {
        if (requestId !== dashboardRequestIdRef.current) return;

        console.error(err);

        if (!hasCachedContent) {
          setStats(SAFE_DASHBOARD_STATS);
          setCategories([]);
          setAreas([]);
          setTickets([]);
          setTicketTotal(0);
        }
      } finally {
        if (requestId === dashboardRequestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadDashboardContent();

    return () => {
      dashboardRequestIdRef.current += 1;
    };
  }, [
    user,
    currentRole,
    fetchScopedTickets,
    cachedDashboard,
  ]);

  // Realtime updates: refresh dashboard when tickets change.
  useEffect(() => {
    if (!user) return;
    signalrService.start();

    const reload = async () => {
      const requestId = ++dashboardRequestIdRef.current;

      try {
        const [resStats, fetchedCategories, ticketPage] = await Promise.all([
          currentRole === APP_ROLES.SERVICE_USER
            ? Promise.resolve(SAFE_DASHBOARD_STATS)
            : analyticsApi.getSystemDashboardStats(currentRole),
          toolsApi.getCategories().catch(() => []),
          fetchScopedTickets(),
        ]);
        const nextTickets = Array.isArray(ticketPage?.items)
          ? ticketPage.items
          : [];
        const nextTicketTotal = Number.isFinite(
          Number(ticketPage?.totalItems)
        )
          ? Number(ticketPage.totalItems)
          : nextTickets.length;

        const nextFeedbackSummary = currentRole === APP_ROLES.ADMINISTRATOR
          ? {
            ...calculateAdminFeedbackSummary(nextTickets, nextTicketTotal),
            ...(ticketPage?.feedbackSummary || {}),
          }
          : null;

        if (requestId !== dashboardRequestIdRef.current) return;

        const nextStats = normalizeDashboardStats(resStats);
        const nextCategories = Array.isArray(fetchedCategories)
          ? fetchedCategories
          : [];

        setStats(nextStats);
        setCategories(nextCategories);
        setTickets(nextTickets);
        setTicketTotal(nextTicketTotal);
        if (currentRole === APP_ROLES.ADMINISTRATOR) {
          setFeedbackSummary(nextFeedbackSummary);
          writeAdminDashboardCache({
            stats: nextStats,
            categories: nextCategories,
            tickets: nextTickets,
            ticketTotal: nextTicketTotal,
            feedbackSummary: nextFeedbackSummary,
          });
        }
      } catch (e) {
        if (requestId !== dashboardRequestIdRef.current) return;
        console.warn('Dashboard realtime reload failed', e);
      } finally {
        if (requestId === dashboardRequestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const relevantEvents = [
      'FeedbackStatusChanged',
      'CommentAdded',
      'SupportAdded',
      'AssignmentCreated',
      'AssignmentUpdated',
      'ResolutionApproved',
      'ResolutionSubmitted',
      'ResolutionRejected',
      'NotificationReceived',
    ];
    relevantEvents.forEach((eventName) => (
      signalrService.on(eventName, reload)
    ));

    return () => {
      relevantEvents.forEach((eventName) => (
        signalrService.off(eventName, reload)
      ));
      dashboardRequestIdRef.current += 1;
    };
  }, [user, currentRole, fetchScopedTickets]);

  useEffect(() => {
    if (
      currentRole !== APP_ROLES.SERVICE_USER ||
      areas.length === 0
    ) {
      return;
    }

    if (!selectedAreaId) return;

    const currentAreaExists = areas.some(
      (area) => (
        String(getAreaId(area)) === String(selectedAreaId)
      )
    );

    if (!currentAreaExists) {
      setSelectedAreaId('');
    }
  }, [areas, currentRole, selectedAreaId]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      currentRole !== APP_ROLES.SERVICE_USER
    ) {
      return;
    }

    try {
      if (selectedAreaId) {
        window.localStorage.setItem(
          DASHBOARD_AREA_STORAGE_KEY,
          String(selectedAreaId)
        );
      } else {
        window.localStorage.removeItem(
          DASHBOARD_AREA_STORAGE_KEY
        );
      }
    } catch {
      // Không chặn dashboard nếu trình duyệt không cho dùng storage.
    }
  }, [currentRole, selectedAreaId]);

  useEffect(() => {
    if (currentRole !== APP_ROLES.SERVICE_USER) return undefined;

    let cancelled = false;

    const loadCommunityAreaCount = async () => {
      setCommunityAreaCountLoading(true);

      try {
        const selectedArea = areas.find(
          (area) => String(getAreaId(area)) === String(selectedAreaId)
        );
        const selectedAreaName = selectedArea
          ? getAreaName(selectedArea)
          : '';
        const response = await getCommunityFeed({
          PageNumber: 1,
          PageSize: 1,
          ...(selectedAreaName ? { Search: selectedAreaName } : {}),
        });
        const nextCount = Number(
          response?.totalItems ?? response?.items?.length ?? 0
        );

        if (!cancelled) {
          setCommunityAreaCount(
            Number.isFinite(nextCount) ? nextCount : 0
          );
        }
      } catch (error) {
        console.warn(
          'Không thể tải số phản ánh công khai theo khu vực',
          error
        );

        if (!cancelled) {
          setCommunityAreaCount(0);
        }
      } finally {
        if (!cancelled) {
          setCommunityAreaCountLoading(false);
        }
      }
    };

    loadCommunityAreaCount();

    return () => {
      cancelled = true;
    };
  }, [areas, currentRole, selectedAreaId]);

  if (!stats) {
    return (
      <div className="flex justify-center py-20 bg-white rounded-3xl border border-slate-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Convert ticket priority string to Figma priority badge
  const renderPriorityBadge = (p) => {
    switch (p) {
      case 'Critical':
        return <span className="badge-priority-critical">KHẨN CẤP</span>;
      case 'High':
        return <span className="badge-priority-high">CAO</span>;
      case 'Medium':
        return <span className="badge-priority-medium">TRUNG BÌNH</span>;
      case 'Low':
        return <span className="badge-priority-low">THẤP</span>;
      default:
        return <span className="badge-priority-low">TRUNG BÌNH</span>;
    }
  };

  // Convert ticket status to Figma status bubble
  const renderStatusBadge = (s) => {
    switch (s) {
      case managementTypes.feedbackStatus.SUBMITTED:
        return <span className="circle-status-review">Cần review AI</span>;
      case managementTypes.feedbackStatus.AI_REVIEWED:
        return <span className="circle-status-pending">Chờ phân công</span>;
      case managementTypes.feedbackStatus.ASSIGNED:
        return <span className="circle-status-pending">Đã phân công</span>;
      case managementTypes.feedbackStatus.IN_PROGRESS:
        return <span className="circle-status-pending">Đang xử lý</span>;
      case managementTypes.feedbackStatus.RESOLVED:
        return <span className="circle-status-review">Chờ duyệt KQ</span>;
      case managementTypes.feedbackStatus.CLOSED:
        return <span className="circle-status-pending">Đã đóng</span>;
      default:
        return <span className="circle-status-pending">Chờ xử lý</span>;
    }
  };

  // Icon mapping helper
  const renderCategoryIcon = (catId) => {
    switch (catId) {
      case 1: return <Lucide.Trash className="text-emerald-500 shrink-0" size={14} />;
      case 2: return <Lucide.Lightbulb className="text-amber-500 shrink-0" size={14} />;
      case 3: return <Lucide.Droplet className="text-blue-500 shrink-0" size={14} />;
      case 4: return <Lucide.Construction className="text-indigo-500 shrink-0" size={14} />;
      case 5: return <Lucide.Trees className="text-green-500 shrink-0" size={14} />;
      default: return <Lucide.Construction className="text-slate-500 shrink-0" size={14} />;
    }
  };

  // Convert default fb- ticket ID to UM-2026-00xxx
  const formatTicketId = (fbId) => {
    if (!fbId) return '';
    const num = fbId.split('-').pop();
    return `UM-2026-00${num}`;
  };

  const getCategoryName = (categoryId) => {
    const matchedCategory = categories.find((category) => category.categoryId === categoryId);
    return getCategoryLabel(matchedCategory?.categoryName || matchedCategory?.name || matchedCategory?.categoryType || matchedCategory?.type, 'Khác');
  };

  const residentTickets = Array.isArray(tickets) ? tickets : [];
  const residentTotal = Math.max(ticketTotal, residentTickets.length);
  const residentInProgressStatuses = [
    managementTypes.feedbackStatus.VERIFIED,
    managementTypes.feedbackStatus.ASSIGNED,
    managementTypes.feedbackStatus.IN_PROGRESS,
    managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
    managementTypes.feedbackStatus.NEED_REWORK,
  ];

  const filteredStaffTickets = [...residentTickets].filter((ticket) => {
    if (staffFilter === 'needs-attention') {
      return [
        managementTypes.feedbackStatus.SUBMITTED,
        managementTypes.feedbackStatus.AI_REVIEWED,
        managementTypes.feedbackStatus.ASSIGNED,
        managementTypes.feedbackStatus.IN_PROGRESS,
      ].includes(ticket.status);
    }

    if (staffFilter === 'high-priority') {
      return ['Critical', 'High'].includes(ticket.priority);
    }

    return true;
  }).sort((a, b) => {
    if (staffFilter === 'latest') {
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    }

    return 0;
  });
  const residentInProgress = residentTickets.filter((ticket) => (
    residentInProgressStatuses.includes(ticket.status)
  )).length;
  const residentEnded = residentTickets.filter((ticket) => (
    ticket.status === managementTypes.feedbackStatus.CLOSED
  )).length;
  const needsReworkTickets = residentTickets.filter((ticket) => (
    ticket.status === managementTypes.feedbackStatus.NEED_REWORK
  ));
  const awaitingReviewTickets = residentTickets.filter((ticket) => (
    ticket.status === managementTypes.feedbackStatus.APPROVED
  ));
  const residentNeedsAttention = (
    needsReworkTickets.length + awaitingReviewTickets.length
  );
  const recentResidentTickets = [...residentTickets]
    .sort((a, b) => (
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0)
    ))
    .slice(0, 5);
  const attentionTickets = [
    ...needsReworkTickets,
    ...awaitingReviewTickets,
  ]
    .sort((a, b) => (
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0)
    ))
    .slice(0, 3);

  const selectedArea = areas.find(
    (area) => (
      String(getAreaId(area)) === String(selectedAreaId)
    )
  );
  const selectedAreaName = selectedArea
    ? getAreaName(selectedArea)
    : 'Chưa chọn khu vực';
  const selectedAreaTickets = selectedAreaId
    ? residentTickets.filter((ticket) => {
      const ticketAreaId = getTicketAreaId(ticket);

      if (ticketAreaId) {
        return (
          String(ticketAreaId) === String(selectedAreaId)
        );
      }

      return ticket?.areaName === selectedAreaName;
    })
    : residentTickets;
  const selectedAreaTicketUrl = selectedArea
    ? buildTicketListUrl({ search: selectedAreaName })
    : '/tickets';

  const getResidentStatusMeta = (status) => {
    const statusMap = {
      [managementTypes.feedbackStatus.SUBMITTED]: {
        label: 'Đã tiếp nhận',
        className: 'border-info/25 bg-info/10 text-info',
      },
      [managementTypes.feedbackStatus.AI_REVIEWED]: {
        label: 'Đang phân loại',
        className: 'border-secondary/25 bg-secondary/10 text-secondary',
      },
      [managementTypes.feedbackStatus.VERIFIED]: {
        label: 'Đã xác minh',
        className: 'border-info/25 bg-info/10 text-info',
      },
      [managementTypes.feedbackStatus.ASSIGNED]: {
        label: 'Đã chuyển xử lý',
        className: 'border-primary/25 bg-primary/10 text-primary',
      },
      [managementTypes.feedbackStatus.IN_PROGRESS]: {
        label: 'Đang xử lý',
        className: 'border-warning/25 bg-warning/10 text-warning',
      },
      [managementTypes.feedbackStatus.RESOLVED]: {
        label: 'Đang kiểm tra kết quả',
        className: 'border-warning/25 bg-warning/10 text-warning',
      },
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: {
        label: 'Đang kiểm tra kết quả',
        className: 'border-warning/25 bg-warning/10 text-warning',
      },
      [managementTypes.feedbackStatus.APPROVED]: {
        label: 'Chờ bạn đánh giá',
        className: 'border-success/25 bg-success/10 text-success',
      },
      [managementTypes.feedbackStatus.NEED_REWORK]: {
        label: 'Đang bổ sung',
        className: 'border-warning/25 bg-warning/10 text-warning',
      },
      [managementTypes.feedbackStatus.REJECTED]: {
        label: 'Không tiếp nhận',
        className: 'border-error/25 bg-error/10 text-error',
      },
      [managementTypes.feedbackStatus.CLOSED]: {
        label: 'Đã kết thúc',
        className: 'border-success/25 bg-success/10 text-success',
      },
      [managementTypes.feedbackStatus.CANCELLED]: {
        label: 'Đã hủy',
        className: 'border-base-300 bg-base-200 text-base-content/60',
      },
    };

    return statusMap[status] || {
      label: 'Đang cập nhật',
      className: 'border-base-300 bg-base-200 text-base-content/70',
    };
  };

  const formatResidentDate = (value) => {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ----------------------------------------------------
  // 1. SERVICE USER DASHBOARD
  // ----------------------------------------------------
  if (currentRole === 'service-user') {
    if (loading) {
      return (
        <main
          className="space-y-6 text-[var(--public-title)]"
          aria-busy="true"
          aria-label="Đang tải trang chủ"
        >
          <span className="sr-only" role="status">
            Đang tải dữ liệu trang chủ
          </span>

          <section className="overflow-hidden rounded-[32px] border border-[var(--public-border)] bg-[var(--public-surface)] p-5 shadow-[var(--public-shadow)] sm:p-7">
            <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.72fr)] xl:items-end">
              <div className="animate-pulse">
                <div className="h-7 w-36 rounded-full bg-slate-200/80 dark:bg-white/10" />
                <div className="mt-5 h-11 w-64 max-w-full rounded-xl bg-slate-200/80 dark:bg-white/10" />
                <div className="mt-4 h-4 w-full max-w-xl rounded-full bg-slate-100 dark:bg-white/[0.07]" />
                <div className="mt-2 h-4 w-4/5 max-w-lg rounded-full bg-slate-100 dark:bg-white/[0.07]" />
                <div className="mt-6 flex gap-3">
                  <div className="h-11 w-36 rounded-xl bg-slate-200/80 dark:bg-white/10" />
                  <div className="h-11 w-40 rounded-xl bg-slate-100 dark:bg-white/[0.07]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className={`h-28 animate-pulse rounded-[22px] border border-[var(--public-border)] bg-[var(--public-surface-soft)] ${item === 2 ? 'col-span-2 sm:col-span-1' : ''}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="h-36 animate-pulse rounded-[28px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" aria-hidden="true" />

          <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.65fr)]">
            <div className="h-[430px] animate-pulse rounded-[28px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" aria-hidden="true" />
            <div className="h-[430px] animate-pulse rounded-[28px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" aria-hidden="true" />
          </section>

          <section className="h-[430px] animate-pulse rounded-[30px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" aria-hidden="true" />
        </main>
      );
    }

    return (
      <PublicPageMotion>
        <CitizenDashboardThemeStyles />
        <main
          data-public-reveal
          className="citizen-dashboard-page relative isolate space-y-5 text-[var(--public-title)]"
          aria-busy={refreshing}
        >
          <div
            className="citizen-dashboard-page-shell pointer-events-none absolute -inset-x-3 -inset-y-5 -z-10 overflow-hidden rounded-[36px] border border-[var(--public-border-soft)] bg-[linear-gradient(180deg,var(--public-surface-soft),transparent)] sm:-inset-x-5 sm:-inset-y-6"
            aria-hidden="true"
          />
          {refreshing ? (
          <div
            className="fixed right-5 top-24 z-40 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-[var(--public-surface-strong)] px-3 py-2 text-xs font-semibold text-blue-700 shadow-lg backdrop-blur "
            role="status"
            aria-live="polite"
          >
            <span className="loading loading-spinner loading-xs" />
            Đang đồng bộ trang chủ
          </div>
        ) : null}

          <section
            data-public-reveal
            className="citizen-dashboard-hero relative isolate overflow-hidden rounded-[30px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[var(--public-shadow)]"
          aria-labelledby="citizen-dashboard-title"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="citizen-dashboard-hero-backdrop absolute inset-0" />
            <svg
              viewBox="0 0 1280 410"
              preserveAspectRatio="none"
              className="citizen-dashboard-hero-map absolute inset-0 h-full w-full"
              fill="none"
            >
              <path d="M-40 282C120 238 178 128 322 126C450 124 488 220 623 217C762 214 814 112 955 109C1097 106 1168 199 1328 166" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M-15 343C168 310 244 220 377 228C518 236 597 319 733 305C863 292 919 218 1037 216C1161 214 1216 269 1310 287" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="10 12" opacity="0.78" />
              <circle cx="322" cy="126" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="623" cy="217" r="9" fill="currentColor" opacity="0.65" />
              <circle cx="955" cy="109" r="8" fill="currentColor" opacity="0.8" />
              <circle cx="1037" cy="216" r="10" fill="currentColor" opacity="0.55" />
            </svg>
            <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-blue-500/[0.08] blur-3xl" />
            <div className="absolute -right-16 top-4 h-72 w-72 rounded-full bg-cyan-500/[0.08] blur-3xl" />
          </div>

          <div className="relative grid gap-8 px-5 py-7 sm:px-8 sm:py-9 xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.72fr)] xl:items-end">
            <header className="max-w-2xl">
              <h1
                id="citizen-dashboard-title"
                className="text-3xl font-semibold tracking-[-0.035em] text-[var(--public-title)] sm:text-4xl lg:text-[44px]"
              >
                Chào, {user?.fullName || 'Bạn'}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--public-copy)] sm:text-base sm:leading-7">
                Theo dõi phản ánh, cập nhật tiến độ và những thông tin đô thị liên quan đến bạn trong cùng một nơi.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="/tickets/create"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  <Lucide.Plus size={17} aria-hidden="true" />
                  Gửi phản ánh
                </Link>
                <Link
                  to="/tickets"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-5 text-sm font-semibold text-[var(--public-title)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:text-primary"
                >
                  <Lucide.Files size={17} aria-hidden="true" />
                  Phản ánh của tôi
                </Link>
              </div>

              <div className="mt-5">
                {residentNeedsAttention > 0 ? (
                  <a
                    href="#citizen-attention"
                    className="inline-flex items-center gap-2 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15"
                  >
                    <Lucide.BellRing size={14} aria-hidden="true" />
                    {residentNeedsAttention} việc đang chờ bạn kiểm tra
                    <Lucide.ArrowDown size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                    <Lucide.CircleCheck size={14} aria-hidden="true" />
                    Hiện không có việc cần bạn bổ sung
                  </span>
                )}
              </div>
            </header>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <li>
                <Link
                  to="/tickets"
                  className="group block h-full rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)]/90 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                >
                  <span className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                    Tổng phản ánh
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                    <Lucide.Files size={15} />
                  </span>
                  </span>
                  <strong className="mt-2 block text-3xl font-bold tracking-[-0.035em] text-base-content">
                    {residentTotal}
                  </strong>
                  <span className="mt-1 block text-[11px] text-base-content/40 transition group-hover:text-primary">
                    Xem toàn bộ hồ sơ
                  </span>
                </Link>
              </li>

              <li>
                <Link
                to={buildTicketListUrl({ status: 'processing' })}
                  className="group block h-full rounded-2xl border border-warning/25 bg-[var(--public-surface-strong)]/90 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-warning/40 hover:shadow-md"
                >
                  <span className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                    Đang xử lý
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/10 text-warning" aria-hidden="true">
                    <Lucide.LoaderCircle size={15} />
                  </span>
                  </span>
                  <strong className="mt-2 block text-3xl font-bold tracking-[-0.035em] text-warning">
                    {residentInProgress}
                  </strong>
                  <span className="mt-1 block text-[11px] text-base-content/40 transition group-hover:text-warning">
                    Theo dõi tiến độ
                  </span>
                </Link>
              </li>

              <li className="col-span-2 sm:col-span-1">
                <Link
                to={buildTicketListUrl({ status: 'ended' })}
                  className="group block h-full rounded-2xl border border-success/25 bg-[var(--public-surface-strong)]/90 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-success/40 hover:shadow-md"
                >
                  <span className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                    Đã kết thúc
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success" aria-hidden="true">
                    <Lucide.CircleCheckBig size={15} />
                  </span>
                  </span>
                  <strong className="mt-2 block text-3xl font-bold tracking-[-0.035em] text-success">
                    {residentEnded}
                  </strong>
                  <span className="mt-1 block text-[11px] text-base-content/40 transition group-hover:text-success">
                    Xem kết quả đã xử lý
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <section
          data-public-reveal
          id="citizen-attention"
          className={`citizen-dashboard-panel overflow-hidden rounded-[24px] border bg-[var(--public-surface)] shadow-[0_12px_30px_rgba(15,23,42,0.055)] ${residentNeedsAttention > 0
              ? 'border-warning/30'
              : 'border-success/30'
            }`}
          aria-labelledby="citizen-attention-title"
        >
          <header className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-start gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${residentNeedsAttention > 0
                  ? 'bg-warning/10 text-warning'
                  : 'bg-success/10 text-success'
                }`} aria-hidden="true">
                {residentNeedsAttention > 0 ? <Lucide.BellRing size={20} /> : <Lucide.ShieldCheck size={20} />}
              </span>
              <div>
                <h2 id="citizen-attention-title" className="text-lg font-semibold text-[var(--public-title)]">
                  {residentNeedsAttention > 0 ? 'Việc cần bạn chú ý' : 'Mọi việc đang được theo dõi'}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--public-copy)]">
                  {residentNeedsAttention > 0
                    ? `${needsReworkTickets.length} phản ánh cần bổ sung và ${awaitingReviewTickets.length} phản ánh chờ đánh giá.`
                    : 'Hiện không có phản ánh nào cần bạn bổ sung hoặc đánh giá kết quả.'}
                </p>
              </div>
            </div>

            <Link
              to="/notifications"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 text-sm font-semibold text-[var(--public-title)] transition hover:border-primary/35 hover:text-primary"
            >
              <Lucide.Bell size={15} aria-hidden="true" />
              Xem thông báo
            </Link>
          </header>

          {attentionTickets.length > 0 ? (
            <ol className="grid gap-3 border-t border-warning/20 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              {attentionTickets.map((ticket) => {
                const feedbackId = ticket.feedbackId || ticket.id;
                const needsRework = ticket.status === managementTypes.feedbackStatus.NEED_REWORK;
                const targetPath = needsRework
                  ? `/tickets/${feedbackId}/rework`
                  : `/tickets/${feedbackId}/result`;

                return (
                  <li key={feedbackId}>
                    <Link
                      to={targetPath}
                      className="group flex h-full items-start gap-3 rounded-2xl border border-warning/25 bg-[var(--public-surface-soft)] p-4 transition hover:-translate-y-0.5 hover:border-warning/40 hover:bg-[var(--public-surface-strong)] hover:shadow-md"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning" aria-hidden="true">
                        {needsRework ? <Lucide.FileWarning size={17} /> : <Lucide.Star size={17} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">
                          {needsRework ? 'Cần bổ sung' : 'Chờ đánh giá'}
                        </span>
                        <strong className="mt-1 block line-clamp-2 text-sm font-semibold leading-5 text-[var(--public-title)] transition group-hover:text-warning">
                          {ticket.title || 'Phản ánh chưa có tiêu đề'}
                        </strong>
                      </span>
                      <Lucide.ArrowUpRight size={15} className="mt-1 shrink-0 text-warning/45 transition group-hover:text-warning" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </section>

        <section data-public-reveal className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.65fr)]">
          <article
            className="citizen-dashboard-panel flex h-full min-h-[440px] flex-col overflow-hidden rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
            aria-labelledby="recent-feedback-title"
          >
            <header className="flex min-h-[126px] flex-col gap-4 border-b border-[var(--public-border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Hoạt động của bạn
                </p>
                <h2 id="recent-feedback-title" className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--public-title)]">
                  Phản ánh gần đây
                </h2>
                <p className="mt-2 text-sm text-[var(--public-copy)]">
                  Năm hồ sơ có cập nhật mới nhất.
                </p>
              </div>

              <Link
                to="/tickets"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Xem tất cả
                <Lucide.ArrowRight size={15} aria-hidden="true" />
              </Link>
            </header>

            {recentResidentTickets.length === 0 ? (
              <section className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
                  <Lucide.FilePlus2 size={27} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-[var(--public-title)]">
                  Bạn chưa gửi phản ánh nào
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--public-copy)]">
                  Khi phát hiện vấn đề đô thị, hãy gửi thông tin và hình ảnh để hệ thống tiếp nhận và theo dõi tiến độ.
                </p>
                <Link
                  to="/tickets/create"
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  <Lucide.Plus size={16} aria-hidden="true" />
                  Gửi phản ánh đầu tiên
                </Link>
              </section>
            ) : (
              <ol className="flex-1 divide-y divide-[var(--public-border)]">
                {recentResidentTickets.map((ticket) => {
                  const feedbackId = ticket.feedbackId || ticket.id;
                  const statusMeta = getResidentStatusMeta(ticket.status);
                  const updatedAt = ticket.updatedAt || ticket.createdAt;

                  return (
                    <li key={feedbackId}>
                      <Link
                        to={`/tickets/${feedbackId}`}
                        className="group grid gap-3 px-5 py-4 transition-colors hover:bg-[var(--public-surface-soft)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7"
                      >
                        <article className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
                            <Lucide.MapPin size={17} />
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--public-title)] transition-colors group-hover:text-primary">
                                {ticket.title || 'Phản ánh chưa có tiêu đề'}
                              </h3>
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                                {statusMeta.label}
                              </span>
                            </div>

                            <p className="mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-[var(--public-muted)]">
                              <Lucide.MapPin size={13} className="shrink-0 text-primary" aria-hidden="true" />
                              <span className="truncate">
                                {ticket.areaName || 'Chưa xác định khu vực'}
                              </span>
                            </p>
                          </div>
                        </article>

                        <div className="flex items-center justify-between gap-3 pl-[56px] sm:justify-end sm:pl-0">
                          <time className="whitespace-nowrap text-xs text-[var(--public-muted)]" dateTime={updatedAt || undefined}>
                            {formatResidentDate(updatedAt)}
                          </time>
                          <Lucide.ChevronRight size={16} className="text-[var(--public-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </article>

          <aside
            className="citizen-dashboard-panel flex h-full min-h-[440px] flex-col overflow-hidden rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
            aria-labelledby="tracked-area-title"
          >
            <div className="flex min-h-[126px] items-center border-b border-[var(--public-border)] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info" aria-hidden="true">
                  <Lucide.MapPinHouse size={19} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-info">
                    Khu vực của bạn
                  </p>
                  <h2 id="tracked-area-title" className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--public-title)]">
                    Khu vực đang theo dõi
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <TrackedAreaSelector
                areas={areas}
                value={selectedAreaId}
                onChange={setSelectedAreaId}
              />

              <p className="mt-4 text-xs leading-5 text-[var(--public-muted)]">
                {selectedArea
                  ? `Số liệu phản ánh của bạn và cộng đồng tại ${selectedAreaName}.`
                  : 'Số liệu tổng hợp phản ánh của bạn và cộng đồng trên toàn hệ thống.'}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  to={selectedAreaTicketUrl}
                  className="group rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] p-4 transition hover:border-primary/35 hover:bg-[var(--public-surface-strong)]"
                >
                  <span className="text-[11px] font-medium text-[var(--public-muted)]">
                    Phản ánh của bạn
                  </span>
                  <strong className="mt-1 block text-2xl font-bold text-[var(--public-title)]">
                    {selectedAreaTickets.length}
                  </strong>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    Xem phản ánh của tôi
                    <Lucide.ChevronRight size={12} aria-hidden="true" />
                  </span>
                </Link>

                <Link
                  to="/community/feed"
                  state={{
                    resetFeedScroll: true,
                    initialQuery: selectedArea ? selectedAreaName : '',
                  }}
                  className="group rounded-2xl border border-info/25 bg-[var(--public-surface-soft)] p-4 transition hover:border-info/40 hover:bg-[var(--public-surface-strong)]"
                  aria-label={selectedArea
                    ? `Xem phản ánh công khai tại ${selectedAreaName}`
                    : 'Xem phản ánh công khai trên bảng tin'}
                >
                  <span className="text-[11px] font-medium text-[var(--public-muted)]">
                    Phản ánh trong khu vực
                  </span>
                  <strong className="mt-1 block text-2xl font-bold text-info">
                    {communityAreaCountLoading ? (
                      <span
                        className="inline-block h-7 w-8 animate-pulse rounded-lg bg-info/15"
                        aria-label="Đang tải số liệu"
                      />
                    ) : (
                      communityAreaCount
                    )}
                  </strong>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-info">
                    Xem bảng tin
                    <Lucide.ChevronRight size={12} aria-hidden="true" />
                  </span>
                </Link>
              </div>

            </div>
          </aside>
        </section>

          <CitizenCommunityPreview />
        </main>
      </PublicPageMotion>
    );
  }

  // ----------------------------------------------------
  // 2. SYSTEM STAFF DASHBOARD (Figma: Không gian làm việc - Nhân viên.png)
  // ----------------------------------------------------
  if (currentRole === 'system-staff') {
    return (
      <div className="page-container space-y-6 text-slate-800">

        {/* Header Greeting */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900">Không gian làm việc</h2>
          <p className="text-xs font-semibold text-slate-500">Xin chào, {user.fullName}. Bạn có thể kiểm tra phản ánh mới, xác nhận phân loại AI và phân công xử lý.</p>
        </div>

        {/* 5 Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Lucide.Folder size={18} />
              </div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">+12%</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">18</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Phản ánh mới</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Lucide.Cpu size={18} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Review</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">9</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Cần review AI</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-red-50 text-red-600">
                <Lucide.AlertTriangle size={18} />
              </div>
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">High</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">4</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Nghi trùng lặp</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Lucide.UserPlus size={18} />
              </div>
              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">Task</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">6</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Chờ phân công</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Lucide.CheckSquare size={18} />
              </div>
              <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">Approval</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">3</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Chờ duyệt KQ</span>
            </div>
          </div>
        </div>

        {/* Dynamic Data Table "Phản ánh cần xử lý" */}
        <div className="card bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900">Phản ánh cần xử lý</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowStaffFilter((value) => !value)}
                className="btn btn-sm btn-outline border-slate-300 rounded-xl text-xs font-bold text-slate-600 h-9 min-h-0 flex gap-1.5 items-center"
              >
                <Lucide.SlidersHorizontal size={14} />
                Bộ lọc
              </button>
              <button className="btn btn-sm bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-dark)] text-white border-none rounded-xl text-xs font-bold h-9 min-h-0">
                Xuất báo cáo
              </button>
            </div>
          </div>

          {showStaffFilter ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Tùy chọn lọc
                </span>
                <button
                  type="button"
                  onClick={() => setStaffFilter('latest')}
                  className={`btn btn-xs rounded-full border-slate-300 ${staffFilter === 'latest' ? 'bg-[color:var(--brand-primary)] text-white' : 'bg-white text-slate-700'}`}
                >
                  Mới nhất
                </button>
                <button
                  type="button"
                  onClick={() => setStaffFilter('needs-attention')}
                  className={`btn btn-xs rounded-full border-slate-300 ${staffFilter === 'needs-attention' ? 'bg-[color:var(--brand-primary)] text-white' : 'bg-white text-slate-700'}`}
                >
                  Cần xử lý
                </button>
                <button
                  type="button"
                  onClick={() => setStaffFilter('high-priority')}
                  className={`btn btn-xs rounded-full border-slate-300 ${staffFilter === 'high-priority' ? 'bg-[color:var(--brand-primary)] text-white' : 'bg-white text-slate-700'}`}
                >
                  Ưu tiên cao
                </button>
                <button
                  type="button"
                  onClick={() => setStaffFilter('all')}
                  className={`btn btn-xs rounded-full border-slate-300 ${staffFilter === 'all' ? 'bg-[color:var(--brand-primary)] text-white' : 'bg-white text-slate-700'}`}
                >
                  Tất cả
                </button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto w-full text-xs">
            <table className="table w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <th className="py-3">Mã phản ánh</th>
                  <th className="py-3">Nội dung</th>
                  <th className="py-3">Loại AI gợi ý</th>
                  <th className="py-3">Mức độ ưu tiên</th>
                  <th className="py-3">Trạng thái</th>
                  <th className="py-3">Thời gian gửi</th>
                  <th className="py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaffTickets.slice(0, 4).map((t) => (
                  <tr key={t.feedbackId} className="hover:bg-slate-50/50">
                    <td className="font-bold text-[color:var(--brand-primary)] py-3.5">{formatTicketId(t.feedbackId)}</td>
                    <td className="max-w-[200px] font-semibold py-3.5 text-slate-700">
                      <div className="truncate">{t.title}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        {renderCategoryIcon(t.categoryId)}
                        <span>{getCategoryName(t.categoryId)}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      {renderPriorityBadge(t.priority)}
                    </td>
                    <td className="py-3.5">
                      {renderStatusBadge(t.status)}
                    </td>
                    <td className="font-bold text-slate-400 py-3.5">
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(t.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="text-right py-3.5">
                      <Link to={`/staff/feedbacks/${t.feedbackId}`} className="text-[color:var(--brand-primary)] hover:underline font-bold">Chi tiết</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. SERVICE PROVIDER DASHBOARD (service-provider)
  // ----------------------------------------------------
  if (currentRole === 'service-provider') {
    const activeStatuses = [managementTypes.feedbackStatus.ASSIGNED, managementTypes.feedbackStatus.IN_PROGRESS];
    const waitingStatuses = [managementTypes.feedbackStatus.ASSIGNED];
    const inProgressStatuses = [managementTypes.feedbackStatus.IN_PROGRESS];
    const reviewStatuses = [managementTypes.feedbackStatus.RESOLVED];

    const assigned = tickets.filter(t => activeStatuses.includes(t.status));
    const waitingTasks = tickets.filter(t => waitingStatuses.includes(t.status));
    const inProgressTasks = tickets.filter(t => inProgressStatuses.includes(t.status));
    const reviewTasks = tickets.filter(t => reviewStatuses.includes(t.status));
    const visibleTasks = [...assigned, ...reviewTasks].slice(0, 5);

    const getOperatorStatusLabel = status => {
      switch (status) {
        case managementTypes.feedbackStatus.ASSIGNED:
          return 'Chờ tiếp nhận';
        case managementTypes.feedbackStatus.IN_PROGRESS:
          return 'Đang xử lý';
        case managementTypes.feedbackStatus.RESOLVED:
          return 'Chờ nghiệm thu';
        case managementTypes.feedbackStatus.CLOSED:
          return 'Hoàn tất';
        default:
          return 'Chờ xử lý';
      }
    };

    const getCategoryName = categoryId => {
      const matchedCategory = categories.find(c => c.categoryId === categoryId);
      return getCategoryLabel(matchedCategory?.categoryName || matchedCategory?.name || matchedCategory?.categoryType || matchedCategory?.type, 'Chưa phân loại');
    };

    const operatorStats = [
      {
        label: 'Tổng nhiệm vụ',
        value: tickets.length,
        helper: 'Phiếu được gán cho đơn vị',
        icon: Lucide.ClipboardList,
        iconClassName: 'bg-primary/10 text-primary',
      },
      {
        label: 'Chờ tiếp nhận',
        value: waitingTasks.length,
        helper: 'Cần xác nhận xử lý',
        icon: Lucide.BellRing,
        iconClassName: 'bg-warning/10 text-warning',
      },
      {
        label: 'Đang xử lý',
        value: inProgressTasks.length,
        helper: 'Đã nhận và đang thực hiện',
        icon: Lucide.Wrench,
        iconClassName: 'bg-info/10 text-info',
      },
      {
        label: 'Chờ nghiệm thu',
        value: reviewTasks.length,
        helper: 'Đã báo hoàn thành',
        icon: Lucide.CheckCircle2,
        iconClassName: 'bg-success/10 text-success',
      },
    ];

    const workflowSteps = [
      {
        title: 'Tiếp nhận',
        description: 'Xác nhận nhiệm vụ được giao.',
        icon: Lucide.Handshake,
      },
      {
        title: 'Di chuyển',
        description: 'Cập nhật trạng thái tới hiện trường.',
        icon: Lucide.Route,
      },
      {
        title: 'Xử lý',
        description: 'Thực hiện sửa chữa và ghi nhận tiến độ.',
        icon: Lucide.Wrench,
      },
      {
        title: 'Báo hoàn thành',
        description: 'Gửi ghi chú và ảnh nghiệm thu.',
        icon: Lucide.Camera,
      },
    ];

    return (
      <div className="page-container space-y-6 text-base-content">
        <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                  <Lucide.HardHat size={14} />
                  Trung tâm xử lý
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                    Bảng điều hành đơn vị xử lý
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                    Theo dõi nhiệm vụ được giao, cập nhật tiến độ hiện trường và gửi kết quả hoàn thành cho hệ thống UrbanMind.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-base-content/40">
                    Trạng thái
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Sẵn sàng nhận việc
                  </div>
                </div>

                <Link
                  to="/provider/tasks"
                  className="btn btn-primary rounded-2xl px-5 text-xs font-black shadow-lg shadow-primary/20"
                >
                  <Lucide.ArrowRight size={17} />
                  Mở nhiệm vụ được giao
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {operatorStats.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-base-content/40">
                      {item.label}
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-base-content">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-base-content/50">
                      {item.helper}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${item.iconClassName}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
          <div className="rounded-[1.75rem] border border-base-300 bg-base-100 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-base-300 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-base-content">Nhiệm vụ ưu tiên</h3>
                <p className="mt-1 text-sm font-medium text-base-content/55">
                  Các phiếu đang cần đơn vị cập nhật tiến độ hoặc báo hoàn thành.
                </p>
              </div>
              <Link to="/provider/tasks" className="btn btn-outline btn-sm rounded-xl text-xs font-black">
                Xem tất cả
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-success/10 text-success">
                  <Lucide.CheckCircle2 size={28} />
                </div>
                <h4 className="mt-5 text-lg font-black text-base-content">Chưa có nhiệm vụ cần xử lý</h4>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-base-content/55">
                  Khi hệ thống phân công phản ánh cho đơn vị, danh sách nhiệm vụ sẽ xuất hiện tại đây. Bạn vẫn có thể mở màn nhiệm vụ để kiểm tra chi tiết.
                </p>
                <Link to="/provider/tasks" className="btn btn-primary mt-5 rounded-2xl px-5 text-xs font-black">
                  <Lucide.ClipboardList size={16} />
                  Mở nhiệm vụ được giao
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {visibleTasks.map(task => (
                  <button
                    key={task.feedbackId}
                    type="button"
                    onClick={() => navigate('/provider/tasks')}
                    className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-base-200/70 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        {renderCategoryIcon(task.categoryId)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-primary">{formatTicketId(task.feedbackId)}</span>
                          <span className="rounded-full border border-base-300 px-2.5 py-1 text-[11px] font-black text-base-content/60">
                            {getCategoryName(task.categoryId)}
                          </span>
                        </div>
                        <h4 className="mt-2 truncate text-sm font-black text-base-content">{task.title}</h4>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-base-content/45">
                          <Lucide.MapPin size={13} />
                          {task.locationText || 'Chưa có địa chỉ chi tiết'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-[11px] font-black text-primary">
                        {getOperatorStatusLabel(task.status)}
                      </span>
                      <Lucide.ChevronRight size={18} className="text-base-content/35" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-base-content">Quy trình xử lý</h3>
                  <p className="mt-1 text-sm font-medium text-base-content/55">Các bước cập nhật trạng thái tại hiện trường.</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Lucide.Workflow size={20} />
                </div>
              </div>

              <div className="space-y-3">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-200 text-primary">
                        <Icon size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-base-content">
                          {index + 1}. {step.title}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-base-content/55">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-warning/20 bg-warning/10 p-5 text-warning-content shadow-sm">
              <div className="flex items-start gap-3">
                <Lucide.AlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-black">Lưu ý vận hành</h4>
                  <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
                    Khi hoàn thành xử lý, hãy gửi mô tả kết quả và ảnh nghiệm thu để bộ phận kiểm duyệt xác nhận trước khi đóng phản ánh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ----------------------------------------------------
  // 4. INTERACTION MANAGER DASHBOARD (interaction-manager)
  // ----------------------------------------------------
  if (currentRole === 'interaction-manager') {
    const managerTickets = Array.isArray(tickets) ? tickets : [];
    const pendingApprovals = managerTickets.filter((ticket) => ticket.status === managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL);
    const needRework = managerTickets.filter((ticket) => ticket.status === managementTypes.feedbackStatus.NEED_REWORK);
    const activeInteractions = managerTickets.filter((ticket) => [
      managementTypes.feedbackStatus.VERIFIED,
      managementTypes.feedbackStatus.ASSIGNED,
      managementTypes.feedbackStatus.IN_PROGRESS,
      managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
      managementTypes.feedbackStatus.NEED_REWORK,
    ].includes(ticket.status));
    const completedInteractions = managerTickets.filter((ticket) => [
      managementTypes.feedbackStatus.APPROVED,
      managementTypes.feedbackStatus.CLOSED,
    ].includes(ticket.status));
    const managerTopCategories = Array.isArray(stats.categoryDistribution)
      ? stats.categoryDistribution.slice(0, 4)
      : [];
    const managerQuickLinks = [
      {
        title: 'Giám sát tương tác',
        description: 'Theo dõi luồng phản ánh, bình luận và trạng thái phối hợp.',
        to: '/manager/interactions',
        icon: Lucide.MessagesSquare,
      },
      {
        title: 'Hàng đợi duyệt',
        description: 'Đối chiếu kết quả xử lý và ra quyết định phê duyệt.',
        to: '/manager/approvals',
        icon: Lucide.GitPullRequestArrow,
      },
      {
        title: 'Phân tích SLA',
        description: 'Xác định điểm nghẽn và dịch vụ có nguy cơ trễ hạn.',
        to: '/analytics/sla',
        icon: Lucide.TimerReset,
      },
      {
        title: 'Cảm xúc người dân',
        description: 'Theo dõi tín hiệu hài lòng và phản hồi tiêu cực.',
        to: '/analytics/sentiment',
        icon: Lucide.BrainCircuit,
      },
      {
        title: 'Bản đồ điểm nóng',
        description: 'Khoanh vùng khu vực có mật độ phản ánh cao.',
        to: '/analytics/heatmap',
        icon: Lucide.MapPinned,
      },
    ];

    return (
      <article className="admin-page-shell space-y-6">
        <ManagerPageHeader
          title="Trung tâm phân tích trải nghiệm đô thị"
          description="Theo dõi xu hướng phản hồi, giám sát tương tác và xác định cơ hội cải thiện dịch vụ."
          icon={Lucide.ScanSearch}
          statusLabel="Hồ sơ chờ quyết định"
          statusValue={`${pendingApprovals.length} phản ánh`}
          actions={(
            <Link to="/manager/approvals" className="btn admin-primary-action rounded-2xl">
              <Lucide.BadgeCheck size={17} aria-hidden="true" />
              Mở hàng đợi duyệt
            </Link>
          )}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số quản lý tương tác">
          <ManagerMetricCard
            label="Luồng đang hoạt động"
            value={activeInteractions.length}
            description="Phản ánh đang xác minh, phối hợp hoặc xử lý."
            icon={Lucide.Workflow}
            toneClass="bg-blue-50 text-blue-700"
          />
          <ManagerMetricCard
            label="Chờ duyệt"
            value={pendingApprovals.length}
            description="Kết quả cần Manager ra quyết định."
            icon={Lucide.ClipboardCheck}
            toneClass="bg-emerald-50 text-emerald-700"
          />
          <ManagerMetricCard
            label="Cần làm lại"
            value={needRework.length}
            description="Hồ sơ đã trả về để Staff bổ sung."
            icon={Lucide.RotateCcw}
            toneClass="bg-amber-50 text-amber-700"
          />
          <ManagerMetricCard
            label="Đã hoàn tất"
            value={completedInteractions.length}
            description="Phản ánh đã duyệt hoặc đã đóng."
            icon={Lucide.CircleCheckBig}
            toneClass="bg-cyan-50 text-cyan-700"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <section className="space-y-6" aria-label="Phân tích trải nghiệm">
            <figure className="admin-panel overflow-hidden">
              <ManagerSectionHeader
                title="Tổng quan cảm xúc"
                description="Phân bố sắc thái phản hồi để nhận diện biến động trong trải nghiệm người dân."
                icon={Lucide.ChartPie}
                actions={<Link to="/analytics/sentiment" className="admin-secondary-link inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold">Xem chi tiết <Lucide.ArrowRight size={14} /></Link>}
              />
              <section className="p-5 sm:p-6">
                <SentimentDonutChart
                  positive={stats.sentimentTrend.Positive}
                  neutral={stats.sentimentTrend.Neutral}
                  negative={stats.sentimentTrend.Negative}
                />
              </section>
              <figcaption className="border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
                CSAT hiện tại: {stats.csatScore}/5 · Thời gian xử lý trung bình: {stats.avgResolutionTimeHours} giờ.
              </figcaption>
            </figure>

            <article className="admin-panel overflow-hidden">
              <ManagerSectionHeader
                title="Nhóm dịch vụ cần chú ý"
                description="Ưu tiên danh mục có khối lượng cao để phân tích nguyên nhân và cơ hội cải thiện."
                icon={Lucide.Tags}
                actions={<Link to="/analytics/sla" className="admin-secondary-link inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold">Phân tích SLA <Lucide.ArrowRight size={14} /></Link>}
              />
              {managerTopCategories.length > 0 ? (
                <ol className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
                  {managerTopCategories.map((category, index) => (
                    <li key={category.categoryId || category.name || index}>
                      <article className="admin-inset-panel flex items-center justify-between gap-4 p-4">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700" aria-hidden="true">{index + 1}</span>
                          <span className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-950">{getCategoryLabel(category.categoryName || category.name || category.categoryType || category.type, 'Chưa phân loại')}</h3>
                            <p className="mt-1 text-xs text-slate-500">Khối lượng phản ánh trong dữ liệu tổng hợp</p>
                          </span>
                        </span>
                        <strong className="text-lg font-semibold text-blue-700">{category.count ?? category.value ?? 0}</strong>
                      </article>
                    </li>
                  ))}
                </ol>
              ) : (
                <section className="admin-empty-panel m-5 p-8 text-center text-sm text-slate-500 sm:m-6">Chưa có dữ liệu phân bố danh mục.</section>
              )}
            </article>
          </section>

          <aside className="space-y-6" aria-label="Điều hướng công việc Manager">
            <article className="admin-panel overflow-hidden">
              <ManagerSectionHeader
                title="Không gian làm việc"
                description="Truy cập nhanh các chức năng theo đúng nhiệm vụ Interaction Manager."
                icon={Lucide.LayoutGrid}
              />
              <nav className="grid gap-3 p-5 sm:p-6" aria-label="Chức năng Interaction Manager">
                {managerQuickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.to} to={item.to} className="admin-quick-link group flex items-start gap-3 p-4 transition">
                      <span className="admin-mini-icon text-blue-700" aria-hidden="true"><Icon size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold text-slate-950">{item.title}</strong>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                      </span>
                      <Lucide.ChevronRight size={16} className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true" />
                    </Link>
                  );
                })}
              </nav>
            </article>

            <article className="admin-panel overflow-hidden">
              <ManagerSectionHeader
                title="Tín hiệu cần hành động"
                description="Các chỉ số nên được kiểm tra trước trong phiên làm việc."
                icon={Lucide.BellRing}
              />
              <dl className="space-y-3 p-5 sm:p-6">
                <div className="admin-inset-panel p-4">
                  <dt className="text-xs font-semibold text-slate-500">Vi phạm SLA</dt>
                  <dd className="mt-1 text-xl font-semibold text-rose-700">{stats.slaBreaches}</dd>
                </div>
                <div className="admin-inset-panel p-4">
                  <dt className="text-xs font-semibold text-slate-500">Tỷ lệ hoàn thành</dt>
                  <dd className="mt-1 text-xl font-semibold text-emerald-700">{stats.processingRate}%</dd>
                </div>
                <div className="admin-inset-panel p-4">
                  <dt className="text-xs font-semibold text-slate-500">Trạng thái AI</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{stats.aiStatus || 'Chưa xác định'}</dd>
                </div>
              </dl>
            </article>
          </aside>
        </section>
      </article>
    );
  }

  // ----------------------------------------------------
  // 5. ADMINISTRATOR DASHBOARD (administrator)
  // ----------------------------------------------------
  if (currentRole === 'administrator') {
    const adminTickets = Array.isArray(tickets) ? tickets : [];
    const recentTickets = adminTickets.slice(0, 5);
    const adminMetrics = ADMIN_FEEDBACK_METRICS.map((metric) => ({
      ...metric,
      value: feedbackSummary?.[metric.key] ?? 0,
      icon: Lucide[metric.icon] || Lucide.Circle,
      tone: {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      }[metric.tone],
      to: `/management/feedbacks?metric=${metric.key}`,
    }));


    const categoryDistribution = Array.isArray(stats.categoryDistribution)
      ? stats.categoryDistribution.map((item, index) => ({
        id: Number(item.categoryId ?? item.id ?? index + 1),
        name: getCategoryLabel(item.categoryName || item.name || item.label, `Danh mục ${index + 1}`),
        count: Number(item.count ?? item.value ?? item.total ?? 0),
      }))
      : [];
    const totalCategoryTickets = categoryDistribution.reduce((sum, item) => sum + item.count, 0);
    const maxCategoryCount = Math.max(...categoryDistribution.map(item => item.count), 1);
    const hasLowCategoryData = totalCategoryTickets > 0 && totalCategoryTickets <= 5;

    return (
      <div className="admin-page-shell space-y-6">
        <section className="admin-page-hero">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="admin-hero-icon">
                <Lucide.LayoutDashboard size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="admin-hero-title">
                  Tổng quan hệ thống
                </h2>
                <p className="admin-hero-description">
                  Theo dõi tài khoản, phản ánh, vị trí sự cố, danh mục và chính sách SLA trên một màn hình thống nhất.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
              <Link to="/management/feedbacks" className="admin-primary-action btn rounded-xl px-5 text-sm font-semibold normal-case">
                <Lucide.MessageSquare size={17} />
                Quản lý phản ánh
              </Link>
              <Link to="/management/users" className="admin-secondary-action btn rounded-xl px-5 text-sm font-semibold normal-case">
                <Lucide.UserCog size={17} />
                Quản lý tài khoản
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {adminMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <Link key={metric.label} to={metric.to} className="admin-stat-card group p-5 transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${metric.tone}`}>
                    <Icon size={20} />
                  </div>
                  <Lucide.ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-blue-600" />
                </div>
                <div className="mt-5 space-y-1">
                  <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                  <p className="text-2xl font-semibold text-slate-950">{metric.value}</p>
                  <p className="text-xs text-slate-400">{metric.helper}</p>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="admin-panel overflow-hidden p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="admin-section-title">Bản đồ phản ánh</h3>
              <p className="admin-section-description">Quan sát nhanh các phản ánh có tọa độ và mở bản đồ điều hành đầy đủ.</p>
            </div>
            <Link to="/management/map#admin-incident-map" state={{ focusMap: true }} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
              Mở bản đồ lớn
              <Lucide.Maximize2 size={14} />
            </Link>
          </div>
          <div className="h-[360px]">
            <CompactPublicIncidentMap
              items={adminTickets}
              loading={loading}
              fullMapPath="/management/map#admin-incident-map"
              detailPathBuilder={(feedbackId) => `/management/feedbacks/${feedbackId}`}
              detailStateBuilder={() => ({ from: '/dashboard' })}
              mapLabel="Bản đồ phản ánh"
            />
          </div>
        </section>

        <section>
          <div className="admin-panel p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="admin-section-title">Phân bổ phản ánh theo danh mục</h3>
                <p className="admin-section-description">Tổng hợp khối lượng phản ánh để Admin kiểm tra danh mục phản ánh.</p>
              </div>
              <Link to="/management/categories" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                Danh mục phản ánh
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>
            <div className="admin-inset-panel p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tổng phản ánh</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{categoryDistribution.length > 0 ? totalCategoryTickets : '—'}</p>
                </div>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${categoryDistribution.length === 0 ? 'border-slate-200 bg-slate-50 text-slate-500' : hasLowCategoryData ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {categoryDistribution.length === 0 ? 'Chờ dữ liệu thống kê' : hasLowCategoryData ? 'Dữ liệu còn ít' : 'Dữ liệu trực tiếp'}
                </span>
              </div>

              {categoryDistribution.length === 0 ? (
                <div className="admin-empty-panel flex min-h-[220px] flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Lucide.BarChart3 size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có dữ liệu thống kê theo danh mục</p>
                  <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                    Khu vực này đã sẵn sàng nhận dữ liệu từ API thống kê. Khi backend trả về categoryId, categoryName và count, danh sách sẽ hiển thị tự động.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryDistribution.map((category) => {
                    const percent = Math.round((category.count / maxCategoryCount) * 100);
                    const barWidth = category.count === 0 ? '0%' : `${Math.max(percent, 12)}%`;

                    return (
                      <div key={`${category.id}-${category.name}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                              {renderCategoryIcon(category.id)}
                            </div>
                            <span className="truncate text-xs font-semibold text-slate-800">{category.name}</span>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-slate-950">
                            {category.count}
                            <span className="ml-1 text-[10px] font-medium text-slate-400">phiếu</span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${category.count === 0 ? 'bg-transparent' : 'bg-gradient-to-r from-blue-600 to-violet-600'}`}
                            style={{ width: barWidth }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasLowCategoryData && (
                <div className="admin-warning-note mt-4 p-3 text-[11px] leading-5">
                  Dữ liệu hiện còn ít nên hệ thống ưu tiên hiển thị dạng danh sách để tránh biểu đồ bị phóng đại.
                </div>
              )}
            </div>
          </div>

        </section>

        <section>
          <div className="admin-panel p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="admin-section-title">Phản ánh mới nhất</h3>
                <p className="admin-section-description">Dữ liệu tổng hợp để Admin giám sát luồng vận hành.</p>
              </div>
              <Link to="/management/feedbacks" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                Quản lý phản ánh
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>

            <div className="admin-table-wrap overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="admin-table-head border-b text-[10px] font-semibold uppercase tracking-wider">
                      <th className="py-3">Mã</th>
                      <th className="py-3">Nội dung</th>
                      <th className="py-3">Danh mục</th>
                      <th className="py-3">Ưu tiên</th>
                      <th className="py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="admin-table-body divide-y">
                    {recentTickets.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-xs font-medium text-slate-400">
                          Chưa có dữ liệu phản ánh để hiển thị.
                        </td>
                      </tr>
                    ) : (
                      recentTickets.map((ticket) => (
                        <tr
                          key={ticket.feedbackId}
                          className="admin-table-row cursor-pointer transition-colors hover:bg-blue-50/60 focus-within:bg-blue-50/60"
                          onClick={() => navigate(`/management/feedbacks/${ticket.feedbackId}`, { state: { from: '/dashboard', feedback: ticket } })}
                        >
                          <td className="py-3.5 font-semibold text-blue-700">
                            <button
                              type="button"
                              className="text-left font-semibold text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/management/feedbacks/${ticket.feedbackId}`, { state: { from: '/dashboard', feedback: ticket } });
                              }}
                            >
                              {formatTicketId(ticket.feedbackId)}
                            </button>
                          </td>
                          <td className="max-w-[240px] py-3.5 font-medium text-slate-700">
                            <div className="truncate">{ticket.title}</div>
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              {renderCategoryIcon(ticket.categoryId)}
                              <span className="truncate">
                                {getCategoryName(ticket.categoryId)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5">{renderPriorityBadge(ticket.priority)}</td>
                          <td className="py-3.5">{renderStatusBadge(ticket.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </section>
      </div>
    );
  }

  return null;
};
