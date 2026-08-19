import { useEffect, useMemo, useState } from 'react';
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

const EMPTY_COMPLIANCE = {
  todayRate: 0,
  thisWeekRate: 0,
  thisMonthRate: 0,
};

const EMPTY_PERFORMANCE = {
  averageResponseMinutes: 0,
  averageResolutionMinutes: 0,
  responseSuccessRate: 0,
  resolutionSuccessRate: 0,
};

const toNumber = (value) => Number(value) || 0;
const clampPercent = (value) => Math.max(0, Math.min(100, toNumber(value)));

const normalizeOverview = (value) => ({
  totalSla: toNumber(value?.totalSla ?? value?.TotalSla),
  runningSla: toNumber(value?.runningSla ?? value?.RunningSla),
  completedSla: toNumber(value?.completedSla ?? value?.CompletedSla),
  breachedSla: toNumber(value?.breachedSla ?? value?.BreachedSla),
  warningSla: toNumber(value?.warningSla ?? value?.WarningSla),
  successRate: toNumber(value?.successRate ?? value?.SuccessRate),
  averageResolutionMinutes: toNumber(
    value?.averageResolutionMinutes ?? value?.AverageResolutionMinutes
  ),
});

const normalizeCompliance = (value) => ({
  todayRate: clampPercent(value?.todayRate ?? value?.TodayRate),
  thisWeekRate: clampPercent(value?.thisWeekRate ?? value?.ThisWeekRate),
  thisMonthRate: clampPercent(value?.thisMonthRate ?? value?.ThisMonthRate),
});

const normalizePerformance = (value) => ({
  averageResponseMinutes: toNumber(
    value?.averageResponseMinutes ?? value?.AverageResponseMinutes
  ),
  averageResolutionMinutes: toNumber(
    value?.averageResolutionMinutes ?? value?.AverageResolutionMinutes
  ),
  responseSuccessRate: clampPercent(
    value?.responseSuccessRate ?? value?.ResponseSuccessRate
  ),
  resolutionSuccessRate: clampPercent(
    value?.resolutionSuccessRate ?? value?.ResolutionSuccessRate
  ),
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
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const getBreachTypeMeta = (value) => {
  const normalized = String(value || '').toLowerCase();

  if (normalized.includes('response')) {
    return {
      label: 'Vi phạm thời hạn phản hồi',
      shortLabel: 'Response SLA',
      Icon: Lucide.MessageCircleWarning,
    };
  }

  if (normalized.includes('resolution')) {
    return {
      label: 'Vi phạm thời hạn hoàn thành',
      shortLabel: 'Resolution SLA',
      Icon: Lucide.BadgeCheck,
    };
  }

  return {
    label: value || 'Vi phạm SLA',
    shortLabel: 'SLA',
    Icon: Lucide.ShieldAlert,
  };
};

const getPriorityTone = (priority) => {
  const value = String(priority || '').toLowerCase();
  if (value === 'critical' || value === 'urgent') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (value === 'high') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (value === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const RateBar = ({ label, value, tone = 'blue' }) => {
  const safeValue = clampPercent(value);
  const tones = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
  };

  return (
    <div>
      <header className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <strong className="text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
          {Math.round(safeValue)}%
        </strong>
      </header>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ${tones[tone] || tones.blue}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};

const SlaStatusAndRisk = ({ overview }) => {
  const statusTotal = Math.max(overview.runningSla + overview.completedSla, 1);

  const statusItems = [
    {
      key: 'running',
      label: 'Đang chạy',
      value: overview.runningSla,
      percentage:
        overview.runningSla + overview.completedSla > 0
          ? Math.round((overview.runningSla / statusTotal) * 100)
          : 0,
      barClass: 'bg-blue-500',
      iconClass: 'bg-blue-50 text-blue-700',
      Icon: Lucide.TimerReset,
    },
    {
      key: 'completed',
      label: 'Đã hoàn thành',
      value: overview.completedSla,
      percentage:
        overview.runningSla + overview.completedSla > 0
          ? Math.round((overview.completedSla / statusTotal) * 100)
          : 0,
      barClass: 'bg-emerald-500',
      iconClass: 'bg-emerald-50 text-emerald-700',
      Icon: Lucide.CircleCheckBig,
    },
  ];

  const riskItems = [
    {
      key: 'warning',
      label: 'Đang có cảnh báo',
      description: 'SLA hiện đang chạy đã phát sinh cảnh báo.',
      value: overview.warningSla,
      iconClass: 'bg-amber-50 text-amber-700',
      Icon: Lucide.ClockAlert,
    },
    {
      key: 'breached',
      label: 'SLA có vi phạm',
      description: 'SLA đã vi phạm Response hoặc Resolution SLA.',
      value: overview.breachedSla,
      iconClass: 'bg-rose-50 text-rose-700',
      Icon: Lucide.TriangleAlert,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <header className="mb-4">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Trạng thái SLA</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Cơ cấu SLA đang chạy và đã hoàn thành.
          </p>
        </header>

        <div className="space-y-3">
          {statusItems.map(({ key, label, value, percentage, barClass, iconClass, Icon }) => (
            <article key={key} className="admin-inset-panel p-4">
              <header className="flex items-center justify-between gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{percentage}% trong nhóm trạng thái</span>
                  </span>
                </span>
                <strong className="shrink-0 text-lg font-semibold tabular-nums text-slate-950 dark:text-white">{value}</strong>
              </header>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className={`block h-full rounded-full transition-[width] duration-500 ${barClass}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <header className="mb-4">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Rủi ro SLA</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Cảnh báo và vi phạm là chỉ dấu rủi ro, không phải trạng thái loại trừ lẫn nhau.
          </p>
        </header>

        <div className="space-y-3">
          {riskItems.map(({ key, label, description, value, iconClass, Icon }) => (
            <article key={key} className="admin-inset-panel p-4">
              <header className="flex items-center justify-between gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
                  </span>
                </span>
                <strong className="shrink-0 text-lg font-semibold tabular-nums text-slate-950 dark:text-white">{value}</strong>
              </header>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

const ViolationTrend = ({ data }) => {
  const normalized = useMemo(() => (
    [...data]
      .map((item) => ({
        date: item?.date ?? item?.Date,
        count: toNumber(item?.count ?? item?.Count),
      }))
      .filter((item) => item.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  ), [data]);

  const maxCount = Math.max(1, ...normalized.map((item) => item.count));

  if (normalized.length === 0) {
    return <div className="admin-empty-panel p-8 text-center text-sm text-slate-500">30 ngày gần đây chưa phát sinh sự kiện vi phạm SLA.</div>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[760px] items-end gap-2 pt-4" style={{ height: 230 }}>
        {normalized.map((item) => {
          const height = item.count === 0 ? 4 : Math.max(14, (item.count / maxCount) * 160);
          return (
            <div key={`${item.date}-${item.count}`} className="flex min-w-[28px] flex-1 flex-col items-center justify-end">
              <span className="mb-2 text-[11px] font-semibold tabular-nums text-slate-600">{item.count}</span>
              <div className="flex h-40 w-full items-end justify-center rounded-xl bg-slate-50 px-1 dark:bg-slate-900/50">
                <span
                  className="block w-full max-w-7 rounded-t-lg bg-rose-500 transition-[height] duration-500"
                  style={{ height }}
                  title={`${formatShortDate(item.date)}: ${item.count} vi phạm`}
                />
              </div>
              <span className="mt-2 text-[10px] text-slate-400">{formatShortDate(item.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


const groupRecentBreachesBySla = (items) => {
  const groups = new Map();

  items.forEach((item, index) => {
    const feedbackId = item?.feedbackId ?? item?.FeedbackId;
    const feedbackSlaId = item?.feedbackSlaId ?? item?.FeedbackSlaId;
    const title = item?.title ?? item?.Title ?? 'Phản ánh chưa có tiêu đề';
    const type = item?.type ?? item?.Type;
    const breachedAt = item?.breachedAt ?? item?.BreachedAt;
    const overdueMinutes = toNumber(item?.overdueMinutes ?? item?.OverdueMinutes);
    const key = feedbackSlaId || feedbackId || `unknown-${index}`;
    const meta = getBreachTypeMeta(type);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        feedbackId,
        feedbackSlaId,
        title,
        events: [],
      });
    }

    groups.get(key).events.push({
      type,
      breachedAt,
      overdueMinutes,
      ...meta,
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      events: group.events.sort(
        (a, b) => new Date(b.breachedAt || 0) - new Date(a.breachedAt || 0)
      ),
    }))
    .sort((a, b) => {
      const aTime = new Date(a.events[0]?.breachedAt || 0).getTime();
      const bTime = new Date(b.events[0]?.breachedAt || 0).getTime();
      return bTime - aTime;
    });
};

const EmptyList = ({ text }) => (
  <div className="admin-empty-panel p-8 text-center text-sm text-slate-500">{text}</div>
);

export const SLAAnalytics = () => {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [compliance, setCompliance] = useState(EMPTY_COMPLIANCE);
  const [performance, setPerformance] = useState(EMPTY_PERFORMANCE);
  const [violationTrend, setViolationTrend] = useState([]);
  const [nearBreaches, setNearBreaches] = useState([]);
  const [recentBreaches, setRecentBreaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchStats = async () => {
      setLoading(true);
      setError('');

      const requests = await Promise.allSettled([
        slaApi.getDashboardOverview(),
        slaApi.getDashboardCompliance(),
        slaApi.getDashboardPerformance(),
        slaApi.getDashboardViolationsChart(),
        slaApi.getDashboardNearingBreach(10),
        slaApi.getDashboardRecentBreach(10),
      ]);

      if (!active) return;

      const [
        overviewResult,
        complianceResult,
        performanceResult,
        violationsResult,
        nearBreachResult,
        recentBreachResult,
      ] = requests;

      setOverview(
        overviewResult.status === 'fulfilled'
          ? normalizeOverview(overviewResult.value)
          : EMPTY_OVERVIEW
      );

      setCompliance(
        complianceResult.status === 'fulfilled'
          ? normalizeCompliance(complianceResult.value)
          : EMPTY_COMPLIANCE
      );

      setPerformance(
        performanceResult.status === 'fulfilled'
          ? normalizePerformance(performanceResult.value)
          : EMPTY_PERFORMANCE
      );

      setViolationTrend(
        violationsResult.status === 'fulfilled'
          ? normalizeArray(violationsResult.value)
          : []
      );

      setNearBreaches(
        nearBreachResult.status === 'fulfilled'
          ? normalizeArray(nearBreachResult.value)
          : []
      );

      setRecentBreaches(
        recentBreachResult.status === 'fulfilled'
          ? normalizeArray(recentBreachResult.value)
          : []
      );

      const failedCount = requests.filter((result) => result.status === 'rejected').length;
      if (failedCount > 0) {
        setError(
          failedCount === requests.length
            ? 'Không thể tải dữ liệu phân tích SLA. Vui lòng thử lại sau.'
            : `Một phần dữ liệu SLA chưa tải được (${failedCount}/${requests.length} nguồn dữ liệu). Các chỉ số còn lại vẫn được hiển thị.`
        );
      }

      setLoading(false);
    };

    fetchStats().catch((err) => {
      if (!active) return;
      console.error(err);
      setError('Không thể tải dữ liệu phân tích SLA. Vui lòng thử lại sau.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const healthLabel = useMemo(() => {
    if (overview.totalSla === 0) return 'Chưa có dữ liệu';
    if (overview.breachedSla === 0 && overview.warningSla === 0) return 'Ổn định';
    if (overview.successRate >= 85) return 'Cần theo dõi';
    return 'Cần cải thiện';
  }, [overview]);

  const successRate = clampPercent(overview.successRate);
  const groupedRecentBreaches = useMemo(
    () => groupRecentBreachesBySla(recentBreaches),
    [recentBreaches]
  );


  if (loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải phân tích SLA">
        <header className="admin-page-hero h-44 animate-pulse" />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="admin-stat-card h-28 animate-pulse" />
          ))}
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="admin-panel h-80 animate-pulse" />
          ))}
        </section>
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Chỉ số SLA dịch vụ"
        description="Theo dõi trạng thái, hiệu suất, cảnh báo và sự kiện vi phạm SLA theo đúng ý nghĩa dữ liệu backend."
        icon={Lucide.TimerReset}
        statusLabel="Sức khỏe SLA"
        statusValue={healthLabel}
      />

      {error ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số SLA tổng quan">
        <ManagerMetricCard
          label="Tỷ lệ đạt SLA đã hoàn thành"
          value={`${Math.round(successRate)}%`}
          description={`${overview.completedSla} SLA đã hoàn thành được dùng làm mẫu tính.`}
          icon={Lucide.CircleCheckBig}
          toneClass="bg-blue-50 text-blue-700"
        />
        <ManagerMetricCard
          label="SLA có vi phạm"
          value={overview.breachedSla}
          description="Số SLA đã vi phạm Response hoặc Resolution SLA."
          icon={Lucide.TriangleAlert}
          toneClass="bg-rose-50 text-rose-700"
        />
        <ManagerMetricCard
          label="Thời gian hoàn thành trung bình"
          value={formatDuration(overview.averageResolutionMinutes)}
          description="Tính trên SLA đã hoàn thành và loại thời gian tạm dừng."
          icon={Lucide.Clock3}
          toneClass="bg-amber-50 text-amber-700"
        />
        <ManagerMetricCard
          label="Tổng số SLA"
          value={overview.totalSla}
          description={`${overview.runningSla} đang chạy · ${overview.completedSla} đã hoàn thành.`}
          icon={Lucide.Files}
          toneClass="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section className="grid items-stretch gap-6 xl:grid-cols-2">
        <article className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Tỷ lệ SLA chưa vi phạm theo kỳ"
            description="Tính trên các SLA được tạo trong từng khoảng thời gian và chưa phát sinh vi phạm."
            icon={Lucide.Gauge}
          />
          <section className="space-y-6 p-5 sm:p-6">
            <RateBar label="SLA tạo hôm nay chưa vi phạm" value={compliance.todayRate} tone="blue" />
            <RateBar label="SLA tạo trong tuần chưa vi phạm" value={compliance.thisWeekRate} tone="emerald" />
            <RateBar label="SLA tạo trong tháng chưa vi phạm" value={compliance.thisMonthRate} tone="amber" />
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 dark:bg-slate-900/50">
              Chỉ số này xét mọi SLA được tạo trong kỳ, kể cả SLA đang chạy; vì vậy không đồng nhất với tỷ lệ đạt SLA đã hoàn thành.
            </p>
          </section>
        </article>

        <article className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Hiệu suất SLA đã hoàn thành"
            description="Các chỉ số thời gian và tỷ lệ đạt target chỉ tính trên SLA đã hoàn thành."
            icon={Lucide.Activity}
          />
          <section className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <article className="admin-inset-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Phản hồi đầu tiên</p>
              <strong className="mt-2 block text-2xl font-semibold text-slate-950 dark:text-white">
                {formatDuration(performance.averageResponseMinutes)}
              </strong>
              <p className="mt-1 text-xs text-slate-500">Thời gian phản hồi trung bình</p>
              <div className="mt-5">
                <RateBar label="Tỷ lệ đạt Response SLA" value={performance.responseSuccessRate} tone="blue" />
              </div>
            </article>

            <article className="admin-inset-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Hoàn thành xử lý</p>
              <strong className="mt-2 block text-2xl font-semibold text-slate-950 dark:text-white">
                {formatDuration(performance.averageResolutionMinutes)}
              </strong>
              <p className="mt-1 text-xs text-slate-500">Thời gian hoàn thành trung bình</p>
              <div className="mt-5">
                <RateBar label="Tỷ lệ đạt Resolution SLA" value={performance.resolutionSuccessRate} tone="emerald" />
              </div>
            </article>
          </section>
        </article>
      </section>

      <section className="admin-panel overflow-hidden">
        <ManagerSectionHeader
          title="Trạng thái và rủi ro SLA"
          description="Tách trạng thái vận hành khỏi cảnh báo và vi phạm để tránh cộng trùng dữ liệu."
          icon={Lucide.ChartNoAxesCombined}
        />
        <section className="p-5 sm:p-6">
          {overview.totalSla > 0 ? (
            <SlaStatusAndRisk overview={overview} />
          ) : (
            <EmptyList text="Chưa có dữ liệu SLA để phân tích." />
          )}
        </section>
      </section>

      <section className="admin-panel overflow-hidden">
        <ManagerSectionHeader
          title="Sự kiện vi phạm SLA trong 30 ngày"
          description="Số sự kiện ResponseBreached và ResolutionBreached được ghi nhận theo từng ngày."
          icon={Lucide.ChartColumnIncreasing}
          actions={(
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              {violationTrend.reduce((sum, item) => sum + toNumber(item?.count ?? item?.Count), 0)} sự kiện
            </span>
          )}
        />
        <section className="p-5 sm:p-6">
          <ViolationTrend data={violationTrend} />
        </section>
      </section>

      <section className="grid items-stretch gap-6 xl:grid-cols-2">
        <article className="admin-panel flex h-[520px] flex-col overflow-hidden">
          <ManagerSectionHeader
            title="SLA đang chạy gần đến hạn"
            description="Các SLA hiện tại đã đi vào vùng cảnh báo theo ngưỡng thời gian còn lại."
            icon={Lucide.AlarmClock}
            actions={(
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {nearBreaches.length} SLA
              </span>
            )}
          />
          <section className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {nearBreaches.length > 0 ? (
              <ul className="space-y-3">
                {nearBreaches.map((item, index) => {
                  const feedbackId = item?.feedbackId ?? item?.FeedbackId;
                  const feedbackSlaId = item?.feedbackSlaId ?? item?.FeedbackSlaId;
                  const title = item?.title ?? item?.Title ?? 'Phản ánh chưa có tiêu đề';
                  const priority = item?.priority ?? item?.Priority ?? '—';
                  const deadline = item?.deadline ?? item?.Deadline;
                  const remainingMinutes = toNumber(item?.remainingMinutes ?? item?.RemainingMinutes);

                  return (
                    <li key={feedbackSlaId || feedbackId || index} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/10">
                      <header className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                          <p className="mt-1 text-xs text-slate-500">Hạn: {formatDateTime(deadline)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getPriorityTone(priority)}`}>
                          {priority}
                        </span>
                      </header>
                      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-amber-100 pt-3 dark:border-amber-900/40">
                        <span className="text-xs text-slate-400">SLA #{feedbackSlaId || '—'}</span>
                        <strong className="text-sm font-semibold tabular-nums text-amber-700">
                          Còn {formatDuration(remainingMinutes)}
                        </strong>
                      </footer>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyList text="Hiện không có SLA đang chạy nào nằm trong vùng cảnh báo gần đến hạn." />
            )}
          </section>
        </article>

        <article className="admin-panel flex h-[520px] flex-col overflow-hidden">
          <ManagerSectionHeader
            title="Sự kiện vi phạm gần đây"
            description="Nhóm theo từng SLA để phân biệt rõ vi phạm phản hồi và vi phạm hoàn thành."
            icon={Lucide.ShieldAlert}
            actions={(
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                {groupedRecentBreaches.length} SLA · {recentBreaches.length} sự kiện
              </span>
            )}
          />
          <section className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {groupedRecentBreaches.length > 0 ? (
              <ul className="space-y-4">
                {groupedRecentBreaches.map((group) => (
                  <li
                    key={group.key}
                    className="overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/35 dark:border-rose-900/50 dark:bg-rose-950/10"
                  >
                    <header className="flex items-start justify-between gap-4 border-b border-rose-100 px-4 py-4 dark:border-rose-900/40">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {group.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          SLA #{group.feedbackSlaId || '—'}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/30">
                        {group.events.length} vi phạm
                      </span>
                    </header>

                    <div className="divide-y divide-rose-100 dark:divide-rose-900/40">
                      {group.events.map((event, eventIndex) => {
                        const EventIcon = event.Icon;

                        return (
                          <article
                            key={`${group.key}-${event.type || eventIndex}-${event.breachedAt || eventIndex}`}
                            className="flex items-start gap-3 px-4 py-4"
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/40">
                              <EventIcon size={17} aria-hidden="true" />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {event.label}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {event.shortLabel} · {formatDateTime(event.breachedAt)}
                                  </p>
                                </div>

                                <strong className="text-sm font-semibold tabular-nums text-rose-700">
                                  Quá hạn {formatDuration(event.overdueMinutes)}
                                </strong>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyList text="7 ngày gần đây chưa có sự kiện vi phạm SLA." />
            )}
          </section>
        </article>
      </section>

      <aside className="admin-info-note p-5" aria-label="Gợi ý phân tích SLA">
        <header className="flex items-start gap-3">
          <Lucide.Lightbulb className="mt-0.5 shrink-0 text-blue-700" size={19} aria-hidden="true" />
          <span>
            <h2 className="text-sm font-semibold text-slate-950">Cách sử dụng dashboard</h2>
            <p className="mt-1 text-sm leading-6">
              Ưu tiên SLA đang chạy gần đến hạn. Một SLA có thể có nhiều sự kiện vi phạm nếu breach cả Response SLA và Resolution SLA; các sự kiện được gom chung theo SLA để tránh hiển thị như bản ghi bị trùng.
            </p>
          </span>
        </header>
      </aside>
    </article>
  );
};