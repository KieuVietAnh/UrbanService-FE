// src/pages/community/CommunityMapPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { IncidentMap } from '../../components/maps/IncidentMap';
import { useIncidentMapData } from '../../hooks/useIncidentMapData';

const MAP_FILTERS = {
  ALL: 'all',
  PROCESSING: 'processing',
  ENDED: 'ended',
  COORDINATES: 'coordinates',
};

const COMMUNITY_MAP_STATE_STORAGE_KEY =
  'urbanmind-community-map-view-state';

const isValidMapFilter = (value) => (
  Object.values(MAP_FILTERS).includes(value)
);

const readStoredMapState = () => {
  if (typeof window === 'undefined') return null;

  try {
    const rawState = window.sessionStorage.getItem(
      COMMUNITY_MAP_STATE_STORAGE_KEY
    );

    if (!rawState) return null;

    const parsedState = JSON.parse(rawState);
    return parsedState && typeof parsedState === 'object'
      ? parsedState
      : null;
  } catch {
    return null;
  }
};

const writeStoredMapState = (mapState) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      COMMUNITY_MAP_STATE_STORAGE_KEY,
      JSON.stringify(mapState)
    );
  } catch {
    // Storage can be unavailable in private mode.
  }
};

const PROCESSING_STATUSES = new Set([
  'verified',
  'assigned',
  'inprogress',
  'resolved',
  'submittedforapproval',
  'approved',
]);

const ENDED_STATUSES = new Set([
  'closed',
]);

const normalizeStatus = (value) => (
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLocaleLowerCase('en-US')
);

const getIncidentStatus = (incident) => (
  incident?.status ||
  incident?.feedbackStatus ||
  incident?.ticketStatus ||
  ''
);

const getIncidentCoordinates = (incident) => {
  const latitude = (
    incident?.latitude ??
    incident?.lat ??
    incident?.location?.latitude ??
    incident?.location?.lat
  );
  const longitude = (
    incident?.longitude ??
    incident?.lng ??
    incident?.lon ??
    incident?.location?.longitude ??
    incident?.location?.lng ??
    incident?.location?.lon
  );

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
};

const hasValidCoordinates = (incident) => {
  const { latitude, longitude } = getIncidentCoordinates(incident);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
};

const MapMetricSkeleton = ({ tone = 'base' }) => {
  const toneClass = {
    warning: 'bg-warning/12',
    success: 'bg-success/12',
    info: 'bg-info/12',
  }[tone] || 'bg-base-300/45';

  return (
    <span
      className={`inline-block h-7 w-10 animate-pulse rounded-lg ${toneClass}`}
      aria-hidden="true"
    />
  );
};

const MapCanvasSkeleton = () => (
  <div
    data-testid="community-map-loading"
    className="relative h-[560px] overflow-hidden rounded-[24px] bg-base-200/65"
    aria-hidden="true"
  >
    <div className="absolute inset-0 animate-pulse">
      <div className="absolute inset-x-0 top-0 h-16 border-b border-base-300 bg-base-100/55" />
      <div className="absolute left-[16%] top-[22%] h-10 w-10 rounded-full bg-primary/15" />
      <div className="absolute left-[43%] top-[48%] h-9 w-9 rounded-full bg-warning/15" />
      <div className="absolute right-[18%] top-[31%] h-11 w-11 rounded-full bg-success/15" />
      <div className="absolute bottom-[17%] left-[28%] h-8 w-8 rounded-full bg-secondary/15" />

      <svg
        viewBox="0 0 1200 560"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full text-base-content/10"
        fill="none"
      >
        <path
          d="M-20 410C160 360 218 150 390 170C545 188 585 410 765 366C914 330 956 110 1220 164"
          stroke="currentColor"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M0 220C176 250 286 330 443 296C615 259 689 89 862 122C1012 151 1092 286 1208 315"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M410 -20C462 99 534 154 667 172C801 190 906 146 998 11"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    </div>

    <div className="absolute inset-0 flex items-center justify-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100/90 px-4 py-2 text-sm font-semibold text-base-content/55 shadow-lg backdrop-blur">
        <span className="loading loading-spinner loading-sm text-primary" />
        Đang tải dữ liệu bản đồ
      </span>
    </div>
  </div>
);

export const CommunityMapPage = () => {
  const location = useLocation();
  const { incidents, loading, error } = useIncidentMapData();
  const [initialMapState] = useState(() => (
    location.state?.mapState ||
    readStoredMapState() ||
    {}
  ));
  const [activeFilter, setActiveFilter] = useState(() => (
    isValidMapFilter(initialMapState.activeFilter)
      ? initialMapState.activeFilter
      : MAP_FILTERS.ALL
  ));
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const safeIncidents = useMemo(
    () => (Array.isArray(incidents) ? incidents : []),
    [incidents]
  );

  const validIncidents = useMemo(
    () => safeIncidents.filter(hasValidCoordinates),
    [safeIncidents]
  );
  const processingIncidents = useMemo(
    () => validIncidents.filter((incident) => (
      PROCESSING_STATUSES.has(
        normalizeStatus(getIncidentStatus(incident))
      )
    )),
    [validIncidents]
  );
  const endedIncidents = useMemo(
    () => validIncidents.filter((incident) => (
      ENDED_STATUSES.has(
        normalizeStatus(getIncidentStatus(incident))
      )
    )),
    [validIncidents]
  );

  const visibleIncidents = useMemo(() => {
    if (activeFilter === MAP_FILTERS.PROCESSING) {
      return processingIncidents;
    }

    if (activeFilter === MAP_FILTERS.ENDED) {
      return endedIncidents;
    }

    return validIncidents;
  }, [
    activeFilter,
    endedIncidents,
    processingIncidents,
    validIncidents,
  ]);

  const validCoordinateCount = validIncidents.length;
  const processingCount = processingIncidents.length;
  const endedCount = endedIncidents.length;

  const handleMapFilter = (nextFilter) => {
    setActiveFilter(nextFilter);
    setFitRequestKey((currentKey) => currentKey + 1);

    writeStoredMapState({
      activeFilter: nextFilter,
      scrollY: window.scrollY,
    });
  };

  useEffect(() => {
    writeStoredMapState({
      activeFilter,
      scrollY: window.scrollY,
    });
  }, [activeFilter]);

  useEffect(() => {
    const restoredScrollY = Number(initialMapState.scrollY || 0);

    if (restoredScrollY <= 0) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: restoredScrollY,
        behavior: 'auto',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [initialMapState.scrollY]);

  const activeFilterLabel = {
    [MAP_FILTERS.ALL]: 'Tất cả phản ánh',
    [MAP_FILTERS.PROCESSING]: 'Đang xử lý',
    [MAP_FILTERS.ENDED]: 'Đã kết thúc',
    [MAP_FILTERS.COORDINATES]: 'Có tọa độ',
  }[activeFilter];

  return (
    <main className="space-y-5 text-base-content">
      <section
        className="relative isolate overflow-hidden rounded-[30px] border border-info/15 bg-gradient-to-br from-base-100 via-info/[0.03] to-primary/[0.075] shadow-[0_18px_48px_rgba(15,23,42,0.085)]"
        aria-labelledby="community-map-title"
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1400 360"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full text-info opacity-[0.15]"
            fill="none"
          >
            <path
              d="M-40 268C134 229 198 118 356 120C505 122 565 234 724 219C876 205 921 93 1088 101C1213 107 1284 175 1444 151"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M-10 316C173 287 250 212 402 222C555 232 626 310 786 286C936 264 1004 192 1142 203C1252 212 1328 257 1417 269"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeDasharray="10 12"
              strokeLinecap="round"
              opacity="0.72"
            />
            <path
              d="M1014 -18C971 64 994 128 1058 166C1113 198 1207 195 1264 147C1313 106 1320 37 1381 -17"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.64"
            />
            <circle cx="356" cy="120" r="7" fill="currentColor" opacity="0.75" />
            <circle cx="724" cy="219" r="9" fill="currentColor" opacity="0.6" />
            <circle cx="1088" cy="101" r="8" fill="currentColor" opacity="0.75" />
            <circle cx="1264" cy="147" r="27" stroke="currentColor" opacity="0.35" />
          </svg>

          <div className="absolute -left-20 top-6 h-64 w-64 rounded-full bg-info/[0.065] blur-3xl" />
          <div className="absolute -bottom-24 right-[8%] h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />

          <span className="absolute left-[44%] top-[15%] flex h-8 w-8 items-center justify-center rounded-full border border-info/12 bg-base-100/65 text-info/45 shadow-sm backdrop-blur">
            <Lucide.MapPin size={14} />
          </span>
          <span className="absolute right-[21%] top-[13%] flex h-8 w-8 items-center justify-center rounded-full border border-secondary/12 bg-base-100/65 text-secondary/45 shadow-sm backdrop-blur">
            <Lucide.Route size={14} />
          </span>
          <span className="absolute right-[7%] top-[30%] flex h-8 w-8 items-center justify-center rounded-full border border-success/12 bg-base-100/65 text-success/45 shadow-sm backdrop-blur">
            <Lucide.CircleCheck size={14} />
          </span>
        </div>

        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
          <header className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-info/15 bg-base-100/75 text-info shadow-sm backdrop-blur">
                <Lucide.MapPinned size={21} aria-hidden="true" />
              </span>
              <span className="h-px w-16 bg-gradient-to-r from-info/40 to-transparent" />
            </div>

            <h1
              id="community-map-title"
              className="mt-4 text-3xl font-bold tracking-tight text-base-content sm:text-4xl"
            >
              Bản đồ sự cố đô thị
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-base-content/60">
              Theo dõi vị trí các phản ánh công khai và quan sát tình hình sự cố đô thị theo từng khu vực.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                <Lucide.Radio size={14} aria-hidden="true" />
                Cập nhật theo dữ liệu công khai
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-base-300/85 bg-base-100/70 px-3 py-1.5 text-xs font-medium text-base-content/55 backdrop-blur">
                <Lucide.MousePointerClick
                  size={13}
                  className="text-primary"
                  aria-hidden="true"
                />
                Chọn marker để xem chi tiết
              </span>
            </div>
          </header>

          <dl
            className="mt-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Lọc nhanh điểm trên bản đồ"
          >
            <button
              type="button"
              onClick={() => handleMapFilter(MAP_FILTERS.ALL)}
              aria-pressed={activeFilter === MAP_FILTERS.ALL}
              className={`group rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                activeFilter === MAP_FILTERS.ALL
                  ? 'border-primary/45 bg-base-100/95 ring-2 ring-primary/10'
                  : 'border-base-300 bg-base-100/85 hover:border-primary/30'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Tổng phản ánh
                <Lucide.Files
                  size={14}
                  className="text-primary"
                  aria-hidden="true"
                />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-base-content">
                {loading
                  ? <MapMetricSkeleton />
                  : validCoordinateCount}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-primary">
                Hiện toàn bộ marker
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMapFilter(MAP_FILTERS.PROCESSING)}
              aria-pressed={
                activeFilter === MAP_FILTERS.PROCESSING
              }
              className={`group rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/25 ${
                activeFilter === MAP_FILTERS.PROCESSING
                  ? 'border-warning/45 bg-warning/[0.09] ring-2 ring-warning/10'
                  : 'border-warning/20 bg-warning/5 hover:border-warning/35'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Đang xử lý
                <Lucide.LoaderCircle
                  size={14}
                  className="text-warning"
                  aria-hidden="true"
                />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-warning">
                {loading
                  ? <MapMetricSkeleton tone="warning" />
                  : processingCount}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-warning">
                Chỉ hiện điểm đang xử lý
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMapFilter(MAP_FILTERS.ENDED)}
              aria-pressed={activeFilter === MAP_FILTERS.ENDED}
              className={`group rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25 ${
                activeFilter === MAP_FILTERS.ENDED
                  ? 'border-success/45 bg-success/[0.09] ring-2 ring-success/10'
                  : 'border-success/20 bg-success/5 hover:border-success/35'
              }`}
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
                {loading
                  ? <MapMetricSkeleton tone="success" />
                  : endedCount}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-success">
                Chỉ hiện hồ sơ đã đóng
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMapFilter(MAP_FILTERS.COORDINATES)}
              aria-pressed={
                activeFilter === MAP_FILTERS.COORDINATES
              }
              className={`group rounded-2xl border px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/25 ${
                activeFilter === MAP_FILTERS.COORDINATES
                  ? 'border-info/45 bg-info/[0.09] ring-2 ring-info/10'
                  : 'border-info/20 bg-info/5 hover:border-info/35'
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[11px] font-medium text-base-content/50">
                Có tọa độ
                <Lucide.Crosshair
                  size={14}
                  className="text-info"
                  aria-hidden="true"
                />
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-info">
                {loading
                  ? <MapMetricSkeleton tone="info" />
                  : validCoordinateCount}
              </dd>
              <span className="mt-1 block text-[11px] text-base-content/40 group-hover:text-info">
                Fit lại toàn bộ điểm hợp lệ
              </span>
            </button>
          </dl>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-[28px] border border-base-300 bg-base-100 shadow-[0_14px_38px_rgba(15,23,42,0.075)]"
        aria-labelledby="incident-map-panel-title"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="incident-map-panel-title"
              className="text-base font-bold"
            >
              Phân bố phản ánh trên bản đồ
            </h2>
            <p className="mt-1 text-xs text-base-content/48">
              Phóng to, thu nhỏ hoặc chọn marker để xem thông tin sự cố.
            </p>
          </div>

          {!loading ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/8 px-3 py-1.5 text-xs font-semibold text-info">
              <Lucide.MapPin size={13} aria-hidden="true" />
              {visibleIncidents.length} điểm · {activeFilterLabel}
            </span>
          ) : null}
        </header>

        <div className="p-3 sm:p-4">
          {loading ? (
            <MapCanvasSkeleton />
          ) : visibleIncidents.length > 0 ? (
            <div className="overflow-hidden rounded-[24px] border border-base-300">
              <IncidentMap
                incidents={visibleIncidents}
                fitRequestKey={fitRequestKey}
                activeFilter={activeFilter}
              />
            </div>
          ) : (
            <div
              data-testid="community-map-empty-state"
              className="flex h-[550px] flex-col items-center justify-center rounded-[24px] border border-dashed border-base-300 bg-base-200/35 px-6 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10 text-info">
                <Lucide.MapPinOff size={24} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-bold">
                Không có điểm phù hợp với bộ lọc
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-base-content/50">
                Nhóm “{activeFilterLabel}” hiện chưa có phản ánh nào có tọa độ hợp lệ để hiển thị.
              </p>
              {activeFilter !== MAP_FILTERS.ALL ? (
                <button
                  type="button"
                  onClick={() => handleMapFilter(MAP_FILTERS.ALL)}
                  className="btn btn-outline btn-sm mt-5 rounded-xl"
                >
                  <Lucide.RotateCcw size={14} aria-hidden="true" />
                  Hiện tất cả phản ánh
                </button>
              ) : null}
            </div>
          )}

          {error ? (
            <div
              className="mt-4 flex items-start gap-3 rounded-2xl border border-error/20 bg-error/8 p-4 text-sm text-error"
              role="alert"
            >
              <Lucide.TriangleAlert
                size={18}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  Không thể tải đầy đủ dữ liệu bản đồ
                </p>
                <p className="mt-1 text-error/80">
                  {error}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <article className="rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              <Lucide.MousePointerClick size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold">Cách sử dụng bản đồ</h2>
              <p className="mt-1 text-xs leading-5 text-base-content/48">
                Một vài thao tác cơ bản giúp bạn theo dõi sự cố nhanh hơn.
              </p>
            </div>
          </div>

          <ul className="mt-4 grid gap-3 text-sm text-base-content/60 sm:grid-cols-3">
            <li className="rounded-2xl bg-base-200/45 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-info/10 text-info">
                <Lucide.MapPin size={15} aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold text-base-content">
                Chọn marker
              </p>
              <p className="mt-1 text-xs leading-5">
                Xem nhanh thông tin phản ánh tại vị trí đã chọn.
              </p>
            </li>
            <li className="rounded-2xl bg-base-200/45 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Lucide.ZoomIn size={15} aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold text-base-content">
                Thu phóng bản đồ
              </p>
              <p className="mt-1 text-xs leading-5">
                Quan sát tổng thể hoặc đi sâu vào một khu vực cụ thể.
              </p>
            </li>
            <li className="rounded-2xl bg-base-200/45 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
                <Lucide.ExternalLink size={15} aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold text-base-content">
                Mở phản ánh
              </p>
              <p className="mt-1 text-xs leading-5">
                Truy cập trang chi tiết khi popup marker cung cấp liên kết.
              </p>
            </li>
          </ul>
        </article>

        <aside className="rounded-[24px] border border-info/15 bg-gradient-to-br from-info/8 via-base-100 to-primary/6 p-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-info/10 text-info">
            <Lucide.Info size={18} aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-bold">Dữ liệu hiển thị</h2>
          <p className="mt-2 text-sm leading-6 text-base-content/55">
            Bản đồ chỉ hiển thị các phản ánh công khai có tọa độ hợp lệ. Số lượng điểm có thể thấp hơn tổng số phản ánh.
          </p>
        </aside>
      </section>
    </main>
  );
};
