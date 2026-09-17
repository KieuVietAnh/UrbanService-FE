import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { IncidentMap } from '../../components/maps/IncidentMap';
import { incidentDashboardApi, incidentManagementApi, slaApi } from '@urbanmind/shared-api';
import {
  ManagerMetricCard,
  ManagerPageHeader,
  ManagerSectionHeader,
} from '../../components/manager/ManagerPageElements';
import {
  AdminErrorState,
  AdminRefreshIndicator,
} from '../../components/admin/AdminDataStates';
import {
  buildAdminDashboardMapUrl,
  buildAdminIncidentSummary,
  buildAdminIncidentSummaryFromDashboard,
  filterAdminDashboardMapIncidents,
  getAdminDashboardCacheState,
  getAdminIncidentStatusLabel,
  sortRecentIncidents,
} from './adminIncidentDashboardUtils.mjs';
import {
  readAdminDashboardCache,
  writeAdminDashboardCache,
} from '../../services/cache/adminDashboardCache';

const PRIORITY_LABELS = {
  low: 'Tháº¥p',
  medium: 'Trung bÃ¬nh',
  high: 'Cao',
  urgent: 'Kháº©n cáº¥p',
  critical: 'Kháº©n cáº¥p',
};

const STATUS_TONES = {
  submitted: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300',
  aireviewed: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300',
  new: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300',
  open: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-300',
  pending: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  verified: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300',
  assigned: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300',
  inprogress: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  submittedforapproval: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300',
  needrework: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  canceled: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  merged: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300',
  closed: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const normalizeToken = (value) => String(value || '')
  .trim()
  .replace(/[^a-z0-9]/gi, '')
  .toLowerCase();

const formatDateTime = (value) => {
  if (!value) return 'ChÆ°a cáº­p nháº­t';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ChÆ°a cáº­p nháº­t';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatIncidentCode = (incident) => {
  const raw = String(
    incident?.incidentCode ||
    incident?.code ||
    incident?.incidentId ||
    incident?.id ||
    '',
  ).trim();

  if (!raw) return 'â€”';
  if (raw.length <= 12) return raw;
  return `${raw.slice(0, 8)}â€¦`;
};

const readPriorityLabel = (value) => (
  PRIORITY_LABELS[String(value || '').trim().toLowerCase()] ||
  value ||
  'ChÆ°a xÃ¡c Ä‘á»‹nh'
);

const flattenAreaMapIncidents = (areaDistribution = []) => (
  (Array.isArray(areaDistribution) ? areaDistribution : []).flatMap((area) => (
    (Array.isArray(area?.points) ? area.points : []).map((point) => ({
      ...point,
      areaId: point?.areaId ?? area?.areaId,
      areaName: point?.areaName ?? area?.areaName,
    }))
  ))
);


const StatusBadge = ({ status }) => {
  const tone = STATUS_TONES[normalizeToken(status)] || 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {getAdminIncidentStatusLabel(status)}
    </span>
  );
};

export const AdminDashboardPage = () => {
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(null);
  const mountedRef = useRef(true);
  const mapSectionRef = useRef(null);
  const [selectedAreaKey, setSelectedAreaKey] = useState('all');
  const [mapFitRequestKey, setMapFitRequestKey] = useState(0);
  const [initialCacheState] = useState(() => (
    getAdminDashboardCacheState(readAdminDashboardCache())
  ));
  const [incidents, setIncidents] = useState(initialCacheState.incidents);
  const [recentIncidentItems, setRecentIncidentItems] = useState(initialCacheState.recentIncidents);
  const [totalItems, setTotalItems] = useState(initialCacheState.totalItems);
  const [dashboardOverview, setDashboardOverview] = useState(initialCacheState.dashboardOverview);
  const [statusDistribution, setStatusDistribution] = useState(initialCacheState.statusDistribution);
  const [priorityDistribution, setPriorityDistribution] = useState(initialCacheState.priorityDistribution);
  const [categoryDistribution, setCategoryDistribution] = useState(initialCacheState.categoryDistribution);
  const [areaDistribution, setAreaDistribution] = useState(initialCacheState.areaDistribution);
  const [slaOverview, setSlaOverview] = useState(initialCacheState.slaOverview);
  const [loading, setLoading] = useState(!initialCacheState.hasData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const load = useCallback(async ({ background = false } = {}) => {
    if (inFlightRef.current) return inFlightRef.current;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');
    setWarning('');

    const task = (async () => {
      try {
        const [
          overviewResult,
          statusResult,
          priorityResult,
          categoryResult,
          areaResult,
          recentResult,
          slaResult,
        ] = await Promise.allSettled([
          incidentDashboardApi.getOverview(),
          incidentDashboardApi.getStatusDistribution(),
          incidentDashboardApi.getPriorityDistribution(),
          incidentDashboardApi.getCategoryDistribution(),
          incidentDashboardApi.getAreaDistribution(),
          incidentManagementApi.getIncidents({
            pageNumber: 1,
            pageSize: 5,
            includeMerged: false,
          }, { signal: controller.signal }),
          slaApi.getDashboardOverview(),
        ]);

        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        const coreResults = [overviewResult, statusResult, priorityResult, categoryResult, areaResult];
        if (coreResults.every((result) => result.status === 'rejected')) {
          throw overviewResult.reason || statusResult.reason || areaResult.reason || new Error('KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u dashboard.');
        }

        const cachePatch = {};

        if (overviewResult.status === 'fulfilled') {
          setDashboardOverview(overviewResult.value);
          setTotalItems(Number(overviewResult.value?.totalIncident) || 0);
          cachePatch.dashboardOverview = overviewResult.value;
          cachePatch.totalItems = Number(overviewResult.value?.totalIncident) || 0;
        }
        if (statusResult.status === 'fulfilled') {
          setStatusDistribution(statusResult.value);
          cachePatch.statusDistribution = statusResult.value;
        }
        if (priorityResult.status === 'fulfilled') {
          setPriorityDistribution(priorityResult.value);
          cachePatch.priorityDistribution = priorityResult.value;
        }
        if (categoryResult.status === 'fulfilled') {
          setCategoryDistribution(categoryResult.value);
          cachePatch.categoryDistribution = categoryResult.value;
        }
        if (areaResult.status === 'fulfilled') {
          const nextAreas = areaResult.value;
          const nextMapIncidents = flattenAreaMapIncidents(nextAreas);
          setAreaDistribution(nextAreas);
          setIncidents(nextMapIncidents);
          cachePatch.areaDistribution = nextAreas;
          cachePatch.incidents = nextMapIncidents;
        }
        if (recentResult.status === 'fulfilled') {
          const nextRecent = recentResult.value?.items || [];
          setRecentIncidentItems(nextRecent);
          cachePatch.recentIncidents = nextRecent;
        }
        if (slaResult.status === 'fulfilled') {
          setSlaOverview(slaResult.value);
          cachePatch.slaOverview = slaResult.value;
        }

        writeAdminDashboardCache(cachePatch);

        const issues = [];
        if (overviewResult.status === 'rejected') issues.push('KPI tá»•ng quan');
        if (statusResult.status === 'rejected') issues.push('phÃ¢n bá»‘ tráº¡ng thÃ¡i');
        if (priorityResult.status === 'rejected') issues.push('phÃ¢n bá»‘ Æ°u tiÃªn');
        if (categoryResult.status === 'rejected') issues.push('phÃ¢n bá»‘ danh má»¥c');
        if (areaResult.status === 'rejected') issues.push('dá»¯ liá»‡u theo phÆ°á»ng vÃ  báº£n Ä‘á»“');
        if (recentResult.status === 'rejected') issues.push('sá»± vá»¥ gáº§n Ä‘Ã¢y');
        if (slaResult.status === 'rejected') issues.push('dá»¯ liá»‡u SLA');
        if (issues.length > 0) {
          setWarning(`ChÆ°a táº£i Ä‘Æ°á»£c ${issues.join(', ')}. CÃ¡c pháº§n cÃ²n láº¡i váº«n giá»¯ dá»¯ liá»‡u há»£p lá»‡.`);
        }
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || !mountedRef.current || requestId !== requestIdRef.current) return;
        setError(
          loadError?.response?.data?.message ||
          loadError?.message ||
          'KhÃ´ng thá»ƒ táº£i tá»•ng quan há»‡ thá»‘ng.',
        );
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    inFlightRef.current = task;
    try {
      return await task;
    } finally {
      if (inFlightRef.current === task) inFlightRef.current = null;
    }
  }, []);


  useEffect(() => {
    mountedRef.current = true;

    if (!initialCacheState.hasData) {
      void load();
    } else if (initialCacheState.shouldRevalidate) {
      void load({ background: true });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [initialCacheState.hasData, initialCacheState.shouldRevalidate, load]);

  const hasAggregateDashboardData = Boolean(dashboardOverview) || [
    statusDistribution,
    priorityDistribution,
    categoryDistribution,
    areaDistribution,
  ].some((items) => items.length > 0);
  const summary = hasAggregateDashboardData
    ? buildAdminIncidentSummaryFromDashboard({
        overview: dashboardOverview,
        statusDistribution,
        priorityDistribution,
        categoryDistribution,
        areaDistribution,
      })
    : buildAdminIncidentSummary(incidents, totalItems);
  const recentIncidents = recentIncidentItems.length > 0
    ? sortRecentIncidents(recentIncidentItems, 5)
    : (!hasAggregateDashboardData ? sortRecentIncidents(incidents, 5) : []);
  const statusMax = Math.max(...summary.statuses.map((item) => item.count), 1);
  const areaMax = Math.max(...summary.areas.map((item) => item.count), 1);
  const categoryMax = Math.max(...summary.categories.map((item) => item.count), 1);
  const slaBreached = Number(slaOverview?.breachedSla ?? slaOverview?.breached ?? 0);
  const slaWarning = Number(slaOverview?.warningSla ?? slaOverview?.warning ?? 0);
  const topAreaValue = summary.topArea
    ? `${summary.topArea.name} Â· ${summary.topArea.count}`
    : 'ChÆ°a cÃ³ dá»¯ liá»‡u';
  const selectedMapIncidents = useMemo(
    () => filterAdminDashboardMapIncidents(incidents, selectedAreaKey),
    [incidents, selectedAreaKey],
  );
  const selectedArea = summary.areas.find((item) => String(item.key) === String(selectedAreaKey)) || null;
  const detailedMapUrl = buildAdminDashboardMapUrl(selectedAreaKey);

  const focusDashboardMap = useCallback((areaKey = 'all') => {
    setSelectedAreaKey(String(areaKey || 'all'));
    setMapFitRequestKey((value) => value + 1);
    window.requestAnimationFrame(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  return (
    <div className="admin-page-shell manager-ui-page space-y-4 pb-6">
      <ManagerPageHeader
        title="Tá»•ng quan há»‡ thá»‘ng"
        description="Theo dÃµi sá»± vá»¥, tá»«ng phÆ°á»ng vÃ  tÃ­n hiá»‡u SLA toÃ n há»‡ thá»‘ng."
        icon={Lucide.LayoutDashboard}
        statusLabel={<span className="whitespace-nowrap">PhÆ°á»ng cÃ³ nhiá»u sá»± vá»¥ nháº¥t</span>}
        statusValue={loading ? 'Äang táº£iâ€¦' : (
          <span className="inline-block max-w-[220px] truncate whitespace-nowrap align-bottom" title={topAreaValue}>
            {topAreaValue}
          </span>
        )}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              to="/management/map"
              className="admin-secondary-link inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold"
            >
              <Lucide.MapPinned size={16} aria-hidden="true" />
              Báº£n Ä‘á»“ sá»± vá»¥
            </Link>
            <Link
              to="/management/incidents"
              className="admin-primary-action btn h-10 rounded-xl px-4 text-sm font-semibold normal-case"
            >
              <Lucide.Siren size={16} aria-hidden="true" />
              Quáº£n lÃ½ sá»± vá»¥
            </Link>
            <button
              type="button"
              onClick={() => load({ background: true })}
              disabled={loading || refreshing}
              className="admin-secondary-action btn h-10 rounded-xl px-3 text-sm font-semibold normal-case"
              aria-label="LÃ m má»›i tá»•ng quan há»‡ thá»‘ng"
              title="LÃ m má»›i"
            >
              <Lucide.RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
          </div>
        )}
      />

      {error && !initialCacheState.hasData && !hasAggregateDashboardData ? (
        <AdminErrorState
          title="KhÃ´ng thá»ƒ táº£i tá»•ng quan sá»± vá»¥"
          description={error}
          onRetry={() => load()}
        />
      ) : (
        <>
          {(refreshing || warning) ? (
            <div className="flex min-h-7 flex-wrap items-center justify-between gap-3">
              <AdminRefreshIndicator visible={refreshing} label="Äang Ä‘á»“ng bá»™ dá»¯ liá»‡u sá»± vá»¥â€¦" />
              {warning ? (
                <p className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300" role="status">
                  <Lucide.TriangleAlert size={14} aria-hidden="true" />
                  {warning}
                </p>
              ) : null}
            </div>
          ) : null}

          <section className="manager-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chá»‰ sá»‘ tá»•ng quan há»‡ thá»‘ng">
            <ManagerMetricCard
              label="Tá»•ng sá»± vá»¥"
              value={loading ? 'â€”' : summary.total}
              description="Tá»•ng sá»‘ sá»± vá»¥ trong pháº¡m vi quáº£n trá»‹."
              icon={Lucide.Layers3}
              toneClass="bg-blue-50 text-blue-700"
              to="/management/incidents"
            />
            <ManagerMetricCard
              label="Äang má»Ÿ"
              value={loading ? 'â€”' : summary.open}
              description="Sá»± vá»¥ chÆ°a á»Ÿ nhÃ³m tráº¡ng thÃ¡i káº¿t thÃºc."
              icon={Lucide.Activity}
              toneClass="bg-cyan-50 text-cyan-700"
              to="/management/incidents"
            />
            <ManagerMetricCard
              label="Æ¯u tiÃªn cao / kháº©n"
              value={loading ? 'â€”' : summary.highPriority}
              description="Sá»± vá»¥ cáº§n Ä‘Æ°á»£c theo dÃµi vÃ  Ä‘iá»u phá»‘i sÃ¡t."
              icon={Lucide.TriangleAlert}
              toneClass="bg-rose-50 text-rose-700"
              to="/management/incidents"
            />
            <ManagerMetricCard
              label="SLA cáº£nh bÃ¡o / vi pháº¡m"
              value={loading || !slaOverview ? 'â€”' : `${slaWarning} / ${slaBreached}`}
              description="SLA Ä‘ang gáº§n háº¡n hoáº·c Ä‘Ã£ vÆ°á»£t cam káº¿t."
              icon={Lucide.Gauge}
              toneClass="bg-amber-50 text-amber-700"
              to="/management/sla"
            />
          </section>

          <section data-admin-dashboard-overview-grid className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
            <div className="min-w-0 space-y-5">
              <article className="admin-panel overflow-hidden">
                <ManagerSectionHeader
                  title="TÃ¬nh hÃ¬nh theo phÆ°á»ng"
                  description="So sÃ¡nh tá»•ng sá»± vá»¥ vÃ  sá»‘ Ä‘ang má»Ÿ Ä‘á»ƒ nháº­n biáº¿t khu vá»±c cáº§n chÃº Ã½."
                  icon={Lucide.MapPinned}
                  actions={(
                    <button
                      type="button"
                      onClick={() => focusDashboardMap('all')}
                      className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300"
                    >
                      Xem trÃªn báº£n Ä‘á»“
                    </button>
                  )}
                />

                <div className="border-t border-slate-100 dark:border-slate-800">
                  {summary.areas.slice(0, 6).map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => focusDashboardMap(item.key)}
                      className="group grid w-full gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50/80 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 dark:border-slate-800 dark:hover:bg-slate-900/50"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            index === 0
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-[15px] font-semibold text-slate-900 transition group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-300">
                              {item.name}
                            </strong>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span><b className="font-semibold text-slate-700 dark:text-slate-200">{item.open || 0}</b> Ä‘ang má»Ÿ</span>
                              <span><b className="font-semibold text-emerald-700 dark:text-emerald-300">{item.completed || 0}</b> Ä‘Ã£ hoÃ n thÃ nh</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-11 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <span
                            className={`block h-full rounded-full ${index === 0 ? 'bg-rose-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.max(4, (item.count / areaMax) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-11 sm:pl-0">
                        <div className="text-right">
                          <strong className="block text-xl font-bold tabular-nums tracking-tight text-slate-950 dark:text-white">
                            {item.count}
                          </strong>
                          <span className="text-xs text-slate-500">sá»± vá»¥</span>
                        </div>
                        <Lucide.ChevronRight size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" aria-hidden="true" />
                      </div>
                    </button>
                  ))}

                  {!loading && summary.areas.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Lucide.MapPinned size={24} className="mx-auto text-slate-300" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">ChÆ°a cÃ³ dá»¯ liá»‡u theo phÆ°á»ng</p>
                      <p className="mt-1 text-xs text-slate-500">Sá»± vá»¥ cáº§n cÃ³ thÃ´ng tin khu vá»±c Ä‘á»ƒ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y.</p>
                    </div>
                  ) : null}
                </div>
              </article>

              <article className="admin-panel overflow-hidden">
                <ManagerSectionHeader
                  title="Sá»± vá»¥ cáº­p nháº­t gáº§n Ä‘Ã¢y"
                  description="CÃ¡c sá»± vá»¥ cÃ³ thay Ä‘á»•i má»›i nháº¥t trÃªn toÃ n há»‡ thá»‘ng."
                  icon={Lucide.Clock3}
                  actions={(
                    <Link to="/management/incidents" className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300">
                      Xem táº¥t cáº£
                    </Link>
                  )}
                />

                <div data-admin-recent-incidents className="border-t border-slate-100 dark:border-slate-800">
                  {recentIncidents.map((incident) => {
                    const id = incident?.incidentId || incident?.id;
                    return (
                      <Link
                        key={id}
                        to={`/management/incidents/${id}`}
                        state={{ from: '/dashboard' }}
                        className="group grid min-w-0 gap-3 border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50/80 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(160px,0.42fr)_96px_140px_20px] lg:items-center dark:border-slate-800 dark:hover:bg-slate-900/50"
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 font-mono text-[11px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                              {formatIncidentCode(incident)}
                            </span>
                            <strong className="min-w-0 truncate text-sm font-semibold text-slate-900 transition group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-300">
                              {incident?.title || incident?.summary || 'Sá»± vá»¥ Ä‘Ã´ thá»‹'}
                            </strong>
                          </div>
                          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="min-w-0 truncate">{incident?.categoryName || 'ChÆ°a xÃ¡c Ä‘á»‹nh danh má»¥c'}</span>
                            <span className="inline-flex items-center gap-1.5">
                              <Lucide.Clock3 size={12} aria-hidden="true" />
                              {formatDateTime(incident?.updatedAt || incident?.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 text-sm text-slate-600 dark:text-slate-300">
                          <span className="inline-flex max-w-full items-center gap-1.5">
                            <Lucide.MapPin size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="truncate">{incident?.areaName || 'ChÆ°a xÃ¡c Ä‘á»‹nh phÆ°á»ng'}</span>
                          </span>
                        </div>

                        <div className="flex items-center lg:justify-center">
                          <span className="inline-flex max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {readPriorityLabel(incident?.priority)}
                          </span>
                        </div>

                        <div className="flex min-w-0 items-center lg:justify-center">
                          <StatusBadge status={incident?.status} />
                        </div>

                        <div className="hidden items-center justify-end lg:flex">
                          <Lucide.ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" aria-hidden="true" />
                        </div>
                      </Link>
                    );
                  })}

                  {!loading && recentIncidents.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">
                      ChÆ°a cÃ³ sá»± vá»¥ Ä‘á»ƒ hiá»ƒn thá»‹.
                    </div>
                  ) : null}
                </div>
              </article>
            </div>

            <div className="min-w-0 space-y-5">
              <article className="admin-panel overflow-hidden">
                <ManagerSectionHeader
                  title="Tráº¡ng thÃ¡i váº­n hÃ nh"
                  description="PhÃ¢n bá»‘ sá»± vá»¥ theo tráº¡ng thÃ¡i hiá»‡n táº¡i."
                  icon={Lucide.GitBranch}
                />
                <div className="space-y-4 border-t border-slate-100 p-5 dark:border-slate-800">
                  {summary.statuses.slice(0, 7).map((item) => (
                    <div key={item.key}>
                      <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {getAdminIncidentStatusLabel(item.name)}
                        </span>
                        <strong className="tabular-nums text-slate-900 dark:text-white">{item.count}</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span
                          className="block h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.max(4, (item.count / statusMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {!loading && summary.statuses.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">ChÆ°a cÃ³ dá»¯ liá»‡u tráº¡ng thÃ¡i.</p>
                  ) : null}
                </div>
              </article>

              <article className="admin-panel overflow-hidden">
                <ManagerSectionHeader
                  title="NhÃ³m váº¥n Ä‘á» ná»•i báº­t"
                  description="Danh má»¥c nhiá»u sá»± vá»¥."
                  icon={Lucide.Tags}
                  actions={(
                    <Link to="/management/categories" className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300">
                      Quáº£n lÃ½ danh má»¥c
                    </Link>
                  )}
                />
                <div className="space-y-4 border-t border-slate-100 p-5 dark:border-slate-800">
                  {summary.categories.slice(0, 5).map((item) => (
                    <Link
                      key={item.key}
                      to={`/management/incidents?categoryId=${encodeURIComponent(item.key)}`}
                      className="group block rounded-xl px-1 py-1 transition"
                    >
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="min-w-0 truncate font-medium text-slate-600 transition group-hover:text-blue-700 dark:text-slate-300 dark:group-hover:text-blue-300">
                          {item.name}
                        </span>
                        <strong className="tabular-nums text-slate-900 dark:text-white">{item.count}</strong>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span
                          className="block h-full rounded-full bg-cyan-500"
                          style={{ width: `${Math.max(4, (item.count / categoryMax) * 100)}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                  {!loading && summary.categories.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">ChÆ°a cÃ³ dá»¯ liá»‡u danh má»¥c.</p>
                  ) : null}
                </div>
              </article>


            </div>
          </section>

          <article ref={mapSectionRef} data-admin-dashboard-map className="admin-panel scroll-mt-24 overflow-hidden">
            <ManagerSectionHeader
              title="Báº£n Ä‘á»“ giÃ¡m sÃ¡t theo phÆ°á»ng"
              description={selectedArea ? `Äang xem ${selectedArea.name}.` : 'Tá»•ng quan vá»‹ trÃ­ sá»± vá»¥ trÃªn toÃ n bá»™ cÃ¡c phÆ°á»ng.'}
              icon={Lucide.Map}
              actions={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selectedArea ? (
                    <button
                      type="button"
                      onClick={() => focusDashboardMap('all')}
                      className="text-sm font-semibold text-slate-500 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
                    >
                      Táº¥t cáº£ phÆ°á»ng
                    </button>
                  ) : null}
                  <Link
                    to={detailedMapUrl}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300"
                  >
                    Má»Ÿ báº£n Ä‘á»“ chi tiáº¿t
                    <Lucide.ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}
            />
            <div className="border-t border-slate-100 p-3 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{selectedMapIncidents.length} sá»± vá»¥ trong pháº¡m vi Ä‘ang xem</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
                  {selectedArea ? selectedArea.name : 'Táº¥t cáº£ phÆ°á»ng'}
                </span>
              </div>
              <div className="relative h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                <IncidentMap
                  incidents={selectedMapIncidents}
                  fitRequestKey={mapFitRequestKey}
                  detailPathBuilder={(incident) => `/management/incidents/${incident?.incidentId || incident?.id || incident?.feedbackId}`}
                  returnPath="/dashboard"
                  showHeatLayer={false}
                  showMarkers
                  autoFitIncidents
                />
                {!loading && selectedMapIncidents.length === 0 ? (
                  <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2">
                    <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-center text-xs font-semibold text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-300">
                      ChÆ°a cÃ³ sá»± vá»¥ trong pháº¡m vi nÃ y
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </article>

          {error && (incidents.length > 0 || hasAggregateDashboardData) ? (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-rose-600" role="alert">
              <Lucide.CircleAlert size={16} aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;


