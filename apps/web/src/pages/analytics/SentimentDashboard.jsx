import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { analyticsApi } from '../../services/api/analyticsApi';
import { SentimentDonutChart } from '../../components/charts/CustomCharts';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';

const CACHE_KEY = 'urbanmind:manager-sentiment:v1';
const CACHE_TTL_MS = 60_000;

const EMPTY_STATS = {
  sentimentTrend: { Positive: 0, Neutral: 0, Negative: 0 },
  totalAnalyzed: 0,
  positiveRate: 0,
  neutralRate: 0,
  negativeRate: 0,
  dominantSentiment: 'Chưa đủ dữ liệu',
  aiStatus: 'Chưa xác định',
};

const normalizeStats = (value) => ({
  ...EMPTY_STATS,
  ...(value && typeof value === 'object' ? value : {}),
  sentimentTrend: {
    ...EMPTY_STATS.sentimentTrend,
    ...(value?.sentimentTrend && typeof value.sentimentTrend === 'object' ? value.sentimentTrend : {}),
  },
});

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Cache is optional; analytics must still work when storage is unavailable.
  }
};

export const SentimentDashboard = () => {
  const cached = useMemo(() => readCache(), []);
  const [stats, setStats] = useState(() => normalizeStats(cached?.data));
  const [loading, setLoading] = useState(() => !cached?.data);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cacheIsFresh = cached?.savedAt && (Date.now() - cached.savedAt) < CACHE_TTL_MS;
    if (cacheIsFresh) return undefined;

    const fetchStats = async () => {
      if (cached?.data) setRefreshing(true);
      try {
        const response = await analyticsApi.getManagerSentimentStats();
        if (cancelled) return;
        const nextStats = normalizeStats(response);
        setStats(nextStats);
        writeCache(nextStats);
      } catch (err) {
        console.error(err);
        if (!cancelled && !cached?.data) setStats(EMPTY_STATS);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [cached]);

  const positive = Number(stats.sentimentTrend.Positive || 0);
  const neutral = Number(stats.sentimentTrend.Neutral || 0);
  const negative = Number(stats.sentimentTrend.Negative || 0);
  const totalSentiment = positive + neutral + negative;

  const signalCards = useMemo(() => {
    const cards = [];

    if (negative > 0) {
      cards.push({
        icon: Lucide.ShieldAlert,
        tone: 'bg-rose-50 text-rose-700',
        title: negative >= positive ? 'Ưu tiên phản hồi tiêu cực' : 'Theo dõi phản hồi tiêu cực',
        description: `${negative} phản hồi tiêu cực, chiếm ${stats.negativeRate}% dữ liệu đã được AI phân tích.`,
      });
    }

    if (positive > 0) {
      cards.push({
        icon: Lucide.ThumbsUp,
        tone: 'bg-emerald-50 text-emerald-700',
        title: 'Duy trì tín hiệu tích cực',
        description: `${positive} phản hồi tích cực, chiếm ${stats.positiveRate}% tổng phản hồi đã phân loại cảm xúc.`,
      });
    }

    if (neutral > 0) {
      cards.push({
        icon: Lucide.ScanSearch,
        tone: 'bg-amber-50 text-amber-700',
        title: 'Kiểm tra phản hồi trung tính',
        description: `${neutral} phản hồi trung tính cần được đọc cùng nội dung và lịch sử tương tác để hiểu đúng ngữ cảnh.`,
      });
    }

    if (cards.length === 0) {
      cards.push({
        icon: Lucide.DatabaseZap,
        tone: 'bg-blue-50 text-blue-700',
        title: 'Chưa có dữ liệu cảm xúc',
        description: 'Chưa có phản hồi AI-reviewed đủ điều kiện để tổng hợp phân bố cảm xúc.',
      });
    }

    return cards;
  }, [negative, neutral, positive, stats.negativeRate, stats.positiveRate]);

  if (loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải phân tích cảm xúc">
        <ManagerPageHeader
          title="Cảm xúc người dân"
          description="Theo dõi sắc thái trong các phản ánh đã được AI phân tích để nhận biết tín hiệu cần ưu tiên."
          icon={Lucide.BrainCircuit}
          statusLabel="Trạng thái dữ liệu"
          statusValue="Đang tải"
          statusTone="warning"
        />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <article key={index} className="admin-stat-card h-36 animate-pulse" />)}
        </section>
        <section className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <article className="admin-panel flex min-h-96 items-center justify-center">
            <span className="h-44 w-44 animate-pulse rounded-full border-[22px] border-slate-100" aria-hidden="true" />
          </article>
          <article className="admin-panel min-h-96 animate-pulse" />
        </section>
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Cảm xúc người dân"
        description="Theo dõi sắc thái trong các phản ánh đã được AI phân tích để nhận biết tín hiệu cần ưu tiên."
        icon={Lucide.BrainCircuit}
        statusLabel="Xu hướng nổi bật"
        statusValue={stats.dominantSentiment}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số cảm xúc tổng quan">
        <ManagerMetricCard
          label="Đã phân tích"
          value={stats.totalAnalyzed}
          description="Phản ánh có kết quả phân loại cảm xúc từ AI."
          icon={Lucide.ScanText}
          toneClass="bg-blue-50 text-blue-700"
        />
        <ManagerMetricCard
          label="Tích cực"
          value={positive}
          description={`${stats.positiveRate}% phản ánh đã phân tích.`}
          icon={Lucide.SmilePlus}
          toneClass="bg-emerald-50 text-emerald-700"
        />
        <ManagerMetricCard
          label="Trung tính"
          value={neutral}
          description={`${stats.neutralRate}% phản ánh đã phân tích.`}
          icon={Lucide.Meh}
          toneClass="bg-amber-50 text-amber-700"
        />
        <ManagerMetricCard
          label="Tiêu cực"
          value={negative}
          description={`${stats.negativeRate}% phản ánh đã phân tích.`}
          icon={Lucide.Frown}
          toneClass="bg-rose-50 text-rose-700"
        />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <figure className="admin-panel overflow-hidden">
          <ManagerSectionHeader
            title="Phân bố cảm xúc"
            description="Tỷ trọng tích cực, trung tính và tiêu cực trong các phản ánh đã được AI phân tích."
            icon={Lucide.ChartPie}
          />
          <section className="p-5 sm:p-6">
            <SentimentDonutChart positive={positive} neutral={neutral} negative={negative} />
          </section>
          <figcaption className="border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:px-6">
            Tổng cộng <strong className="font-semibold text-slate-950">{totalSentiment}</strong> phản ánh đã được phân loại cảm xúc.
          </figcaption>
        </figure>

        <article className="admin-panel overflow-hidden">
          <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <span className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" aria-hidden="true">
                <Lucide.Lightbulb size={19} />
              </span>
              <span className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950">Tín hiệu cần chú ý</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Các tín hiệu được rút trực tiếp từ phân bố cảm xúc hiện tại.</p>
              </span>
            </span>
            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>{stats.aiStatus}</span>
              {refreshing ? <span className="font-normal text-emerald-700">· đang cập nhật</span> : null}
            </span>
          </header>
          <ol className="space-y-3 p-5 sm:p-6">
            {signalCards.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="admin-inset-panel flex gap-3 p-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`} aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <article>
                    <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </article>
                </li>
              );
            })}
          </ol>
        </article>
      </section>

      <aside className="admin-info-note p-5" aria-label="Lưu ý về phân tích cảm xúc">
        <header className="flex items-start gap-3">
          <Lucide.Info className="mt-0.5 shrink-0 text-blue-700" size={19} aria-hidden="true" />
          <span>
            <h2 className="text-sm font-semibold text-slate-950">Lưu ý khi đánh giá</h2>
            <p className="mt-1 text-sm leading-6">Kết quả cảm xúc là tín hiệu hỗ trợ. Khi cần ra quyết định, nên đối chiếu thêm nội dung phản ánh, lịch sử tương tác và kết quả xử lý.</p>
          </span>
        </header>
      </aside>
    </article>
  );
};
