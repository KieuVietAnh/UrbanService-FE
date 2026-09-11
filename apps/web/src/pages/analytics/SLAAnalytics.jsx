import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { slaApi } from '../../services/api/slaApi';
import {
  ManagerMetricCard,
  ManagerPageHeader,
  ManagerSectionHeader,
} from '../../components/manager/ManagerPageElements';

const EMPTY_OVERVIEW = {
  totalSla: 0,
  runningSla: 0,
  completedSla: 0,
  breachedSla: 0,
  warningSla: 0,
  successRate: 0,
  averageResolutionMinutes: 0,
};

const EMPTY_COMPLIANCE = { todayRate: 0, thisWeekRate: 0, thisMonthRate: 0 };
const EMPTY_PERFORMANCE = {
  averageResponseMinutes: 0,
  averageResolutionMinutes: 0,
  responseSuccessRate: 0,
  resolutionSuccessRate: 0,
};

const SOURCE_KEYS = ['overview', 'compliance', 'performance', 'trend', 'near', 'recent'];
const AVAILABLE_BY_DEFAULT = Object.fromEntries(SOURCE_KEYS.map((key) => [key, true]));

const toNumber = (value) => Number(value) || 0;
const clampPercent = (value) => Math.max(0, Math.min(100, toNumber(value)));

const normalizeOverview = (value) => ({
  totalSla: toNumber(value?.totalSla ?? value?.TotalSla),
  runningSla: toNumber(value?.runningSla ?? value?.RunningSla),
  completedSla: toNumber(value?.completedSla ?? value?.CompletedSla),
  breachedSla: toNumber(value?.breachedSla ?? value?.BreachedSla),
  warningSla: toNumber(value?.warningSla ?? value?.WarningSla),
  successRate: toNumber(value?.successRate ?? value?.SuccessRate),
  averageResolutionMinutes: toNumber(value?.averageResolutionMinutes ?? value?.AverageResolutionMinutes),
});

const normalizeCompliance = (value) => ({
  todayRate: clampPercent(value?.todayRate ?? value?.TodayRate),
  thisWeekRate: clampPercent(value?.thisWeekRate ?? value?.ThisWeekRate),
  thisMonthRate: clampPercent(value?.thisMonthRate ?? value?.ThisMonthRate),
});

const normalizePerformance = (value) => ({
  averageResponseMinutes: toNumber(value?.averageResponseMinutes ?? value?.AverageResponseMinutes),
  averageResolutionMinutes: toNumber(value?.averageResolutionMinutes ?? value?.AverageResolutionMinutes),
  responseSuccessRate: clampPercent(value?.responseSuccessRate ?? value?.ResponseSuccessRate),
  resolutionSuccessRate: clampPercent(value?.resolutionSuccessRate ?? value?.ResolutionSuccessRate),
});

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const formatDuration = (minutes) => {
  const safeMinutes = Math.max(0, toNumber(minutes));
  if (safeMinutes < 60) return `${Math.round(safeMinutes)} phút`;
  const hours = safeMinutes / 60;
  return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} giờ`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const getIncidentSlaId = (item = {}) => (
  item?.incidentSlaId ?? item?.IncidentSlaId ?? item?.slaId ?? item?.SlaId ?? null
);
const getIncidentId = (item = {}) => item?.incidentId ?? item?.IncidentId ?? null;
const getIncidentTitle = (item = {}) => (
  item?.incidentTitle ?? item?.IncidentTitle ?? item?.title ?? item?.Title ?? 'Sự vụ chưa có tiêu đề'
);

const getBreachTypeMeta = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('response')) {
    return { label: 'Vi phạm thời hạn phản hồi', shortLabel: 'SLA phản hồi', Icon: Lucide.MessageCircleWarning };
  }
  if (normalized.includes('resolution')) {
    return { label: 'Vi phạm thời hạn hoàn thành', shortLabel: 'SLA hoàn thành', Icon: Lucide.BadgeCheck };
  }
  return { label: value || 'Vi phạm SLA', shortLabel: 'SLA', Icon: Lucide.ShieldAlert };
};

const getPriorityTone = (priority) => {
  const value = String(priority || '').toLowerCase();
  if (value === 'critical' || value === 'urgent') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (value === 'high') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (value === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const formatPriority = (priority) => {
  const value = String(priority || '').trim().toLowerCase();
  if (value === 'critical' || value === 'urgent') return 'Khẩn cấp';
  if (value === 'high') return 'Cao';
  if (value === 'medium') return 'Trung bình';
  if (value === 'low') return 'Thấp';
  return priority || '—';
};

const RateBar = ({ label, value, tone = 'blue', detail }) => {
  const safeValue = clampPercent(value);
  const tones = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500' };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
          {detail ? <span className="ml-2 text-[11px] text-slate-400">{detail}</span> : null}
        </div>
        <strong className="text-sm font-semibold tabular-nums text-slate-950 dark:text-white">{Math.round(safeValue)}%</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span className={`block h-full rounded-full transition-[width] duration-500 ${tones[tone] || tones.blue}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
};

const SourceUnavailable = ({ text, compact = false }) => (
  <div className={`rounded-2xl border border-amber-200/80 bg-amber-50/70 text-amber-800 ${compact ? 'px-4 py-4 text-xs' : 'px-5 py-6 text-sm'}`} role="status">
    <div className="flex items-center gap-2">
      <Lucide.WifiOff size={16} aria-hidden="true" />
      <span>{text}</span>
    </div>
  </div>
);

const OperationalSummary = ({ overview, available }) => {
  if (!available) return <SourceUnavailable text="Không tải được dữ liệu tình trạng SLA." />;
  if (overview.totalSla === 0) return <div className="admin-empty-panel px-5 py-7 text-center text-sm text-slate-500">Chưa có SLA để phân tích tình trạng vận hành.</div>;

  const statusTotal = Math.max(overview.runningSla + overview.completedSla, 1);
  const runningPercent = Math.round((overview.runningSla / statusTotal) * 100);
  const completedPercent = Math.max(0, 100 - runningPercent);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/45 p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Tiến độ vận hành</p>
            <p className="mt-1 text-xs text-slate-500">{overview.runningSla + overview.completedSla} SLA đang được theo dõi.</p>
          </div>
          <span className="text-xs font-medium text-slate-400">Tổng {overview.totalSla}</span>
        </div>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800" aria-label="Phân bổ SLA đang chạy và đã hoàn thành">
          <span className="bg-blue-500" style={{ width: `${runningPercent}%` }} />
          <span className="bg-emerald-500" style={{ width: `${completedPercent}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">Đang chạy</span><span className="h-2 w-2 rounded-full bg-blue-500" /></div>
            <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">{overview.runningSla}</strong><span className="text-xs text-slate-400">{runningPercent}%</span></div>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">Đã hoàn thành</span><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>
            <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">{overview.completedSla}</strong><span className="text-xs text-slate-400">{completedPercent}%</span></div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/65 px-4 py-4 dark:border-amber-900/50 dark:bg-amber-950/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm dark:bg-amber-950/30"><Lucide.ClockAlert size={18} /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Đang cảnh báo</p><p className="mt-0.5 text-xs text-slate-500">SLA đang chạy cần theo dõi</p></div>
          <strong className="text-2xl font-semibold tabular-nums text-amber-700">{overview.warningSla}</strong>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/65 px-4 py-4 dark:border-rose-900/50 dark:bg-rose-950/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-700 shadow-sm dark:bg-rose-950/30"><Lucide.TriangleAlert size={18} /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Đã vi phạm</p><p className="mt-0.5 text-xs text-slate-500">Phản hồi hoặc hoàn thành quá hạn</p></div>
          <strong className="text-2xl font-semibold tabular-nums text-rose-700">{overview.breachedSla}</strong>
        </div>
      </section>
    </div>
  );
};

const ViolationTrend = ({ data, available }) => {
  const normalized = useMemo(() => ([...data]
    .map((item) => ({ date: item?.date ?? item?.Date, count: toNumber(item?.count ?? item?.Count) }))
    .filter((item) => item.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))), [data]);
  const maxCount = Math.max(1, ...normalized.map((item) => item.count));

  if (!available) return <SourceUnavailable text="Không tải được dữ liệu xu hướng vi phạm." />;
  if (normalized.length === 0) return <div className="admin-empty-panel px-5 py-7 text-center text-sm text-slate-500">30 ngày gần đây chưa phát sinh sự kiện vi phạm SLA.</div>;

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[680px]">
        <div className="relative flex h-32 items-end gap-3 border-b border-slate-200 px-1 dark:border-slate-800">
          <span className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-slate-100 dark:border-slate-800/70" />
          <span className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed border-slate-100 dark:border-slate-800/70" />
          {normalized.map((item) => {
            const height = item.count === 0 ? 3 : Math.max(10, (item.count / maxCount) * 86);
            return (
              <div key={`${item.date}-${item.count}`} className="group relative z-10 flex min-w-[34px] flex-1 flex-col items-center justify-end self-stretch">
                <span className="mb-1.5 mt-auto text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{item.count}</span>
                <span className="block w-full max-w-8 rounded-t-lg bg-rose-500 transition-[height,opacity] duration-300 group-hover:opacity-80" style={{ height }} title={`${formatShortDate(item.date)}: ${item.count} sự kiện vi phạm`} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 px-1 pt-2">
          {normalized.map((item) => <span key={`label-${item.date}`} className="min-w-[34px] flex-1 text-center text-[10px] text-slate-400">{formatShortDate(item.date)}</span>)}
        </div>
      </div>
    </div>
  );
};

const groupRecentBreachesBySla = (items) => {
  const groups = new Map();
  items.forEach((item, index) => {
    const incidentId = getIncidentId(item);
    const incidentSlaId = getIncidentSlaId(item);
    const title = getIncidentTitle(item);
    const type = item?.type ?? item?.Type;
    const breachedAt = item?.breachedAt ?? item?.BreachedAt;
    const overdueMinutes = toNumber(item?.overdueMinutes ?? item?.OverdueMinutes);
    const key = incidentSlaId || incidentId || `unknown-${index}`;
    if (!groups.has(key)) groups.set(key, { key, incidentId, incidentSlaId, title, events: [] });
    groups.get(key).events.push({ type, breachedAt, overdueMinutes, ...getBreachTypeMeta(type) });
  });
  return Array.from(groups.values())
    .map((group) => ({ ...group, events: group.events.sort((a, b) => new Date(b.breachedAt || 0) - new Date(a.breachedAt || 0)) }))
    .sort((a, b) => new Date(b.events[0]?.breachedAt || 0).getTime() - new Date(a.events[0]?.breachedAt || 0).getTime());
};

const RecentBreachesPanel = ({ groups, events, returnPath, available }) => (
  <article className="admin-panel overflow-hidden">
    <ManagerSectionHeader
      title="Vi phạm gần đây"
      description="Theo từng sự vụ để phân biệt rõ vi phạm phản hồi và vi phạm hoàn thành."
      icon={Lucide.ShieldAlert}
      actions={available ? <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{groups.length} SLA · {events.length} sự kiện</span> : null}
    />
    <section className="p-4 sm:p-5">
      {!available ? <SourceUnavailable text="Không tải được danh sách vi phạm gần đây." /> : groups.length === 0 ? (
        <div className="admin-empty-panel px-5 py-7 text-center text-sm text-slate-500">Chưa có sự kiện vi phạm SLA gần đây.</div>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {groups.map((group, index) => {
            const isLastOdd = groups.length % 2 === 1 && index === groups.length - 1;
            return (
              <li key={group.key} className={isLastOdd ? 'xl:col-span-2' : ''}>
                <article className="h-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950/30">
                  <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{group.title}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {group.incidentSlaId ? <span>SLA #{group.incidentSlaId}</span> : null}
                        {group.incidentId ? <Link to={`/manager/incidents/${group.incidentId}`} state={{ from: returnPath }} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800">Xem sự vụ <Lucide.ArrowUpRight size={13} /></Link> : null}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{group.events.length} vi phạm</span>
                  </header>
                  <div className={`grid divide-y divide-slate-100 dark:divide-slate-800 ${isLastOdd && group.events.length > 1 ? 'xl:grid-cols-2 xl:divide-x xl:divide-y-0' : ''}`}>
                    {group.events.map((event, eventIndex) => {
                      const EventIcon = event.Icon;
                      return (
                        <div key={`${group.key}-${event.type || eventIndex}-${event.breachedAt || eventIndex}`} className="flex items-start gap-3 px-4 py-3.5">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><EventIcon size={16} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                              <div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.label}</p><p className="mt-1 text-xs text-slate-500">{event.shortLabel} · {formatDateTime(event.breachedAt)}</p></div>
                              <strong className="text-sm font-semibold tabular-nums text-rose-700">Quá hạn {formatDuration(event.overdueMinutes)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  </article>
);

const LoadingSkeleton = () => (
  <article className="admin-page-shell space-y-5" aria-busy="true" aria-label="Đang tải phân tích SLA">
    <header className="admin-page-hero h-32 animate-pulse" />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <article key={index} className="admin-stat-card h-32 animate-pulse" />)}</section>
    <section className="grid items-start gap-5 xl:grid-cols-2"><article className="admin-panel h-72 animate-pulse" /><article className="admin-panel h-72 animate-pulse" /></section>
    <article className="admin-panel h-64 animate-pulse" />
    <article className="admin-panel h-56 animate-pulse" />
    <article className="admin-panel h-72 animate-pulse" />
  </article>
);

export const SLAAnalytics = () => {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;
  const requestIdRef = useRef(0);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [compliance, setCompliance] = useState(EMPTY_COMPLIANCE);
  const [performance, setPerformance] = useState(EMPTY_PERFORMANCE);
  const [violationTrend, setViolationTrend] = useState([]);
  const [nearBreaches, setNearBreaches] = useState([]);
  const [recentBreaches, setRecentBreaches] = useState([]);
  const [availability, setAvailability] = useState(AVAILABLE_BY_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async ({ initial = false } = {}) => {
    const requestId = ++requestIdRef.current;
    if (initial) setLoading(true); else setRefreshing(true);
    setError('');

    const requests = await Promise.allSettled([
      slaApi.getDashboardOverview(), slaApi.getDashboardCompliance(), slaApi.getDashboardPerformance(),
      slaApi.getDashboardViolationsChart(), slaApi.getDashboardNearingBreach(10), slaApi.getDashboardRecentBreach(10),
    ]);
    if (requestId !== requestIdRef.current) return;

    const [overviewResult, complianceResult, performanceResult, violationsResult, nearResult, recentResult] = requests;
    const nextAvailability = {
      overview: overviewResult.status === 'fulfilled', compliance: complianceResult.status === 'fulfilled',
      performance: performanceResult.status === 'fulfilled', trend: violationsResult.status === 'fulfilled',
      near: nearResult.status === 'fulfilled', recent: recentResult.status === 'fulfilled',
    };
    setAvailability(nextAvailability);

    if (overviewResult.status === 'fulfilled') setOverview(normalizeOverview(overviewResult.value));
    if (complianceResult.status === 'fulfilled') setCompliance(normalizeCompliance(complianceResult.value));
    if (performanceResult.status === 'fulfilled') setPerformance(normalizePerformance(performanceResult.value));
    if (violationsResult.status === 'fulfilled') setViolationTrend(normalizeArray(violationsResult.value));
    if (nearResult.status === 'fulfilled') setNearBreaches(normalizeArray(nearResult.value));
    if (recentResult.status === 'fulfilled') setRecentBreaches(normalizeArray(recentResult.value));

    const failedCount = Object.values(nextAvailability).filter((value) => !value).length;
    if (failedCount > 0) setError(failedCount === SOURCE_KEYS.length ? 'Không thể tải dữ liệu phân tích SLA. Vui lòng thử lại.' : `Có ${failedCount}/${SOURCE_KEYS.length} nguồn dữ liệu SLA chưa tải được. Các phần còn lại vẫn được giữ nguyên.`);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchStats({ initial: true }).catch((err) => {
      console.error(err);
      setError('Không thể tải dữ liệu phân tích SLA. Vui lòng thử lại.');
      setLoading(false);
      setRefreshing(false);
    });
    return () => { requestIdRef.current += 1; };
  }, [fetchStats]);

  const groupedRecentBreaches = useMemo(() => groupRecentBreachesBySla(recentBreaches), [recentBreaches]);
  const successRate = clampPercent(overview.successRate);
  const totalViolationEvents = useMemo(() => violationTrend.reduce((sum, item) => sum + toNumber(item?.count ?? item?.Count), 0), [violationTrend]);
  const healthLabel = useMemo(() => {
    if (!availability.overview) return 'Chưa xác định';
    if (overview.totalSla === 0) return 'Chưa có dữ liệu';
    if (overview.breachedSla === 0 && overview.warningSla === 0) return 'Ổn định';
    return overview.breachedSla > 0 ? 'Cần theo dõi' : 'Có cảnh báo';
  }, [availability.overview, overview]);

  if (loading) return <LoadingSkeleton />;

  const metricUnavailable = !availability.overview;
  const metricValue = (value) => metricUnavailable ? '—' : value;

  return (
    <article className="admin-page-shell space-y-5">
      <ManagerPageHeader
        title="Phân tích SLA sự vụ"
        description="Theo dõi mức tuân thủ, hiệu suất xử lý, cảnh báo gần hạn và các vi phạm SLA của sự vụ."
        icon={Lucide.TimerReset}
        statusLabel="Sức khỏe SLA"
        statusValue={healthLabel}
        statusTone={availability.overview && overview.breachedSla === 0 ? 'success' : 'warning'}
        actions={(
          <button type="button" onClick={() => fetchStats()} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            <Lucide.RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Đang làm mới' : 'Làm mới'}
          </button>
        )}
      />

      {error ? <section className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert"><span>{error}</span><button type="button" onClick={() => fetchStats()} disabled={refreshing} className="shrink-0 font-semibold text-amber-900 underline underline-offset-2">Thử lại</button></section> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số SLA tổng quan">
        <ManagerMetricCard label="Tỷ lệ đạt SLA đã hoàn thành" value={metricValue(`${Math.round(successRate)}%`)} description={metricUnavailable ? 'Không tải được dữ liệu tổng quan.' : `${overview.completedSla} SLA đã hoàn thành được dùng làm mẫu tính.`} icon={Lucide.CircleCheckBig} toneClass="bg-blue-50 text-blue-700" />
        <ManagerMetricCard label="SLA có vi phạm" value={metricValue(overview.breachedSla)} description={metricUnavailable ? 'Không tải được dữ liệu tổng quan.' : 'Vi phạm thời hạn phản hồi hoặc hoàn thành.'} icon={Lucide.TriangleAlert} toneClass="bg-rose-50 text-rose-700" />
        <ManagerMetricCard label="Thời gian hoàn thành trung bình" value={metricValue(formatDuration(overview.averageResolutionMinutes))} description={metricUnavailable ? 'Không tải được dữ liệu tổng quan.' : 'Tính trên SLA đã hoàn thành, loại thời gian tạm dừng.'} icon={Lucide.Clock3} toneClass="bg-amber-50 text-amber-700" />
        <ManagerMetricCard label="Tổng số SLA" value={metricValue(overview.totalSla)} description={metricUnavailable ? 'Không tải được dữ liệu tổng quan.' : `${overview.runningSla} đang chạy · ${overview.completedSla} đã hoàn thành.`} icon={Lucide.Files} toneClass="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="admin-panel overflow-hidden">
          <ManagerSectionHeader title="Tuân thủ theo thời gian" description="Tỷ lệ SLA tạo trong từng kỳ chưa phát sinh vi phạm." icon={Lucide.Gauge} />
          <section className="p-5">
            {!availability.compliance ? <SourceUnavailable text="Không tải được dữ liệu tuân thủ theo thời gian." /> : (
              <div className="space-y-4">
                <RateBar label="Hôm nay" value={compliance.todayRate} tone="blue" detail="SLA tạo hôm nay" />
                <RateBar label="Tuần này" value={compliance.thisWeekRate} tone="emerald" detail="SLA tạo trong tuần" />
                <RateBar label="Tháng này" value={compliance.thisMonthRate} tone="amber" detail="SLA tạo trong tháng" />
                <p className="border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800">Tỷ lệ này xét cả SLA đang chạy trong kỳ nên không đồng nhất với tỷ lệ đạt của nhóm đã hoàn thành.</p>
              </div>
            )}
          </section>
        </article>

        <article className="admin-panel overflow-hidden">
          <ManagerSectionHeader title="Hiệu suất xử lý" description="Thời gian trung bình và mức đạt mục tiêu của SLA đã hoàn thành." icon={Lucide.Activity} />
          <section className="p-5">
            {!availability.performance ? <SourceUnavailable text="Không tải được dữ liệu hiệu suất xử lý." /> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <article className="rounded-2xl border border-blue-100 bg-blue-50/45 p-4 dark:border-blue-900/40 dark:bg-blue-950/10">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-400">Phản hồi đầu tiên</p><strong className="mt-2 block text-2xl font-semibold text-slate-950 dark:text-white">{formatDuration(performance.averageResponseMinutes)}</strong></div><Lucide.MessageCircle size={19} className="text-blue-600" /></div>
                  <div className="mt-4"><RateBar label="Đạt SLA phản hồi" value={performance.responseSuccessRate} tone="blue" /></div>
                </article>
                <article className="rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-400">Hoàn thành xử lý</p><strong className="mt-2 block text-2xl font-semibold text-slate-950 dark:text-white">{formatDuration(performance.averageResolutionMinutes)}</strong></div><Lucide.CircleCheckBig size={19} className="text-emerald-600" /></div>
                  <div className="mt-4"><RateBar label="Đạt SLA hoàn thành" value={performance.resolutionSuccessRate} tone="emerald" /></div>
                </article>
              </div>
            )}
          </section>
        </article>
      </section>

      <section className="admin-panel overflow-hidden">
        <ManagerSectionHeader title="Tình trạng vận hành" description="Phân bổ SLA đang xử lý, đã hoàn thành và các trường hợp cần chú ý." icon={Lucide.ChartNoAxesCombined} />
        <section className="p-4 sm:p-5"><OperationalSummary overview={overview} available={availability.overview} /></section>
      </section>

      <section className="admin-panel overflow-hidden">
        <ManagerSectionHeader title="Xu hướng vi phạm SLA" description="Các sự kiện vi phạm phản hồi hoặc hoàn thành được backend ghi nhận trong 30 ngày gần đây." icon={Lucide.ChartColumnIncreasing} actions={availability.trend ? <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{totalViolationEvents} sự kiện</span> : null} />
        <section className="p-4 sm:p-5"><ViolationTrend data={violationTrend} available={availability.trend} /></section>
      </section>

      <section className="admin-panel overflow-hidden">
        <ManagerSectionHeader title="Theo dõi ưu tiên" description="SLA đang tiến gần thời hạn để Manager ưu tiên xử lý trước khi vi phạm." icon={Lucide.AlarmClock} actions={availability.near ? <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${nearBreaches.length ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{nearBreaches.length} SLA</span> : null} />
        <section className="p-4 sm:p-5">
          {!availability.near ? <SourceUnavailable text="Không tải được danh sách SLA sắp đến hạn." /> : nearBreaches.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Lucide.CircleCheckBig size={19} /></span><div><p className="text-sm font-semibold text-slate-900">Không có SLA trong vùng cảnh báo</p><p className="mt-0.5 text-xs text-slate-500">Hiện chưa có SLA đang chạy nào cần ưu tiên vì sắp đến hạn.</p></div></div>
              <span className="text-xs font-medium text-emerald-700">Trạng thái tốt</span>
            </div>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {nearBreaches.map((item, index) => {
                const incidentId = getIncidentId(item);
                const incidentSlaId = getIncidentSlaId(item);
                const title = getIncidentTitle(item);
                const priority = item?.priority ?? item?.Priority ?? '—';
                const deadline = item?.deadline ?? item?.Deadline ?? item?.resolutionDueAt ?? item?.ResolutionDueAt ?? item?.responseDueAt ?? item?.ResponseDueAt;
                const remainingMinutes = toNumber(item?.remainingMinutes ?? item?.RemainingMinutes ?? item?.minutesRemaining ?? item?.MinutesRemaining);
                return (
                  <li key={incidentSlaId || incidentId || index}>
                    <article className="h-full rounded-2xl border border-amber-200/80 bg-amber-50/45 p-4 dark:border-amber-900/50 dark:bg-amber-950/10">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-950">{title}</h3><p className="mt-1 text-xs text-slate-500">Hạn: {formatDateTime(deadline)}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getPriorityTone(priority)}`}>{formatPriority(priority)}</span></div>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-amber-100 pt-3"><span className="text-xs text-slate-400">{incidentSlaId ? `SLA #${incidentSlaId}` : 'SLA'}</span><strong className="text-sm font-semibold tabular-nums text-amber-700">Còn {formatDuration(remainingMinutes)}</strong></div>
                      {incidentId ? <Link to={`/manager/incidents/${incidentId}`} state={{ from: returnPath }} className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">Xem sự vụ <Lucide.ArrowUpRight size={13} /></Link> : null}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
          {availability.near && nearBreaches.length >= 10 ? <p className="mt-3 text-right text-[11px] text-slate-400">Đang hiển thị tối đa 10 SLA gần hạn.</p> : null}
        </section>
      </section>

      <RecentBreachesPanel groups={groupedRecentBreaches} events={recentBreaches} returnPath={returnPath} available={availability.recent} />
      {availability.recent && recentBreaches.length >= 10 ? <p className="-mt-2 px-1 text-right text-[11px] text-slate-400">Danh sách đang hiển thị tối đa 10 sự kiện vi phạm gần nhất.</p> : null}

      <p className="px-1 text-xs leading-5 text-slate-500">Một SLA có thể phát sinh cả vi phạm phản hồi và vi phạm hoàn thành; các sự kiện được nhóm theo SLA để tránh hiểu nhầm thành nhiều sự vụ khác nhau.</p>
    </article>
  );
};
