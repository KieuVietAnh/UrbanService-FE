import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi } from '../../services/api/analyticsApi';
import { normalizeRole } from '../../utils/roleMap';
import { SentimentDonutChart } from '../../components/charts/CustomCharts';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';

const EMPTY_STATS = {
  csatScore: 0,
  avgResolutionTimeHours: 0,
  sentimentTrend: {
    Positive: 0,
    Neutral: 0,
    Negative: 0,
  },
};

export const SentimentDashboard = () => {
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
          sentimentTrend: {
            ...EMPTY_STATS.sentimentTrend,
            ...(response?.sentimentTrend && typeof response.sentimentTrend === 'object' ? response.sentimentTrend : {}),
          },
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

  const totalSentiment = useMemo(() => (
    Number(stats.sentimentTrend.Positive || 0) +
    Number(stats.sentimentTrend.Neutral || 0) +
    Number(stats.sentimentTrend.Negative || 0)
  ), [stats.sentimentTrend]);

  const dominantSentiment = useMemo(() => {
    const entries = Object.entries(stats.sentimentTrend);
    if (entries.length === 0 || totalSentiment === 0) return 'Chưa đủ dữ liệu';
    const [key] = entries.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0];
    return ({ Positive: 'Tích cực', Neutral: 'Trung tính', Negative: 'Tiêu cực' })[key] || key;
  }, [stats.sentimentTrend, totalSentiment]);

  if (loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải phân tích cảm xúc">
        <header className="admin-page-hero h-44 animate-pulse" />
        <section className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <article key={index} className="admin-stat-card h-28 animate-pulse" />)}
        </section>
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="admin-panel h-96 animate-pulse" />
          <article className="admin-panel h-96 animate-pulse" />
        </section>
      </article>
    );
  }

  const positive = Number(stats.sentimentTrend.Positive || 0);
  const neutral = Number(stats.sentimentTrend.Neutral || 0);
  const negative = Number(stats.sentimentTrend.Negative || 0);

  return (
    <article className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Cảm xúc và nhận thức người dân"
        description="Phân tích phản hồi để đo mức độ hài lòng và ưu tiên cải thiện dịch vụ."
        icon={Lucide.BrainCircuit}
        statusLabel="Xu hướng nổi bật"
        statusValue={dominantSentiment}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số cảm xúc tổng quan">
        <ManagerMetricCard label="CSAT trung bình" value={`${stats.csatScore}/5`} description="Điểm hài lòng sau xử lý." icon={Lucide.Star} toneClass="bg-blue-50 text-blue-700" />
        <ManagerMetricCard label="Phản hồi tích cực" value={positive} description="Tín hiệu hài lòng từ nội dung phản ánh." icon={Lucide.SmilePlus} toneClass="bg-emerald-50 text-emerald-700" />
        <ManagerMetricCard label="Phản hồi trung tính" value={neutral} description="Nội dung mô tả chưa thể hiện cảm xúc rõ." icon={Lucide.Meh} toneClass="bg-amber-50 text-amber-700" />
        <ManagerMetricCard label="Phản hồi tiêu cực" value={negative} description="Trường hợp cần ưu tiên theo dõi trải nghiệm." icon={Lucide.Frown} toneClass="bg-rose-50 text-rose-700" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
        <figure className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Phân bố cảm xúc"
            description="Tỷ trọng sắc thái được hệ thống tổng hợp từ dữ liệu phản hồi."
            icon={Lucide.ChartPie}
          />
          <section className="p-5 sm:p-6">
            <SentimentDonutChart positive={positive} neutral={neutral} negative={negative} />
          </section>
          <figcaption className="border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
            Tổng dữ liệu cảm xúc hiện có: {totalSentiment} phản hồi được phân loại.
          </figcaption>
        </figure>

        <article className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Nhận định và cơ hội cải thiện"
            description="Các điểm Manager nên xem xét khi đánh giá trải nghiệm dịch vụ."
            icon={Lucide.Lightbulb}
          />
          <ol className="space-y-3 p-5 sm:p-6">
            <li className="admin-inset-panel flex gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700" aria-hidden="true"><Lucide.ThumbsUp size={17} /></span>
              <article>
                <h3 className="text-sm font-semibold text-slate-950">Duy trì trải nghiệm tích cực</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Đối chiếu nhóm phản hồi tích cực với thời gian xử lý và chất lượng phản hồi để xác định quy trình nên được nhân rộng.</p>
              </article>
            </li>
            <li className="admin-inset-panel flex gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700" aria-hidden="true"><Lucide.ScanSearch size={17} /></span>
              <article>
                <h3 className="text-sm font-semibold text-slate-950">Làm rõ phản hồi trung tính</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Phản hồi trung tính có thể là dấu hiệu người dân chưa nhận đủ thông tin; cần kiểm tra chất lượng cập nhật trạng thái và thông báo.</p>
              </article>
            </li>
            <li className="admin-inset-panel flex gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700" aria-hidden="true"><Lucide.ShieldAlert size={17} /></span>
              <article>
                <h3 className="text-sm font-semibold text-slate-950">Ưu tiên tín hiệu tiêu cực</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Kết hợp phản hồi tiêu cực với hồ sơ trễ SLA, yêu cầu làm lại và khu vực tập trung sự cố để xác định nguyên nhân gốc.</p>
              </article>
            </li>
          </ol>
        </article>
      </section>

      <aside className="admin-info-note p-5" aria-label="Ghi chú về dữ liệu cảm xúc">
        <header className="flex items-start gap-3">
          <Lucide.Info className="mt-0.5 shrink-0 text-blue-700" size={19} aria-hidden="true" />
          <span>
            <h2 className="text-sm font-semibold text-slate-950">Lưu ý khi ra quyết định</h2>
            <p className="mt-1 text-sm leading-6">Phân tích cảm xúc là tín hiệu hỗ trợ, không thay thế việc đọc nội dung phản ánh, lịch sử tương tác và kết quả xử lý thực tế.</p>
          </span>
        </header>
      </aside>
    </article>
  );
};
