import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi } from '../../services/api/analyticsApi';
import { normalizeRole } from '../../utils/roleMap';
import { SLAPerformanceChart, CategoryVolumeBarChart } from '../../components/charts/CustomCharts';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';

const EMPTY_STATS = {
  processingRate: 0,
  slaBreaches: 0,
  avgResolutionTimeHours: 0,
  totalTickets: 0,
  categoryDistribution: [],
};

export const SLAAnalytics = () => {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analyticsApi.getSystemDashboardStats(currentRole);
        setStats({
          ...EMPTY_STATS,
          ...(response && typeof response === 'object' ? response : {}),
          categoryDistribution: Array.isArray(response?.categoryDistribution) ? response.categoryDistribution : [],
        });
      } catch (err) {
        console.error(err);
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [currentRole]);

  const healthLabel = useMemo(() => {
    if (stats.slaBreaches === 0) return 'Ổn định';
    if (stats.processingRate >= 85) return 'Cần theo dõi';
    return 'Cần cải thiện';
  }, [stats.processingRate, stats.slaBreaches]);

  if (loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải phân tích SLA">
        <header className="admin-page-hero h-44 animate-pulse" />
        <section className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <article key={index} className="admin-stat-card h-28 animate-pulse" />)}
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
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
        description="Đánh giá tốc độ xử lý, tỷ lệ hoàn thành và các điểm nghẽn theo nhóm dịch vụ để xác định cơ hội cải thiện vận hành."
        icon={Lucide.TimerReset}
        statusLabel="Sức khỏe SLA"
        statusValue={healthLabel}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số SLA tổng quan">
        <ManagerMetricCard label="Tỷ lệ đóng hồ sơ" value={`${stats.processingRate}%`} description="Tỷ lệ phản ánh hoàn tất trên tổng tiếp nhận." icon={Lucide.CircleCheckBig} toneClass="bg-blue-50 text-blue-700" />
        <ManagerMetricCard label="Vi phạm SLA" value={stats.slaBreaches} description="Hồ sơ vượt thời hạn cam kết." icon={Lucide.TriangleAlert} toneClass="bg-rose-50 text-rose-700" />
        <ManagerMetricCard label="Thời gian trung bình" value={`${stats.avgResolutionTimeHours} giờ`} description="Thời gian thực tế để xử lý một phản ánh." icon={Lucide.Clock3} toneClass="bg-amber-50 text-amber-700" />
        <ManagerMetricCard label="Tổng phản ánh" value={stats.totalTickets || 0} description="Khối lượng dữ liệu đang dùng để phân tích." icon={Lucide.Files} toneClass="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <figure className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Hiệu suất theo thời gian"
            description="Quan sát xu hướng hoàn thành và phát hiện giai đoạn có nguy cơ trễ hạn."
            icon={Lucide.ChartNoAxesCombined}
          />
          <section className="p-5 sm:p-6">
            <SLAPerformanceChart />
          </section>
          <figcaption className="border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
            Dùng biểu đồ này để xác định thời điểm cần điều chỉnh nguồn lực hoặc quy trình phối hợp.
          </figcaption>
        </figure>

        <figure className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Khối lượng theo dịch vụ"
            description="So sánh số lượng phản ánh giữa các danh mục để ưu tiên cải tiến."
            icon={Lucide.ChartColumnBig}
          />
          <section className="p-5 sm:p-6">
            <CategoryVolumeBarChart data={stats.categoryDistribution} />
          </section>
          <figcaption className="border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
            Danh mục có khối lượng cao và tỷ lệ SLA thấp nên được đưa vào danh sách ưu tiên cải thiện dịch vụ.
          </figcaption>
        </figure>
      </section>

      <aside className="admin-info-note p-5" aria-label="Gợi ý phân tích SLA">
        <header className="flex items-start gap-3">
          <Lucide.Lightbulb className="mt-0.5 shrink-0 text-blue-700" size={19} aria-hidden="true" />
          <span>
            <h2 className="text-sm font-semibold text-slate-950">Cách sử dụng chỉ số</h2>
            <p className="mt-1 text-sm leading-6">Kết hợp tỷ lệ vi phạm, thời gian trung bình và khối lượng theo danh mục để xác định vấn đề do quá tải, phối hợp chậm hay quy trình chưa phù hợp.</p>
          </span>
        </header>
      </aside>
    </article>
  );
};
