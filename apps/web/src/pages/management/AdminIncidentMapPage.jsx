import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '@urbanmind/shared-api';
import { IncidentMap } from '../../components/maps/IncidentMap';
import {
  readAdminDashboardCache,
  readAdminMapViewState,
  writeAdminDashboardCache,
  writeAdminMapViewState,
} from '../../services/cache/adminDashboardCache';

const MAP_FILTERS = {
  ALL: 'all',
  PROCESSING: 'processing',
  ENDED: 'ended',
  COORDINATES: 'coordinates',
};

const PROCESSING_STATUSES = new Set([
  'submitted', 'aireviewed', 'verified', 'assigned', 'inprogress',
  'resolved', 'submittedforapproval', 'needrework', 'approved',
]);
const ENDED_STATUSES = new Set(['closed', 'cancelled', 'rejected']);

const normalizeStatus = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9]/g, '')
  .toLocaleLowerCase('en-US');

const normalizeResponse = (response) => {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.items,
    response?.data,
    response?.content,
    response?.result,
    response?.records,
    response?.feedbacks,
    response?.data?.items,
    response?.data?.data,
    response?.data?.content,
    response?.data?.result,
    response?.data?.records,
    response?.data?.feedbacks,
    response?.result?.items,
    response?.result?.content,
    response?.result?.records,
  ];

  return candidates.find(Array.isArray) || [];
};

const parseCoordinatesFromLocationText = (locationText) => {
  if (!locationText || typeof locationText !== 'string') {
    return { latitude: Number.NaN, longitude: Number.NaN };
  }

  const match = locationText.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return { latitude: Number.NaN, longitude: Number.NaN };

  return {
    latitude: Number(match[1]),
    longitude: Number(match[2]),
  };
};

const normalizeIncident = (item) => {
  const parsedLocation = parseCoordinatesFromLocationText(item?.locationText);

  return {
    ...item,
    feedbackId: item?.feedbackId || item?.id || item?.ticketId,
    title: item?.title || item?.summary || item?.description || 'Phản ánh đô thị',
    categoryName: item?.categoryName || item?.category?.categoryName || item?.category?.name,
    areaName: item?.areaName || item?.wardName || item?.area?.areaName || item?.area?.name,
    latitude: Number(
      item?.latitude ??
      item?.lat ??
      item?.location?.latitude ??
      item?.location?.lat ??
      parsedLocation.latitude
    ),
    longitude: Number(
      item?.longitude ??
      item?.lng ??
      item?.lon ??
      item?.location?.longitude ??
      item?.location?.lng ??
      item?.location?.lon ??
      parsedLocation.longitude
    ),
  };
};

const hasCoordinates = (item) => (
  Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 &&
  Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180
);

const MapSkeleton = () => (
  <div className="relative h-[550px] overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/[0.04]" aria-hidden="true">
    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-blue-50 via-slate-100 to-cyan-50 dark:from-blue-950/30 dark:via-slate-900 dark:to-cyan-950/20" />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-lg dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-300">
        <span className="loading loading-spinner loading-sm text-blue-600" />
        Đang tải dữ liệu bản đồ
      </span>
    </div>
  </div>
);

export const AdminIncidentMapPage = () => {
  const location = useLocation();
  const [cachedDashboard] = useState(readAdminDashboardCache);
  const [cachedMapView] = useState(readAdminMapViewState);
  const cachedIncidents = Array.isArray(cachedDashboard?.tickets)
    ? cachedDashboard.tickets.map(normalizeIncident)
    : [];
  const [incidents, setIncidents] = useState(cachedIncidents);
  const [loading, setLoading] = useState(cachedIncidents.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState(
    cachedMapView?.activeFilter || MAP_FILTERS.ALL
  );
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const mapSectionRef = useRef(null);
  const handledFocusRef = useRef('');
  const incidentRequestIdRef = useRef(0);
  const focusState = location.state?.mapState || location.state || {};

  const loadIncidents = useCallback(async ({ background = false } = {}) => {
    const requestId = ++incidentRequestIdRef.current;

    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await managementFeedbackApi.getFeedbacks({
        PageNumber: 1,
        PageSize: 1000,
        pageNumber: 1,
        pageSize: 1000,
      });
      if (requestId !== incidentRequestIdRef.current) return;

      const nextIncidents = normalizeResponse(response).map(normalizeIncident);
      setIncidents(nextIncidents);
      writeAdminDashboardCache({ tickets: nextIncidents, ticketTotal: nextIncidents.length });
    } catch (err) {
      if (requestId !== incidentRequestIdRef.current) return;
      setError(err?.message || 'Không thể tải dữ liệu bản đồ phản ánh.');
    } finally {
      if (requestId === incidentRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadIncidents({ background: cachedIncidents.length > 0 });

    return () => {
      incidentRequestIdRef.current += 1;
    };
  }, [cachedIncidents.length, loadIncidents]);

  useEffect(() => {
    writeAdminMapViewState({ activeFilter });
  }, [activeFilter]);

  useEffect(() => {
    const scrollContainer = document.querySelector('[data-dashboard-scroll-container]');
    if (!scrollContainer) return undefined;

    const shouldUseFocusedScroll = Boolean(
      focusState?.focusMap ||
      focusState?.focusFeedbackId ||
      location.hash === '#admin-incident-map'
    );

    if (!shouldUseFocusedScroll && Number.isFinite(Number(cachedMapView?.scrollTop))) {
      const frame = window.requestAnimationFrame(() => {
        scrollContainer.scrollTo({
          top: Number(cachedMapView.scrollTop),
          behavior: 'auto',
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    return undefined;
  }, [cachedMapView?.scrollTop, focusState?.focusFeedbackId, focusState?.focusMap, location.hash]);

  useEffect(() => {
    const scrollContainer = document.querySelector('[data-dashboard-scroll-container]');
    if (!scrollContainer) return undefined;

    let frame = 0;
    const persistScroll = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        writeAdminMapViewState({ scrollTop: scrollContainer.scrollTop });
      });
    };

    scrollContainer.addEventListener('scroll', persistScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', persistScroll);
      if (frame) window.cancelAnimationFrame(frame);
      writeAdminMapViewState({ scrollTop: scrollContainer.scrollTop });
    };
  }, []);

  useEffect(() => {
    const shouldFocusMap = Boolean(
      focusState?.focusMap || location.hash === '#admin-incident-map'
    );
    if (!shouldFocusMap || !mapSectionRef.current) return undefined;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const section = mapSectionRef.current;
        const scrollContainer = document.querySelector('[data-dashboard-scroll-container]');
        if (!section) return;

        if (scrollContainer) {
          const sectionRect = section.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          scrollContainer.scrollTo({
            top: Math.max(scrollContainer.scrollTop + sectionRect.top - containerRect.top - 16, 0),
            behavior: 'auto',
          });
        } else {
          window.scrollTo({
            top: Math.max(window.scrollY + section.getBoundingClientRect().top - 16, 0),
            behavior: 'auto',
          });
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [focusState?.focusMap, location.hash, location.key]);

  useEffect(() => {
    if (loading || !focusState?.focusFeedbackId || !mapSectionRef.current) return undefined;

    const requestKey = [
      location.key,
      focusState.focusFeedbackId,
      focusState.focusLatitude,
      focusState.focusLongitude,
    ].join(':');
    if (handledFocusRef.current === requestKey) return undefined;

    const scrollToFocusedMap = () => {
      const section = mapSectionRef.current;
      const scrollContainer = document.querySelector('[data-dashboard-scroll-container]');
      if (!section) return;

      if (scrollContainer) {
        const sectionRect = section.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        scrollContainer.scrollTo({
          top: Math.max(
            scrollContainer.scrollTop + sectionRect.top - containerRect.top - 16,
            0
          ),
          behavior: 'auto',
        });
      } else {
        window.scrollTo({
          top: Math.max(window.scrollY + section.getBoundingClientRect().top - 16, 0),
          behavior: 'auto',
        });
      }
    };

    // DashboardLayout/PageTransition and Leaflet can finish layout after the first paint.
    // Retry a few times so the focused marker and the map section stay visible after returning.
    const frame = window.requestAnimationFrame(scrollToFocusedMap);
    const timers = [80, 220, 420].map((delay) =>
      window.setTimeout(scrollToFocusedMap, delay)
    );
    handledFocusRef.current = requestKey;

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    focusState?.focusFeedbackId,
    focusState?.focusLatitude,
    focusState?.focusLongitude,
    loading,
    location.key,
  ]);

  const validIncidents = useMemo(() => incidents.filter(hasCoordinates), [incidents]);
  const processingIncidents = useMemo(() => validIncidents.filter((item) => (
    PROCESSING_STATUSES.has(normalizeStatus(item.status || item.feedbackStatus))
  )), [validIncidents]);
  const endedIncidents = useMemo(() => validIncidents.filter((item) => (
    ENDED_STATUSES.has(normalizeStatus(item.status || item.feedbackStatus))
  )), [validIncidents]);

  const visibleIncidents = useMemo(() => {
    if (activeFilter === MAP_FILTERS.PROCESSING) return processingIncidents;
    if (activeFilter === MAP_FILTERS.ENDED) return endedIncidents;
    return validIncidents;
  }, [activeFilter, processingIncidents, endedIncidents, validIncidents]);

  const selectFilter = (filter) => {
    setActiveFilter(filter);
    setFitRequestKey((value) => value + 1);
  };

  const filters = [
    { key: MAP_FILTERS.ALL, label: 'Tất cả', value: validIncidents.length, icon: Lucide.MapPinned },
    { key: MAP_FILTERS.PROCESSING, label: 'Đang xử lý', value: processingIncidents.length, icon: Lucide.RefreshCw },
    { key: MAP_FILTERS.ENDED, label: 'Đã kết thúc', value: endedIncidents.length, icon: Lucide.CheckCircle2 },
    { key: MAP_FILTERS.COORDINATES, label: 'Có tọa độ', value: validIncidents.length, icon: Lucide.Navigation },
  ];

  return (
    <div className="admin-page-shell space-y-6 pb-5">
      <section className="admin-page-hero">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon"><Lucide.MapPinned size={22} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Điều hành không gian</p>
              <h1 className="admin-hero-title mt-1">Bản đồ phản ánh</h1>
              <p className="admin-hero-description">Theo dõi vị trí sự cố, lọc nhanh theo trạng thái và mở chi tiết phản ánh trong giao diện quản trị.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => loadIncidents({ background: incidents.length > 0 })} disabled={refreshing} className="btn admin-secondary-action h-11 rounded-xl px-4 text-sm font-semibold normal-case">
              <Lucide.RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Đang cập nhật' : 'Làm mới'}
            </button>
            <Link to="/management/feedbacks" className="btn admin-primary-action h-11 rounded-xl px-4 text-sm font-semibold normal-case">
              <Lucide.List size={16} />
              Danh sách phản ánh
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {filters.map(({ key, label, value, icon: Icon }) => (
          <button key={key} type="button" onClick={() => selectFilter(key)} className={`admin-stat-card p-4 text-left transition ${activeFilter === key ? 'ring-2 ring-blue-500/30' : 'hover:-translate-y-0.5'}`}>
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p></div>
              <span className="admin-mini-icon"><Icon size={17} /></span>
            </div>
          </button>
        ))}
      </section>

      {error ? (
        <div className="admin-error-note flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium"><Lucide.CircleAlert size={17} />{error}</span>
          <button type="button" onClick={() => loadIncidents()} className="btn admin-secondary-action h-9 rounded-xl px-4 text-xs font-semibold normal-case">Thử lại</button>
        </div>
      ) : null}

      <section ref={mapSectionRef} id="admin-incident-map" className="admin-panel overflow-hidden p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="admin-section-title">{visibleIncidents.length} vị trí đang hiển thị</h2>
            <p className="admin-section-description">Bấm marker để xem thông tin và mở chi tiết phản ánh.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-current" /> Dữ liệu quản trị
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          {loading ? <MapSkeleton /> : (
            <IncidentMap
              incidents={visibleIncidents}
              fitRequestKey={fitRequestKey}
              focusFeedbackId={focusState?.focusFeedbackId}
              focusLatitude={focusState?.focusLatitude}
              focusLongitude={focusState?.focusLongitude}
              detailPathBuilder={(ticket) => `/management/feedbacks/${ticket.feedbackId}`}
              returnPath="/management/map"
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminIncidentMapPage;
