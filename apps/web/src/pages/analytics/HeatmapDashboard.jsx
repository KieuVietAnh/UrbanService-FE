import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '@urbanmind/shared-api';
import { IncidentMap } from '../../components/maps/IncidentMap';
import { ManagerPageHeader } from '../../components/manager/ManagerPageElements';

const CACHE_KEY = 'urbanservice.manager.heatmap.v1';
const CACHE_TTL_MS = 60_000;

const STATUS_GROUPS = {
  all: null,
  processing: new Set([
    'submitted', 'aireviewed', 'verified', 'assigned', 'inprogress',
    'resolved', 'submittedforapproval', 'needrework', 'approved',
  ]),
  ended: new Set(['closed', 'cancelled', 'rejected']),
};

const normalizeKey = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9]/g, '')
  .toLocaleLowerCase('en-US');

const normalizePriority = (value) => String(value || '').trim().toLocaleLowerCase('en-US');

const parseCoordinatesFromLocationText = (locationText) => {
  if (!locationText || typeof locationText !== 'string') {
    return { latitude: Number.NaN, longitude: Number.NaN };
  }
  const match = locationText.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return { latitude: Number.NaN, longitude: Number.NaN };
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
};

const normalizeIncident = (item) => {
  const parsed = parseCoordinatesFromLocationText(item?.locationText);
  return {
    ...item,
    feedbackId: item?.feedbackId || item?.id || item?.ticketId,
    title: item?.title || item?.summary || item?.description || 'Phản ánh đô thị',
    categoryId: item?.categoryId ?? item?.category?.categoryId ?? item?.category?.id ?? '',
    categoryName: item?.categoryName || item?.category?.categoryName || item?.category?.name || 'Chưa phân loại',
    areaName: item?.areaName || item?.wardName || item?.area?.areaName || item?.area?.name || '',
    latitude: Number(
      item?.latitude ?? item?.lat ?? item?.location?.latitude ?? item?.location?.lat ?? parsed.latitude
    ),
    longitude: Number(
      item?.longitude ?? item?.lng ?? item?.lon ?? item?.location?.longitude ?? item?.location?.lng ?? parsed.longitude
    ),
  };
};

const hasCoordinates = (item) => (
  Number.isFinite(item?.latitude) && Math.abs(item.latitude) <= 90 &&
  Number.isFinite(item?.longitude) && Math.abs(item.longitude) <= 180
);

const normalizeResponse = (response) => {
  if (Array.isArray(response)) return response;
  const candidates = [
    response?.items, response?.data, response?.content, response?.result, response?.records,
    response?.feedbacks, response?.data?.items, response?.data?.data, response?.data?.content,
    response?.data?.result, response?.data?.records, response?.data?.feedbacks,
    response?.result?.items, response?.result?.content, response?.result?.records,
  ];
  return candidates.find(Array.isArray) || [];
};

const readTotalCount = (response, fallback = 0) => {
  const candidates = [
    response?.totalCount, response?.totalItems, response?.totalRecords,
    response?.data?.totalCount, response?.data?.totalItems, response?.data?.totalRecords,
  ];
  const total = candidates.map(Number).find((value) => Number.isFinite(value) && value >= 0);
  return total ?? fallback;
};

const readCache = () => {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.incidents)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (payload) => {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, cachedAt: Date.now() }));
  } catch {
    // Ignore cache write failures.
  }
};

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

export const HeatmapDashboard = () => {
  const location = useLocation();
  const [cached] = useState(readCache);
  const [incidents, setIncidents] = useState(() => (cached?.incidents || []).map(normalizeIncident));
  const [totalCount, setTotalCount] = useState(() => Number(cached?.totalCount) || cached?.incidents?.length || 0);
  const [loading, setLoading] = useState(() => !cached?.incidents?.length);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(cached?.statusFilter || 'all');
  const [categoryFilter, setCategoryFilter] = useState(cached?.categoryFilter || 'all');
  const [priorityFilter, setPriorityFilter] = useState(cached?.priorityFilter || 'all');
  const [showHeatLayer, setShowHeatLayer] = useState(cached?.showHeatLayer ?? true);
  const [showMarkers, setShowMarkers] = useState(cached?.showMarkers ?? true);
  const [mapView, setMapView] = useState(cached?.mapView || null);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const requestIdRef = useRef(0);
  const focusState = location.state?.mapState || location.state || {};

  const loadIncidents = useCallback(async ({ background = false } = {}) => {
    const requestId = ++requestIdRef.current;
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await managementFeedbackApi.getFeedbacks({ PageNumber: 1, PageSize: 1000 });
      if (requestId !== requestIdRef.current) return;
      const next = normalizeResponse(response).map(normalizeIncident);
      const nextTotal = readTotalCount(response, next.length);
      setIncidents(next);
      setTotalCount(nextTotal);
      writeCache({
        incidents: next,
        totalCount: nextTotal,
        statusFilter,
        categoryFilter,
        priorityFilter,
        showHeatLayer,
        showMarkers,
        mapView,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.message || 'Không thể tải dữ liệu bản đồ phản ánh.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [categoryFilter, mapView, priorityFilter, showHeatLayer, showMarkers, statusFilter]);

  useEffect(() => {
    const cacheFresh = cached?.cachedAt && (Date.now() - cached.cachedAt) < CACHE_TTL_MS;
    if (!cacheFresh) void loadIncidents({ background: Boolean(cached?.incidents?.length) });
    return () => { requestIdRef.current += 1; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    writeCache({
      incidents,
      totalCount,
      statusFilter,
      categoryFilter,
      priorityFilter,
      showHeatLayer,
      showMarkers,
      mapView,
    });
  }, [categoryFilter, incidents, mapView, priorityFilter, showHeatLayer, showMarkers, statusFilter, totalCount]);

  const validIncidents = useMemo(() => incidents.filter(hasCoordinates), [incidents]);
  const categoryOptions = useMemo(() => {
    const map = new Map();
    validIncidents.forEach((item) => {
      const key = String(item.categoryId || item.categoryName || '').trim();
      if (key && !map.has(key)) map.set(key, item.categoryName || 'Chưa phân loại');
    });
    return [...map.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'vi'));
  }, [validIncidents]);

  const filteredIncidents = useMemo(() => validIncidents.filter((item) => {
    const statusSet = STATUS_GROUPS[statusFilter];
    if (statusSet && !statusSet.has(normalizeKey(item.status || item.feedbackStatus))) return false;
    if (categoryFilter !== 'all') {
      const itemKey = String(item.categoryId || item.categoryName || '').trim();
      if (itemKey !== categoryFilter) return false;
    }
    if (priorityFilter !== 'all') {
      const priority = normalizePriority(item.priority);
      if (priorityFilter === 'highOrUrgent') {
        if (!['high', 'urgent', 'critical'].includes(priority)) return false;
      } else if (priorityFilter === 'urgent') {
        if (priority !== 'urgent' && priority !== 'critical') return false;
      } else if (priority !== priorityFilter) return false;
    }
    return true;
  }), [categoryFilter, priorityFilter, statusFilter, validIncidents]);

  const urgentCount = useMemo(() => filteredIncidents.filter((item) => {
    const key = normalizePriority(item.priority);
    return key === 'urgent' || key === 'critical' || key === 'high';
  }).length, [filteredIncidents]);

  const hotspotCategories = useMemo(() => {
    const counts = new Map();
    filteredIncidents.forEach((item) => {
      const name = item.categoryName || 'Chưa phân loại';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredIncidents]);

  const updateFilter = (setter, value) => {
    setter(value);
    setFitRequestKey((key) => key + 1);
  };

  const resetMapFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setFitRequestKey((key) => key + 1);
  };

  const handleKpiClick = (key) => {
    if (key === 'total' || key === 'mapped') {
      resetMapFilters();
      return;
    }
    if (key === 'visible') {
      setFitRequestKey((value) => value + 1);
      return;
    }
    if (key === 'priority') {
      setPriorityFilter((current) => current === 'highOrUrgent' ? 'all' : 'highOrUrgent');
      setFitRequestKey((value) => value + 1);
    }
  };

  return (
    <article className="admin-page-shell space-y-5 pb-5">
      <ManagerPageHeader
        title="Bản đồ điểm nóng"
        description="Theo dõi mật độ phản ánh theo vị trí, lọc nhanh theo trạng thái, danh mục và mức ưu tiên."
        icon={Lucide.MapPinned}
        actions={(
          <button
            type="button"
            onClick={() => loadIncidents({ background: incidents.length > 0 })}
            disabled={refreshing}
            className="btn admin-secondary-action h-10 rounded-xl px-4 text-sm font-semibold normal-case"
          >
            <Lucide.RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Đang cập nhật' : 'Làm mới'}
          </button>
        )}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Chỉ số bản đồ">
        {[
          { key: 'total', label: 'Tổng phản ánh', value: totalCount, Icon: Lucide.MessagesSquare, hint: 'Bấm để bỏ tất cả bộ lọc', tone: 'border-blue-200 bg-blue-50/45 hover:border-blue-300 dark:border-blue-500/20 dark:bg-blue-500/[0.06]', iconTone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
          { key: 'mapped', label: 'Có tọa độ', value: validIncidents.length, Icon: Lucide.Navigation, hint: 'Bấm để hiện toàn bộ điểm có tọa độ', tone: 'border-violet-200 bg-violet-50/45 hover:border-violet-300 dark:border-violet-500/20 dark:bg-violet-500/[0.06]', iconTone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
          { key: 'visible', label: 'Đang hiển thị', value: filteredIncidents.length, Icon: Lucide.MapPinned, hint: 'Bấm để căn bản đồ theo các điểm đang lọc', tone: 'border-cyan-200 bg-cyan-50/45 hover:border-cyan-300 dark:border-cyan-500/20 dark:bg-cyan-500/[0.06]', iconTone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' },
          { key: 'priority', label: 'Ưu tiên cao', value: urgentCount, Icon: Lucide.Siren, hint: priorityFilter === 'highOrUrgent' ? 'Bấm để bỏ lọc ưu tiên cao' : 'Bấm để chỉ xem Cao / Khẩn cấp', tone: priorityFilter === 'highOrUrgent' ? 'border-rose-400 bg-rose-100/80 ring-2 ring-rose-200 dark:border-rose-400/60 dark:bg-rose-500/15 dark:ring-rose-500/10' : 'border-rose-200 bg-rose-50/45 hover:border-rose-300 dark:border-rose-500/20 dark:bg-rose-500/[0.06]', iconTone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
        ].map(({ key, label, value, Icon, hint, tone, iconTone }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKpiClick(key)}
            title={hint}
            className={`admin-panel group border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${tone}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
                <p className="mt-1 text-[11px] text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-400">{hint}</p>
              </div>
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}><Icon size={18} /></span>
            </div>
          </button>
        ))}
      </section>

      {error ? (
        <div className="admin-error-note flex items-center justify-between gap-3 p-4">
          <span className="inline-flex items-center gap-2 text-sm font-medium"><Lucide.CircleAlert size={17} />{error}</span>
          <button type="button" onClick={() => loadIncidents()} className="btn admin-secondary-action h-9 rounded-xl px-4 text-xs font-semibold normal-case">Thử lại</button>
        </div>
      ) : null}

      <section className="admin-panel overflow-hidden">
        <div className="border-b border-slate-200 p-4 sm:p-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="admin-section-title">Phân bố điểm nóng theo tọa độ</h2>
              <p className="admin-section-description">Lớp điểm nóng có trọng số cao hơn với phản ánh ưu tiên Cao/Khẩn cấp. Marker vẫn dùng để mở từng phản ánh.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[660px]">
              <select value={statusFilter} onChange={(e) => updateFilter(setStatusFilter, e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="all">Tất cả trạng thái</option>
                <option value="processing">Đang xử lý</option>
                <option value="ended">Đã kết thúc</option>
              </select>
              <select value={categoryFilter} onChange={(e) => updateFilter(setCategoryFilter, e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="all">Tất cả dịch vụ</option>
                {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={priorityFilter} onChange={(e) => updateFilter(setPriorityFilter, e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="all">Tất cả ưu tiên</option>
                <option value="highOrUrgent">Cao / Khẩn cấp</option>
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowHeatLayer((value) => !value)} aria-pressed={showHeatLayer} className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold ${showHeatLayer ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
              <Lucide.Flame size={15} /> Điểm nóng {showHeatLayer ? 'Bật' : 'Tắt'}
            </button>
            <button type="button" onClick={() => setShowMarkers((value) => !value)} aria-pressed={showMarkers} className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold ${showMarkers ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
              <Lucide.MapPin size={15} /> Marker {showMarkers ? 'Bật' : 'Tắt'}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">Bấm marker → Chi tiết phản ánh trong Giám sát tương tác.</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            {loading ? <MapSkeleton /> : (
              <IncidentMap
                incidents={filteredIncidents}
                fitRequestKey={fitRequestKey}
                focusFeedbackId={focusState?.focusFeedbackId}
                focusLatitude={focusState?.focusLatitude}
                focusLongitude={focusState?.focusLongitude}
                detailPathBuilder={(ticket) => `/manager/interactions/${ticket.feedbackId}`}
                returnPath="/analytics/heatmap"
                showHeatLayer={showHeatLayer}
                showMarkers={showMarkers}
                initialViewState={mapView}
                onViewStateChange={setMapView}
              />
            )}
          </div>
        </div>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="admin-section-title">Nhóm dịch vụ nổi bật trên bản đồ</h2>
          <p className="admin-section-description">Xếp theo số phản ánh có tọa độ trong bộ lọc hiện tại.</p>
        </div>
        {hotspotCategories.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
            {hotspotCategories.map((item, index) => (
              <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
                  <strong className="text-lg text-slate-950 dark:text-white">{item.count}</strong>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-slate-500">Không có phản ánh có tọa độ phù hợp với bộ lọc.</p>
        )}
      </section>
    </article>
  );
};

export default HeatmapDashboard;
