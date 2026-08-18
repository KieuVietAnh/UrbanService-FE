import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { slaApi } from '../../services/api/slaApi';
import { feedbackDashboardApi } from '@urbanmind/shared-api';
import { CategoryVolumeBarChart } from '../../components/charts/CustomCharts';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';

const EMPTY_OVERVIEW = {
  totalSla: 0,
  runningSla: 0,
  completedSla: 0,
  breachedSla: 0,
  warningSla: 0,
  successRate: 0,
  averageResolutionMinutes: 0,
};

const normalizeOverview = (value) => ({
  totalSla: Number(value?.totalSla) || 0,
  runningSla: Number(value?.runningSla) || 0,
  completedSla: Number(value?.completedSla) || 0,
  breachedSla: Number(value?.breachedSla) || 0,
  warningSla: Number(value?.warningSla) || 0,
  successRate: Number(value?.successRate) || 0,
  averageResolutionMinutes: Number(value?.averageResolutionMinutes) || 0,
});

const formatDuration = (minutes) => {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  if (safeMinutes < 60) return `${Math.round(safeMinutes)} phút`;

  const hours = safeMinutes / 60;
  return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} giờ`;
};

const SlaComposition = ({ overview }) => {
  const total = Math.max(overview.totalSla, 1);
  const items = [
    {
      key: 'running',
      label: 'Đang chạy',
      value: overview.runningSla,
      barClass: 'bg-blue-500',
      iconClass: 'bg-blue-50 text-blue-700',
      Icon: Lucide.TimerReset,
    },
    {
      key: 'completed',
      label: 'Đã hoàn thành',
      value: overview.completedSla,
      barClass: 'bg-emerald-500',
      iconClass: 'bg-emerald-50 text-emerald-700',
      Icon: Lucide.CircleCheckBig,
    },
    {
      key: 'warning',
      label: 'Đang cảnh báo',
      value: overview.warningSla,
      barClass: 'bg-amber-500',
      iconClass: 'bg-amber-50 text-amber-700',
      Icon: Lucide.ClockAlert,
    },
    {
      key: 'breached',
      label: 'Đã vi phạm',
      value: overview.breachedSla,
      barClass: 'bg-rose-500',
      iconClass: 'bg-rose-50 text-rose-700',
      Icon: Lucide.TriangleAlert,
    },
  ];

  return (
    <ol className="space-y-4" aria-label="Cơ cấu trạng thái SLA">
      {items.map(({ key, label, value, barClass, iconClass, Icon }) => {
        const percentage = overview.totalSla > 0
          ? Math.min(100, Math.round((value / total) * 100))
          : 0;

        return (
          <li key={key} className="admin-inset-panel p-4">
            <header className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{percentage}% tổng SLA</span>
                </span>
              </span>
              <strong className="shrink-0 text-lg font-semibold tabular-nums text-slate-950">{value}</strong>
            </header>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${value}, chiếm ${percentage}% tổng SLA`}>
              <span className={`block h-full rounded-full transition-[width] duration-500 ${barClass}`} style={{ width: `${percentage}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export const SLAAnalytics = () => {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchStats = async () => {
      setLoading(true);
      setError('');

      try {
        const [overviewResult, categoriesResult] = await Promise.allSettled([
          slaApi.getDashboardOverview(),
          feedbackDashboardApi.getCategoryDistribution(),
        ]);

        if (!active) return;

        if (overviewResult.status === 'fulfilled') {
          setOverview(normalizeOverview(overviewResult.value));
        } else {
          setOverview(EMPTY_OVERVIEW);
          setError('Không thể tải dữ liệu SLA tổng quan. Vui lòng thử lại sau.');
        }

        setCategoryDistribution(
          categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)
            ? categoriesResult.value
            : []
        );
      } catch (err) {
        if (!active) return;
        console.error(err);
        setOverview(EMPTY_OVERVIEW);
        setCategoryDistribution([]);
        setError('Không thể tải dữ liệu phân tích SLA. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchStats();

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

  const successRate = Math.max(0, Math.min(100, Math.round(overview.successRate)));

  if (loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải phân tích SLA">
        <header className="admin-page-hero h-44 animate-pulse" />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <article key={index} className="admin-stat-card h-28 animate-pulse" />)}
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="admin-panel h-96 animate-pulse" />
          <article className="admin-panel h-96 animate-pulse" />
        </section>
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Chỉ số SLA dịch vụ"
        description="Theo dõi SLA đang chạy, cảnh báo, vi phạm và thời gian xử lý từ dữ liệu vận hành thực tế."
        icon={Lucide.TimerReset}
        statusLabel="Sức khỏe SLA"
        statusValue={healthLabel}
      />

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số SLA tổng quan">
        <ManagerMetricCard
          label="Tỷ lệ đạt SLA"
          value={`${successRate}%`}
          description={`${overview.completedSla} SLA đã hoàn thành.`}
          icon={Lucide.CircleCheckBig}
          toneClass="bg-blue-50 text-blue-700"
        />
        <ManagerMetricCard
          label="Vi phạm SLA"
          value={overview.breachedSla}
          description="SLA đã vượt thời hạn cam kết."
          icon={Lucide.TriangleAlert}
          toneClass="bg-rose-50 text-rose-700"
        />
        <ManagerMetricCard
          label="Thời gian xử lý TB"
          value={formatDuration(overview.averageResolutionMinutes)}
          description="Thời gian xử lý trung bình từ SLA Dashboard."
          icon={Lucide.Clock3}
          toneClass="bg-amber-50 text-amber-700"
        />
        <ManagerMetricCard
          label="Tổng SLA"
          value={overview.totalSla}
          description={`${overview.runningSla} đang chạy · ${overview.warningSla} cảnh báo.`}
          icon={Lucide.Files}
          toneClass="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <figure className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Cơ cấu trạng thái SLA"
            description="Phân bổ SLA hiện tại theo trạng thái vận hành thực tế."
            icon={Lucide.ChartNoAxesCombined}
          />
          <section className="p-5 sm:p-6">
            {overview.totalSla > 0 ? (
              <SlaComposition overview={overview} />
            ) : (
              <section className="admin-empty-panel p-8 text-center text-sm text-slate-500">
                Chưa có dữ liệu SLA để phân tích.
              </section>
            )}
          </section>
        </figure>

        <figure className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Khối lượng theo dịch vụ"
            description="So sánh số lượng phản ánh giữa các danh mục để nhận biết nhóm có khối lượng lớn."
            icon={Lucide.ChartColumnBig}
          />
          <section className="p-5 sm:p-6">
            {categoryDistribution.length > 0 ? (
              <CategoryVolumeBarChart data={categoryDistribution} />
            ) : (
              <section className="admin-empty-panel p-8 text-center text-sm text-slate-500">
                Chưa có dữ liệu phân bố danh mục.
              </section>
            )}
          </section>
        </figure>
      </section>

      <aside className="admin-info-note p-5" aria-label="Gợi ý phân tích SLA">
        <header className="flex items-start gap-3">
          <Lucide.Lightbulb className="mt-0.5 shrink-0 text-blue-700" size={19} aria-hidden="true" />
          <span>
            <h2 className="text-sm font-semibold text-slate-950">Cách sử dụng chỉ số</h2>
            <p className="mt-1 text-sm leading-6">
              Ưu tiên kiểm tra các SLA đang cảnh báo hoặc đã vi phạm, sau đó đối chiếu với nhóm dịch vụ có khối lượng phản ánh cao để điều chỉnh nguồn lực.
            </p>
          </span>
        </header>
      </aside>
    </article>
  );
};
