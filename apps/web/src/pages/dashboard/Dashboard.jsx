// src/pages/dashboard/Dashboard.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { analyticsApi } from '../../services/api/analyticsApi';
import { toolsApi, managementFeedbackApi } from '@urbanmind/shared-api';
import { SentimentDonutChart } from '../../components/charts/CustomCharts';
import * as Lucide from 'lucide-react';
import { normalizeRole } from '../../utils/roleMap';
import { APP_ROLES, managementTypes } from '@urbanmind/shared-types';
import { signalrService } from '../../services/socket/signalrService';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';

const DASHBOARD_AREA_STORAGE_KEY =
  'urbanmind-dashboard-tracked-area-id';
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
              : 'Chưa chọn khu vực'}
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
          {areas.length === 0 ? (
            <li className="px-3 py-3 text-sm text-base-content/45">
              Chưa có khu vực
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

export const Dashboard = () => {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);
  const navigate = useNavigate();

  const [cachedDashboard] = useState(readDashboardSnapshot);
  const [stats, setStats] = useState(
    () => cachedDashboard?.stats || SAFE_DASHBOARD_STATS
  );
  const [tickets, setTickets] = useState(
    () => Array.isArray(cachedDashboard?.tickets)
      ? cachedDashboard.tickets
      : []
  );
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

  const fetchScopedTickets = useCallback(async () => {
    try {
      if (!user) return [];

      if (currentRole === APP_ROLES.SERVICE_USER) {
        return await ticketApi.getTickets(
          {
            userId: user.userId,
            pageNumber: 1,
            pageSize: 100,
          },
          { role: currentRole }
        );
      }

      if (currentRole === APP_ROLES.SERVICE_PROVIDER) {
        return await ticketApi.getTickets({ operatorId: user.operatorId }, { role: currentRole });
      }

      if (currentRole === APP_ROLES.SYSTEM_STAFF) {
        const response = await managementFeedbackApi.getFeedbacks({ pageIndex: 0, pageSize: 10 });
        if (response && Array.isArray(response.items)) {
          return response.items;
        }
        return Array.isArray(response) ? response : [];
      }

      return await ticketApi.getTickets({}, { role: currentRole });
    } catch (err) {
      console.warn('Dashboard ticket loading failed, using empty list', err);
      return [];
    }
  }, [currentRole, user]);

  useEffect(() => {
    if (!user) return;

    const loadDashboardContent = async () => {
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
        ] = await Promise.all([
          analyticsApi.getSystemDashboardStats(currentRole),
          toolsApi.getCategories().catch(() => []),
          currentRole === APP_ROLES.SERVICE_USER
            ? toolsApi.getAreas().catch(() => [])
            : Promise.resolve([]),
        ]);
        const nextStats = normalizeDashboardStats(resStats);
        const nextCategories = Array.isArray(fetchedCategories)
          ? fetchedCategories
          : [];
        const nextAreas = Array.isArray(fetchedAreas)
          ? fetchedAreas
          : [];
        const resTickets = await fetchScopedTickets();
        const nextTickets = normalizeTicketCollection(resTickets);

        setStats(nextStats);
        setCategories(nextCategories);
        setAreas(nextAreas);
        setTickets(nextTickets);

        if (currentRole === APP_ROLES.SERVICE_USER) {
          writeDashboardSnapshot({
            stats: nextStats,
            categories: nextCategories,
            areas: nextAreas,
            tickets: nextTickets,
          });
        }
      } catch (err) {
        console.error(err);

        if (!hasCachedContent) {
          setStats(SAFE_DASHBOARD_STATS);
          setCategories([]);
          setAreas([]);
          setTickets([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    loadDashboardContent();
  }, [
    user,
    currentRole,
    fetchScopedTickets,
    cachedDashboard,
  ]);

  // realtime updates: refresh dashboard when tickets change
  useEffect(() => {
    if (!user) return;
    signalrService.start();
    const reload = async () => {
      try {
        const [resStats, fetchedCategories] = await Promise.all([
          analyticsApi.getSystemDashboardStats(currentRole),
          toolsApi.getCategories().catch(() => []),
        ]);
        setStats(normalizeDashboardStats(resStats));
        setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
        const resTickets = await fetchScopedTickets();
        setTickets(normalizeTicketCollection(resTickets));
      } catch (e) {
        console.warn('Dashboard realtime reload failed', e);
      }
    };

    const relevantEvents = ['FeedbackStatusChanged', 'CommentAdded', 'SupportAdded', 'AssignmentCreated', 'AssignmentUpdated', 'ResolutionApproved', 'ResolutionSubmitted', 'ResolutionRejected', 'NotificationReceived'];
    relevantEvents.forEach((ev) => signalrService.on(ev, reload));

    return () => {
      relevantEvents.forEach((ev) => signalrService.off(ev, reload));
    };
  }, [user, currentRole, fetchScopedTickets]);

  useEffect(() => {
    if (
      currentRole !== APP_ROLES.SERVICE_USER ||
      areas.length === 0
    ) {
      return;
    }

    const currentAreaExists = areas.some(
      (area) => (
        String(getAreaId(area)) === String(selectedAreaId)
      )
    );

    if (currentAreaExists) return;

    const latestTicketWithArea = [...tickets]
      .sort((firstTicket, secondTicket) => (
        new Date(
          secondTicket?.updatedAt ||
          secondTicket?.createdAt ||
          0
        ) -
        new Date(
          firstTicket?.updatedAt ||
          firstTicket?.createdAt ||
          0
        )
      ))
      .find((ticket) => (
        getTicketAreaId(ticket) ||
        ticket?.areaName
      ));

    const ticketAreaId = getTicketAreaId(latestTicketWithArea);
    const matchedArea = ticketAreaId
      ? areas.find(
        (area) => (
          String(getAreaId(area)) === String(ticketAreaId)
        )
      )
      : areas.find(
        (area) => (
          getAreaName(area) === latestTicketWithArea?.areaName
        )
      );
    const fallbackArea = matchedArea || areas[0];
    const fallbackAreaId = getAreaId(fallbackArea);

    setSelectedAreaId(
      fallbackAreaId === undefined ||
        fallbackAreaId === null
        ? ''
        : String(fallbackAreaId)
    );
  }, [areas, currentRole, selectedAreaId, tickets]);

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
    return categories.find((category) => category.categoryId === categoryId)?.categoryName || 'Khác';
  };

  const residentTickets = Array.isArray(tickets) ? tickets : [];
  const residentInProgressStatuses = [
    managementTypes.feedbackStatus.VERIFIED,
    managementTypes.feedbackStatus.ASSIGNED,
    managementTypes.feedbackStatus.IN_PROGRESS,
    managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
    managementTypes.feedbackStatus.NEED_REWORK,
  ];
  const residentInProgress = residentTickets.filter((ticket) => (
    residentInProgressStatuses.includes(ticket.status)
  )).length;
  const residentEnded = residentTickets.filter((ticket) => (
    ticket.status === managementTypes.feedbackStatus.CLOSED
  )).length;
  const residentNeedsAttention = residentTickets.filter((ticket) => (
    [
      managementTypes.feedbackStatus.NEED_REWORK,
      managementTypes.feedbackStatus.APPROVED,
    ].includes(ticket.status)
  )).length;
  const recentResidentTickets = [...residentTickets]
    .sort((a, b) => (
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0)
    ))
    .slice(0, 5);
  const attentionTickets = [...residentTickets]
    .filter((ticket) => (
      [
        managementTypes.feedbackStatus.NEED_REWORK,
        managementTypes.feedbackStatus.APPROVED,
      ].includes(ticket.status)
    ))
    .sort((a, b) => (
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0)
    ))
    .slice(0, 2);

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
    : [];
  const selectedAreaClosed = selectedAreaTickets.filter(
    (ticket) => (
      ticket.status === managementTypes.feedbackStatus.CLOSED
    )
  ).length;
  const selectedAreaTicketUrl = selectedArea
    ? buildTicketListUrl({ search: selectedAreaName })
    : '/tickets';
  const selectedAreaEndedUrl = selectedArea
    ? buildTicketListUrl({
      status: 'ended',
      search: selectedAreaName,
    })
    : buildTicketListUrl({ status: 'ended' });

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
          className="space-y-5 text-base-content"
          aria-busy="true"
          aria-label="Đang tải trang chủ"
        >
          <span className="sr-only" role="status">
            Đang tải dữ liệu trang chủ
          </span>

          <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-base-100 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.09)] sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="animate-pulse">
                <div className="h-4 w-28 rounded-full bg-base-300/60" />
                <div className="mt-4 h-9 w-56 rounded-xl bg-base-300/75" />
                <div className="mt-3 h-4 w-full max-w-xl rounded-lg bg-base-300/50" />
                <div className="mt-2 h-4 w-4/5 max-w-lg rounded-lg bg-base-300/40" />
                <div className="mt-5 h-9 w-44 rounded-full bg-base-300/50" />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-hidden="true">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="min-w-[118px] animate-pulse rounded-2xl border border-base-300 bg-base-200/55 px-4 py-4"
                  >
                    <div className="h-3 w-16 rounded bg-base-300/60" />
                    <div className="mt-3 h-8 w-12 rounded-lg bg-base-300/75" />
                    <div className="mt-2 h-3 w-20 rounded bg-base-300/40" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-3 rounded-[26px] border border-base-300 bg-base-100 p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl border border-base-300 bg-base-200/45"
                aria-hidden="true"
              />
            ))}
          </section>

          <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
            <article className="overflow-hidden rounded-[26px] border border-base-300 bg-base-100 shadow-sm">
              <header className="border-b border-base-300 px-5 py-4 sm:px-6">
                <div className="h-6 w-40 animate-pulse rounded-lg bg-base-300/70" />
                <div className="mt-2 h-3 w-52 animate-pulse rounded bg-base-300/45" />
              </header>

              <div className="divide-y divide-base-300" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse items-center gap-3 px-5 py-4 sm:px-6"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-base-300/55" />
                    <div className="min-w-0 flex-1">
                      <div className="h-4 w-48 max-w-[70%] rounded bg-base-300/70" />
                      <div className="mt-2 h-3 w-32 rounded bg-base-300/45" />
                    </div>
                    <div className="h-3 w-20 rounded bg-base-300/45" />
                  </div>
                ))}
              </div>
            </article>

            <aside className="space-y-5" aria-hidden="true">
              <section className="h-44 animate-pulse rounded-[26px] border border-base-300 bg-base-100 shadow-sm" />
              <section className="h-72 animate-pulse rounded-[26px] border border-base-300 bg-base-100 shadow-sm" />
            </aside>
          </section>
        </main>
      );
    }

    return (
      <main
        className="space-y-5 text-base-content"
        aria-busy={refreshing}
      >
        {refreshing ? (
          <div
            className="fixed right-5 top-24 z-40 inline-flex items-center gap-2 rounded-full border border-info/20 bg-base-100/95 px-3 py-2 text-xs font-semibold text-info shadow-lg backdrop-blur"
            role="status"
            aria-live="polite"
          >
            <span className="loading loading-spinner loading-xs" />
            Đang đồng bộ trang chủ
          </div>
        ) : null}
        <section
          className="relative overflow-hidden rounded-[30px] border border-secondary/16 bg-gradient-to-br from-base-100 via-secondary/[0.035] to-primary/[0.08] shadow-[0_20px_54px_rgba(15,23,42,0.09)]"
          aria-labelledby="citizen-dashboard-title"
        >
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 1280 360"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full text-secondary opacity-[0.18]"
              fill="none"
            >
              <path
                d="M-40 250C120 215 178 118 322 116C450 114 488 198 623 197C762 195 814 104 955 101C1097 98 1168 181 1328 151"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M-15 304C168 278 244 197 377 204C518 211 597 286 733 274C863 264 919 196 1037 195C1161 194 1216 242 1310 258"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeDasharray="10 12"
                opacity="0.8"
              />
              <path
                d="M911 -16C890 58 916 118 977 150C1031 178 1124 175 1174 131C1223 88 1220 22 1278 -14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.75"
              />
              <circle cx="322" cy="116" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="623" cy="197" r="9" fill="currentColor" opacity="0.65" />
              <circle cx="955" cy="101" r="8" fill="currentColor" opacity="0.8" />
              <circle cx="1037" cy="195" r="10" fill="currentColor" opacity="0.55" />
              <circle cx="1174" cy="131" r="28" stroke="currentColor" strokeWidth="1.25" opacity="0.4" />
            </svg>

            <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-secondary/[0.07] blur-3xl" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/[0.08] blur-3xl" />

            <span className="absolute left-[43%] top-[24%] flex h-8 w-8 items-center justify-center rounded-full border border-secondary/10 bg-base-100/60 text-secondary/40 shadow-sm backdrop-blur">
              <Lucide.MapPin size={14} />
            </span>
            <span className="absolute right-[28%] top-[38%] flex h-8 w-8 items-center justify-center rounded-full border border-primary/10 bg-base-100/60 text-primary/40 shadow-sm backdrop-blur">
              <Lucide.Radio size={14} />
            </span>
            <span className="absolute right-[15%] top-[18%] flex h-8 w-8 items-center justify-center rounded-full border border-success/10 bg-base-100/60 text-success/40 shadow-sm backdrop-blur">
              <Lucide.CircleCheck size={14} />
            </span>
          </div>

          <div className="relative grid gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <header className="max-w-2xl">
              <h1
                id="citizen-dashboard-title"
                className="mt-4 text-3xl font-bold tracking-tight text-base-content sm:text-4xl"
              >
                Chào, {user?.fullName || 'Bạn'}!
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-base-content/60">
                Theo dõi tiến độ, xem các cập nhật mới và kết nối nhanh với những thông tin đô thị liên quan đến bạn.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {residentNeedsAttention > 0 ? (
                  <Link
                    to="/tickets"
                    className="inline-flex items-center gap-2 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15"
                  >
                    <Lucide.BellRing size={14} aria-hidden="true" />
                    {residentNeedsAttention} việc cần bạn kiểm tra
                    <Lucide.ArrowRight size={13} aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                    <Lucide.CircleCheck size={14} aria-hidden="true" />
                    Không có việc đang chờ
                  </span>
                )}
              </div>
            </header>

            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              <Link
                to="/tickets"
                className="group min-w-[118px] rounded-2xl border border-base-300 bg-base-100/85 px-4 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                  Tổng phản ánh
                  <Lucide.Files size={14} className="text-primary" aria-hidden="true" />
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-base-content">
                  {residentTickets.length}
                </dd>
                <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-primary">
                  Xem toàn bộ
                </span>
              </Link>

              <Link
                to={buildTicketListUrl({ status: 'processing' })}
                className="group min-w-[118px] rounded-2xl border border-warning/20 bg-warning/5 px-4 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-warning/35 hover:shadow-md"
              >
                <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                  Đang xử lý
                  <Lucide.LoaderCircle size={14} className="text-warning" aria-hidden="true" />
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-warning">
                  {residentInProgress}
                </dd>
                <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-warning">
                  Theo dõi tiến độ
                </span>
              </Link>

              <Link
                to={buildTicketListUrl({ status: 'ended' })}
                className="group min-w-[118px] rounded-2xl border border-success/20 bg-success/5 px-4 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-success/35 hover:shadow-md"
              >
                <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                  Đã kết thúc
                  <Lucide.CircleCheckBig
                    size={14}
                    className="text-success"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-success">
                  {residentEnded}
                </dd>
                <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-success">
                  Xem hồ sơ đã kết thúc
                </span>
              </Link>
            </dl>
          </div>
        </section>

        <section
          className="relative grid gap-3 overflow-hidden rounded-[26px] border border-base-300 bg-base-100 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:grid-cols-2 xl:grid-cols-[1.15fr_repeat(3,minmax(0,1fr))]"
          aria-labelledby="urban-pulse-title"
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div className="absolute -left-12 top-0 h-32 w-32 rounded-full bg-secondary/[0.045] blur-2xl" />
            <svg
              viewBox="0 0 1200 180"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full text-primary opacity-[0.08]"
              fill="none"
            >
              <path
                d="M0 122C138 96 174 38 302 46C441 55 512 141 646 142C784 144 843 74 980 68C1063 64 1124 82 1200 108"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeDasharray="8 12"
              />
            </svg>
          </div>
          <header className="relative flex items-center gap-3 rounded-2xl bg-gradient-to-br from-secondary/10 to-primary/8 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-sm">
              <Lucide.Activity size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 id="urban-pulse-title" className="text-sm font-bold">
                Nhịp đô thị của bạn
              </h2>
              <p className="mt-0.5 text-xs text-base-content/48">
                Tổng quan nhanh từ các phản ánh gần đây.
              </p>
            </div>
          </header>

          <Link
            to={selectedAreaTicketUrl}
            className="group flex items-center gap-3 rounded-2xl border border-base-300 px-4 py-3 transition hover:border-primary/25 hover:bg-primary/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
              <Lucide.Files size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-base-content/45">
                Phản ánh tại khu vực
              </span>
              <strong className="mt-0.5 block text-lg font-bold">
                {selectedAreaTickets.length}
              </strong>
            </span>
            <Lucide.ChevronRight
              size={15}
              className="text-base-content/25 group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>

          <Link
            to={selectedAreaEndedUrl}
            className="group flex items-center gap-3 rounded-2xl border border-base-300 px-4 py-3 transition hover:border-success/25 hover:bg-success/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
              <Lucide.CircleCheckBig size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-base-content/45">
                Đã kết thúc
              </span>
              <strong className="mt-0.5 block text-lg font-bold">
                {selectedAreaClosed}
              </strong>
            </span>
            <Lucide.ChevronRight
              size={15}
              className="text-base-content/25 group-hover:text-success"
              aria-hidden="true"
            />
          </Link>

          <TrackedAreaSelector
            areas={areas}
            value={selectedAreaId}
            onChange={setSelectedAreaId}
          />
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
          <article
            className="overflow-hidden rounded-[26px] border border-base-300 bg-base-100 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"
            aria-labelledby="recent-feedback-title"
          >
            <header className="flex flex-col gap-3 border-b border-base-300 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                  <Lucide.History size={18} />
                </span>
                <div>
                  <h2 id="recent-feedback-title" className="text-lg font-semibold text-base-content">
                    Phản ánh gần đây
                  </h2>
                  <p className="mt-1 text-xs text-base-content/50">
                    Năm hồ sơ có cập nhật mới nhất.
                  </p>
                </div>
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
              <section className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 text-primary" aria-hidden="true">
                  <Lucide.FilePlus2 size={24} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-base-content">
                  Bạn chưa gửi phản ánh nào
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-base-content/55">
                  Khi gặp vấn đề đô thị, hãy gửi thông tin và hình ảnh để đơn vị phụ trách tiếp nhận.
                </p>
                <Link to="/tickets/create" className="btn admin-primary-action mt-5 rounded-2xl">
                  <Lucide.Plus size={16} aria-hidden="true" />
                  Gửi phản ánh đầu tiên
                </Link>
              </section>
            ) : (
              <ol className="divide-y divide-base-300">
                {recentResidentTickets.map((ticket) => {
                  const feedbackId = ticket.feedbackId || ticket.id;
                  const statusMeta = getResidentStatusMeta(ticket.status);
                  const updatedAt = ticket.updatedAt || ticket.createdAt;

                  return (
                    <li key={feedbackId}>
                      <Link
                        to={`/tickets/${feedbackId}`}
                        className="group grid gap-3 px-5 py-4 transition-colors hover:bg-primary/[0.035] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                      >
                        <article className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/12 bg-primary/6 text-primary" aria-hidden="true">
                            <Lucide.MapPin size={16} />
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-base-content transition-colors group-hover:text-primary">
                                {ticket.title || 'Phản ánh chưa có tiêu đề'}
                              </h3>
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                                {statusMeta.label}
                              </span>
                            </div>

                            <p className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-base-content/50">
                              <Lucide.MapPin size={13} className="shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                {ticket.areaName || 'Chưa xác định khu vực'}
                              </span>
                            </p>
                          </div>
                        </article>

                        <div className="flex items-center justify-between gap-3 pl-[52px] sm:justify-end sm:pl-0">
                          <time className="whitespace-nowrap text-xs text-base-content/40" dateTime={updatedAt || undefined}>
                            {formatResidentDate(updatedAt)}
                          </time>
                          <Lucide.ChevronRight size={16} className="text-base-content/25 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </article>

          <aside className="space-y-5">
            {attentionTickets.length > 0 ? (
              <section className="overflow-hidden rounded-[26px] border border-warning/25 bg-gradient-to-br from-warning/8 via-base-100 to-warning/5 shadow-[0_14px_32px_rgba(15,23,42,0.07)]" aria-labelledby="attention-title">
                <header className="flex items-start gap-3 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/12 text-warning" aria-hidden="true">
                    <Lucide.BellRing size={18} />
                  </span>
                  <div>
                    <h2 id="attention-title" className="text-base font-semibold text-base-content">
                      Cần bạn xử lý
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-base-content/50">
                      {attentionTickets.length === 1
                        ? '1 hồ sơ đang chờ bạn kiểm tra.'
                        : `${attentionTickets.length} hồ sơ đang chờ bạn kiểm tra.`}
                    </p>
                  </div>
                </header>

                <ul className="divide-y divide-warning/15 border-t border-warning/15">
                  {attentionTickets.map((ticket) => {
                    const feedbackId = ticket.feedbackId || ticket.id;
                    const needsRework = ticket.status === managementTypes.feedbackStatus.NEED_REWORK;

                    return (
                      <li key={feedbackId}>
                        <Link to={`/tickets/${feedbackId}`} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-warning/8">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-100 text-warning shadow-sm" aria-hidden="true">
                            {needsRework ? <Lucide.FileWarning size={16} /> : <Lucide.Star size={16} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-semibold text-warning">
                              {needsRework ? 'Cần bổ sung thông tin' : 'Chờ bạn đánh giá'}
                            </span>
                            <strong className="mt-0.5 block truncate text-sm font-semibold text-base-content">
                              {ticket.title || 'Phản ánh chưa có tiêu đề'}
                            </strong>
                          </span>
                          <Lucide.ArrowUpRight size={15} className="shrink-0 text-base-content/30 group-hover:text-warning" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <section className="overflow-hidden rounded-[26px] border border-secondary/18 bg-gradient-to-br from-secondary/8 via-base-100 to-primary/5 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.07)]" aria-labelledby="area-summary-title">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary" aria-hidden="true">
                    <Lucide.MapPinHouse size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id="area-summary-title" className="text-base font-semibold text-base-content">
                      Khu vực đang theo dõi
                    </h2>
                    <p className="mt-1 truncate text-sm font-bold text-secondary">
                      {selectedAreaName}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-base-300/80 bg-base-100/80 px-3 py-3">
                    <p className="text-[11px] text-base-content/45">Phản ánh</p>
                    <p className="mt-1 text-xl font-bold">{selectedAreaTickets.length}</p>
                  </div>
                  <div className="rounded-2xl border border-base-300/80 bg-base-100/80 px-3 py-3">
                    <p className="text-[11px] text-base-content/45">Đã kết thúc</p>
                    <p className="mt-1 text-xl font-bold text-success">{selectedAreaClosed}</p>
                  </div>
                </div>

                <Link to="/community/map" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:underline">
                  Xem khu vực trên bản đồ
                  <Lucide.ArrowRight size={13} aria-hidden="true" />
                </Link>
              </section>
            )}

            <section className="rounded-[26px] border border-base-300 bg-base-100 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.07)]" aria-labelledby="quick-access-title">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                  <Lucide.LayoutGrid size={18} />
                </span>
                <div>
                  <h2 id="quick-access-title" className="text-base font-semibold text-base-content">
                    Truy cập nhanh
                  </h2>
                  <p className="mt-1 text-xs text-base-content/50">
                    Các khu vực thường dùng.
                  </p>
                </div>
              </div>

              <nav className="mt-4 grid gap-2" aria-label="Liên kết nhanh dành cho người dân">
                {[
                  {
                    to: '/community/feed',
                    title: 'Bảng tin cộng đồng',
                    description: 'Theo dõi thông tin đô thị mới.',
                    icon: Lucide.Newspaper,
                    className: 'bg-secondary/10 text-secondary',
                  },
                  {
                    to: '/community/map',
                    title: 'Bản đồ sự cố',
                    description: 'Xem vấn đề đang được phản ánh.',
                    icon: Lucide.Map,
                    className: 'bg-info/10 text-info',
                  },
                  {
                    to: '/notifications',
                    title: 'Trung tâm thông báo',
                    description: 'Xem các cập nhật mới nhất.',
                    icon: Lucide.Bell,
                    className: 'bg-warning/10 text-warning',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.to} to={item.to} className="group flex items-center gap-3 rounded-2xl border border-base-300 px-4 py-3 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.className}`} aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold text-base-content">{item.title}</strong>
                        <span className="mt-0.5 block text-xs text-base-content/45">{item.description}</span>
                      </span>
                      <Lucide.ChevronRight size={15} className="text-base-content/25 group-hover:text-primary" aria-hidden="true" />
                    </Link>
                  );
                })}
              </nav>
            </section>
          </aside>
        </section>
      </main>
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
              <button onClick={() => navigate('/staff/queue')} className="btn btn-sm btn-outline border-slate-300 rounded-xl text-xs font-bold text-slate-600 h-9 min-h-0 flex gap-1.5 items-center">
                <Lucide.SlidersHorizontal size={14} />
                Bộ lọc
              </button>
              <button className="btn btn-sm bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-dark)] text-white border-none rounded-xl text-xs font-bold h-9 min-h-0">
                Xuất báo cáo
              </button>
            </div>
          </div>

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
                {(Array.isArray(tickets) ? tickets.slice(0, 4) : []).map(t => (
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
      return categories.find(c => c.categoryId === categoryId)?.categoryName || 'Chưa phân loại';
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
                            <h3 className="truncate text-sm font-semibold text-slate-950">{category.categoryName || category.name || 'Chưa phân loại'}</h3>
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
    const storageUsageValue = stats.storageUsage?.split(' ')[0] || '0';
    const adminTickets = Array.isArray(tickets) ? tickets : [];
    const recentTickets = adminTickets.slice(0, 5);
    const openFeedbackCount = adminTickets.filter((ticket) => ![managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(ticket.status)).length;
    const resolvedFeedbackCount = adminTickets.filter((ticket) => [managementTypes.feedbackStatus.RESOLVED, managementTypes.feedbackStatus.CLOSED].includes(ticket.status)).length;
    const inProgressFeedbackCount = adminTickets.filter((ticket) => [managementTypes.feedbackStatus.ASSIGNED, managementTypes.feedbackStatus.IN_PROGRESS].includes(ticket.status)).length;

    const adminMetrics = [
      {
        label: 'Tài khoản',
        value: stats.totalUsers || 0,
        helper: 'Người dùng toàn hệ thống',
        icon: Lucide.Users,
        tone: 'bg-blue-50 text-blue-700 border-blue-100',
        to: '/management/users',
      },
      {
        label: 'Feedback đang mở',
        value: openFeedbackCount,
        helper: 'Cần theo dõi xử lý',
        icon: Lucide.MessageSquare,
        tone: 'bg-amber-50 text-amber-700 border-amber-100',
        to: '/management/feedbacks',
      },
      {
        label: 'Đang xử lý',
        value: inProgressFeedbackCount,
        helper: 'Đã phân công / đang thực hiện',
        icon: Lucide.RefreshCw,
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        to: '/management/feedbacks',
      },
      {
        label: 'Dung lượng DB',
        value: `${storageUsageValue} KB`,
        helper: 'Theo thống kê hệ thống',
        icon: Lucide.Database,
        tone: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        to: '/admin/performance',
      },
    ];

    const adminQuickLinks = [
      {
        title: 'Quản lý người dùng',
        description: 'Tài khoản, đổi vai trò và khóa/mở quyền truy cập.',
        to: '/management/users',
        icon: Lucide.Users,
      },
      {
        title: 'Quản lý feedback',
        description: 'Giám sát phản ánh, trạng thái, mức ưu tiên và dữ liệu media.',
        to: '/management/feedbacks',
        icon: Lucide.MessageSquare,
      },
      {
        title: 'Cấu hình SLA',
        description: 'Thiết lập ngưỡng xử lý và tiêu chuẩn phản hồi theo danh mục.',
        to: '/management/sla',
        icon: Lucide.TimerReset,
      },
      {
        title: 'Danh mục phản ánh',
        description: 'Quản lý nhóm sự cố, biểu tượng và mức độ ưu tiên mặc định.',
        to: '/management/categories',
        icon: Lucide.Tags,
      },
      {
        title: 'Nhật ký hệ thống',
        description: 'Theo dõi thao tác quản trị và các sự kiện quan trọng.',
        to: '/admin/audit',
        icon: Lucide.FileClock,
      },
    ];

    const healthItems = [
      { label: 'Feedback đã xử lý', value: resolvedFeedbackCount, helper: 'Bao gồm đã đóng và đã giải quyết', icon: Lucide.CheckCircle2 },
      { label: 'Truy cập tài khoản', value: 'Kiểm soát', helper: 'Đổi vai trò và khóa/mở tài khoản trong Quản lý người dùng', icon: Lucide.UserCog },
      { label: 'Tích hợp', value: 'Ổn định', helper: 'Các kênh tiếp nhận đang hoạt động', icon: Lucide.Radio },
    ];

    const integrations = [
      { name: 'Zalo Mini App API', status: 'Đã kết nối', icon: Lucide.Radio },
      { name: 'Messenger Webhook', status: 'Đã kết nối', icon: Lucide.CheckCircle2 },
      { name: 'Tổng đài hotline', status: 'Đang bật', icon: Lucide.PhoneCall },
    ];

    const categoryDistribution = Array.isArray(stats.categoryDistribution)
      ? stats.categoryDistribution.map((item, index) => ({
        id: Number(item.categoryId ?? item.id ?? index + 1),
        name: item.categoryName || item.name || item.label || `Danh mục ${index + 1}`,
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
                  Một màn hình để Admin theo dõi tài khoản, phản ánh, danh mục, SLA, tích hợp và tình trạng vận hành của UrbanMind.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
              <Link to="/management/feedbacks" className="admin-primary-action btn rounded-xl px-5 text-sm font-semibold normal-case">
                <Lucide.MessageSquare size={17} />
                Quản lý feedback
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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="admin-panel p-5 xl:col-span-2">
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
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{totalCategoryTickets}</p>
                </div>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${hasLowCategoryData ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {hasLowCategoryData ? 'Dữ liệu còn ít' : 'Đang cập nhật'}
                </span>
              </div>

              {categoryDistribution.length === 0 ? (
                <div className="admin-empty-panel flex min-h-[220px] flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Lucide.BarChart3 size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có dữ liệu danh mục</p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                    Khi có phản ánh mới, hệ thống sẽ tự động tổng hợp theo từng danh mục.
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

          <div className="space-y-6">
            <div className="admin-panel p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="admin-section-title">Sức khỏe vận hành</h3>
                  <p className="mt-1 admin-section-description">Các điểm Admin nên kiểm tra định kỳ.</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-600">
                  <Lucide.Activity size={18} />
                </div>
              </div>
              <div className="space-y-3">
                {healthItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="admin-inset-panel flex items-start gap-3 p-3">
                      <div className="admin-mini-icon">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-950">{item.value}</p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.helper}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-panel p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="admin-section-title">Tích hợp đa kênh</h3>
                  <p className="mt-1 admin-section-description">Các kênh tiếp nhận phản ánh đang hoạt động.</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-2 text-blue-600">
                  <Lucide.Network size={18} />
                </div>
              </div>

              <div className="space-y-3">
                {integrations.map((integration) => {
                  const Icon = integration.icon;

                  return (
                    <div key={integration.name} className="admin-inset-panel flex items-center justify-between gap-3 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="admin-mini-icon">
                          <Icon size={16} />
                        </div>
                        <span className="truncate text-xs font-semibold text-slate-700">{integration.name}</span>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        {integration.status}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Link
                to="/management/integrations"
                className="admin-secondary-link mt-4 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-all"
              >
                Quản lý tích hợp
                <Lucide.ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="admin-panel p-5 xl:col-span-2">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="admin-section-title">Phản ánh mới nhất</h3>
                <p className="admin-section-description">Dữ liệu tổng hợp để Admin giám sát luồng vận hành.</p>
              </div>
              <Link to="/management/feedbacks" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                Quản lý feedback
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
                        <tr key={ticket.feedbackId} className="admin-table-row">
                          <td className="py-3.5 font-semibold text-blue-700">{formatTicketId(ticket.feedbackId)}</td>
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

          <div className="admin-panel p-5">
            <div className="mb-4">
              <h3 className="admin-section-title">Lối tắt quản trị</h3>
              <p className="mt-1 admin-section-description">Các flow Admin thường cần kiểm tra.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {adminQuickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    to={item.to}
                    className="admin-quick-link group flex items-start gap-3 p-3 transition-all"
                  >
                    <div className="admin-mini-icon h-10 w-10 group-hover:text-blue-700">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-800">{item.title}</h4>
                        <Lucide.ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:text-blue-700" />
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
};
