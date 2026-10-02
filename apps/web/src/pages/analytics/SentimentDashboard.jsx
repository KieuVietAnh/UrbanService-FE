import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managerSatisfactionApi } from '../../services/api/managerSatisfactionApi';
import {
  ManagerEmptyState,
  ManagerListRefreshIndicator,
  ManagerMetricCard,
  ManagerPageHeader,
  ManagerSectionHeader,
  ManagerSelectMenu,
} from '../../components/manager/ManagerPageElements';

const CACHE_KEY = 'urbanmind:manager-satisfaction:v1';
const CACHE_TTL_MS = 60_000;
const EMPTY_ITEMS = [];

const TIME_OPTIONS = [
  { value: '7d', label: '7 ngày gần đây' },
  { value: '30d', label: '30 ngày gần đây' },
  { value: '90d', label: '90 ngày gần đây' },
  { value: 'all', label: 'Toàn bộ dữ liệu' },
];

const STAR_LEVELS = [5, 4, 3, 2, 1];

const readCache = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (!parsed?.savedAt || !Array.isArray(parsed?.data?.items)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Cache is optional.
  }
};

const getReviewDate = (review) => {
  const raw = review?.createdAt ?? review?.reviewedAt ?? review?.submittedAt ?? null;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchesRange = (review, range, now) => {
  if (!range || range === 'all') return true;

  const days = Number(String(range).replace('d', ''));
  if (!Number.isFinite(days) || days <= 0) return true;

  const reviewDate = getReviewDate(review);
  if (!reviewDate) return false;

  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - days);
  return reviewDate >= threshold && reviewDate <= now;
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa rõ thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian';

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getRatingTone = (rating) => {
  if (rating >= 4) return 'text-emerald-700';
  if (rating === 3) return 'text-amber-700';
  return 'text-rose-700';
};

const formatTrendLabel = (firstDate, lastDate) => {
  const formatPart = (date, includeYear = false) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return includeYear ? `${day}/${month}/${date.getFullYear()}` : `${day}/${month}`;
  };

  if (firstDate.toDateString() === lastDate.toDateString()) {
    return formatPart(firstDate);
  }

  const sameMonth = firstDate.getMonth() === lastDate.getMonth();
  const sameYear = firstDate.getFullYear() === lastDate.getFullYear();

  if (sameMonth && sameYear) {
    return `${String(firstDate.getDate()).padStart(2, '0')}–${formatPart(lastDate)}`;
  }

  if (sameYear) {
    return `${formatPart(firstDate)}–${formatPart(lastDate)}`;
  }

  return `${formatPart(firstDate, true)}–${formatPart(lastDate, true)}`;
};

const buildTrend = (reviews, range, now = new Date()) => {
  const datedReviews = reviews
    .map((review) => ({ review, date: getReviewDate(review) }))
    .filter((entry) => entry.date)
    .sort((left, right) => left.date - right.date);

  if (datedReviews.length === 0) return [];

  const explicitDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
  const bucketCount = range === '7d' ? 7 : 6;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (explicitDays) {
    start.setDate(start.getDate() - explicitDays + 1);
  } else {
    start.setTime(datedReviews[0].date.getTime());
    start.setHours(0, 0, 0, 0);
  }

  const spanDays = Math.max(
    1,
    Math.ceil((now.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  const bucketDays = Math.max(1, Math.ceil(spanDays / bucketCount));

  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index * bucketDays);

    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + bucketDays);

    const bucketReviews = datedReviews.filter(
      (entry) => entry.date >= bucketStart && entry.date < bucketEnd,
    );

    if (bucketReviews.length === 0) return null;

    const ratings = bucketReviews
      .map((entry) => Number(entry.review?.rating))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

    if (ratings.length === 0) return null;

    const average = ratings.reduce((total, value) => total + value, 0) / ratings.length;
    const firstDate = bucketReviews[0].date;
    const lastDate = bucketReviews[bucketReviews.length - 1].date;
    const label = formatTrendLabel(firstDate, lastDate);

    return {
      label,
      count: ratings.length,
      average,
      timestamp: firstDate.getTime(),
    };
  }).filter(Boolean);
};

const RatingStars = ({ rating }) => {
  const numericRating = Number(rating) || 0;

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${numericRating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Lucide.Star
          key={star}
          size={14}
          className={star <= numericRating ? 'fill-amber-400 text-amber-400' : 'text-slate-250'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
};

const RatingDistribution = ({ counts, total }) => (
  <div className="space-y-2 xl:flex xl:h-full xl:w-full xl:flex-col xl:justify-between xl:space-y-0">
    {STAR_LEVELS.map((rating) => {
      const count = counts[rating] || 0;
      const rate = total > 0 ? Math.round((count / total) * 100) : 0;

      return (
        <div key={rating}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              {rating}
              <Lucide.Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            </span>
            <span className="tabular-nums text-slate-500">{count} · {rate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${rate}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);

const SatisfactionTrend = ({ points }) => {
  const safePoints = Array.isArray(points)
    ? [...points]
        .filter((point) => point?.average != null)
        .sort((left, right) => (left?.timestamp || 0) - (right?.timestamp || 0))
    : [];

  if (safePoints.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Lucide.ChartNoAxesColumn size={21} aria-hidden="true" />
        </div>
        <p className="mt-3 text-base font-semibold text-slate-800">Chưa có dữ liệu đánh giá</p>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Chưa có đánh giá hợp lệ trong phạm vi thời gian đang xem.
        </p>
      </div>
    );
  }

  const width = 620;
  const height = 220;
  const padding = { top: 24, right: 18, bottom: 42, left: 38 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const slotWidth = chartWidth / Math.max(safePoints.length, 1);
  const barWidth = Math.max(16, Math.min(24, slotWidth * 0.26));
  const axisBottom = padding.top + chartHeight;

  const bars = safePoints.map((point, index) => {
    const average = Math.min(5, Math.max(1, Number(point.average) || 1));
    const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
    const barHeight = (average / 5) * chartHeight;
    const y = axisBottom - barHeight;

    return { ...point, average, x, y, barHeight };
  });

  return (
    <div className="min-w-0 w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="manager-line-chart block w-full"
        role="img"
        aria-label="Xu hướng điểm đánh giá trung bình theo thời gian"
      >
        <title>Xu hướng điểm đánh giá</title>
        <desc>
          Điểm trung bình được tính từ các đánh giá thực tế của người dân trong từng kỳ có dữ liệu.
        </desc>

        {[1, 2, 3, 4, 5].map((level) => {
          const y = axisBottom - (level / 5) * chartHeight;
          return (
            <g key={level}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                className="manager-chart-grid"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                className="manager-chart-axis-label"
              >
                {level}
              </text>
            </g>
          );
        })}

        <line
          x1={padding.left}
          y1={axisBottom}
          x2={width - padding.right}
          y2={axisBottom}
          className="manager-chart-grid"
        />

        {bars.map((point) => (
          <g key={`${point.timestamp}-${point.label}`}>
            <rect
              x={point.x}
              y={point.y}
              width={barWidth}
              height={point.barHeight}
              rx="3"
              fill="currentColor"
              className="transition-opacity duration-150 hover:opacity-80"
            >
              <title>{point.label}: {point.average.toFixed(1)}/5 · {point.count} đánh giá</title>
            </rect>

            <text
              x={point.x + barWidth / 2}
              y={Math.max(13, point.y - 8)}
              textAnchor="middle"
              className="manager-chart-axis-label"
              fontWeight="700"
            >
              {point.average.toFixed(1)}
            </text>

            <text
              x={point.x + barWidth / 2}
              y={height - 15}
              textAnchor="middle"
              className="manager-chart-axis-label"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const SentimentDashboard = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const cached = useMemo(() => readCache(), []);

  const [data, setData] = useState(() => cached?.data || null);
  const [loading, setLoading] = useState(() => !cached?.data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const range = searchParams.get('range') || '30d';
  const areaId = searchParams.get('area') || 'all';
  const categoryId = searchParams.get('category') || 'all';

  const updateFilter = useCallback((key, value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value === 'all' && key !== 'range') next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const fetchData = useCallback(async ({ background = false } = {}) => {
    const requestId = ++requestIdRef.current;

    if (background) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const response = await managerSatisfactionApi.getDashboardData();

      if (requestId !== requestIdRef.current) return;

      setData(response);
      writeCache(response);

      if (response?.failedIncidentCount > 0) {
        setError(
          `Không tải được đánh giá của ${response.failedIncidentCount} sự vụ. Các số liệu hiện tại chỉ phản ánh phần dữ liệu tải thành công.`,
        );
      }
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to load manager satisfaction dashboard', fetchError);
      setError('Không thể tải dữ liệu đánh giá của người dân.');
      if (!background) setData(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const fresh = cached?.savedAt && Date.now() - cached.savedAt < CACHE_TTL_MS;
    if (!fresh) void fetchData({ background: Boolean(cached?.data) });

    return () => {
      requestIdRef.current += 1;
    };
  }, [cached, fetchData]);

  const items = Array.isArray(data?.items) ? data.items : EMPTY_ITEMS;

  const areaOptions = useMemo(() => {
    const values = new Map();

    items.forEach((review) => {
      const incident = review?.incident || {};
      if (incident.areaId != null) {
        values.set(String(incident.areaId), incident.areaName || `Khu vực ${incident.areaId}`);
      }
    });

    return [
      { value: 'all', label: 'Tất cả khu vực' },
      ...Array.from(values, ([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label, 'vi')),
    ];
  }, [items]);

  const categoryOptions = useMemo(() => {
    const values = new Map();

    items.forEach((review) => {
      const incident = review?.incident || {};
      if (incident.categoryId != null) {
        values.set(String(incident.categoryId), incident.categoryName || `Danh mục ${incident.categoryId}`);
      }
    });

    return [
      { value: 'all', label: 'Tất cả danh mục' },
      ...Array.from(values, ([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label, 'vi')),
    ];
  }, [items]);

  const filteredReviews = useMemo(() => {
    const now = new Date();

    return items.filter((review) => {
      const incident = review?.incident || {};

      if (!matchesRange(review, range, now)) return false;
      if (areaId !== 'all' && String(incident.areaId) !== String(areaId)) return false;
      if (categoryId !== 'all' && String(incident.categoryId) !== String(categoryId)) return false;

      return true;
    });
  }, [areaId, categoryId, items, range]);

  const metrics = useMemo(() => {
    const validRatings = filteredReviews
      .map((review) => Number(review?.rating))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    validRatings.forEach((rating) => {
      counts[Math.round(rating)] += 1;
    });

    const averageRating = validRatings.length > 0
      ? validRatings.reduce((total, rating) => total + rating, 0) / validRatings.length
      : null;

    const satisfiedCount = filteredReviews.filter((review) => review?.isSatisfied === true).length;
    const satisfactionRate = filteredReviews.length > 0
      ? Math.round((satisfiedCount / filteredReviews.length) * 100)
      : 0;

    const lowReviews = filteredReviews
      .filter((review) => {
        const rating = Number(review?.rating);
        return review?.isSatisfied === false || (Number.isFinite(rating) && rating <= 2);
      })
      .sort((left, right) => {
        const leftRating = Number(left?.rating) || 0;
        const rightRating = Number(right?.rating) || 0;
        if (leftRating !== rightRating) return leftRating - rightRating;
        return (getReviewDate(right)?.getTime() || 0) - (getReviewDate(left)?.getTime() || 0);
      });

    return {
      total: filteredReviews.length,
      counts,
      averageRating,
      satisfiedCount,
      satisfactionRate,
      lowReviews,
      trend: buildTrend(filteredReviews, range),
    };
  }, [filteredReviews, range]);

  const returnPath = `${location.pathname}${location.search || ''}`;
  const averageLabel = metrics.averageRating == null ? 'Chưa có dữ liệu' : `${metrics.averageRating.toFixed(1)} / 5`;

  if (loading) {
    return (
      <article className="admin-page-shell space-y-5" aria-busy="true" aria-label="Đang tải mức độ hài lòng">
        <ManagerPageHeader
          title="Mức độ hài lòng của người dân"
          description="Theo dõi đánh giá thực tế sau khi kết quả xử lý được phê duyệt."
          icon={Lucide.Star}
          statusLabel="Trạng thái dữ liệu"
          statusValue="Đang tải"
          statusTone="warning"
        />
        <section className="admin-panel h-20 animate-pulse" />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="admin-stat-card h-36 animate-pulse" />
          ))}
        </section>
        <section className="grid gap-5 xl:grid-cols-2">
          <div className="admin-panel h-[390px] animate-pulse" />
          <div className="admin-panel h-[390px] animate-pulse" />
        </section>
      </article>
    );
  }

  if (!data && error) {
    return (
      <article className="admin-page-shell space-y-5">
        <ManagerPageHeader
          title="Mức độ hài lòng của người dân"
          description="Theo dõi đánh giá thực tế sau khi kết quả xử lý được phê duyệt."
          icon={Lucide.Star}
          statusLabel="Trạng thái dữ liệu"
          statusValue="Không thể tải"
          statusTone="danger"
        />
        <ManagerEmptyState
          icon={Lucide.CircleAlert}
          title="Chưa thể tải dữ liệu đánh giá"
          description={error}
          action={(
            <button
              type="button"
              onClick={() => void fetchData()}
              className="btn admin-primary-action h-10 rounded-xl px-4 text-sm font-semibold normal-case"
            >
              <Lucide.RefreshCw size={16} />
              Thử lại
            </button>
          )}
        />
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-5">
      <ManagerPageHeader
        title="Mức độ hài lòng của người dân"
        description="Tổng hợp số sao, mức độ hài lòng và nhận xét do người dân gửi sau khi xem kết quả xử lý."
        icon={Lucide.Star}
        statusLabel="Điểm trung bình"
        statusValue={averageLabel}
        statusTone={
          metrics.averageRating == null
            ? 'neutral'
            : metrics.averageRating >= 4
              ? 'success'
              : metrics.averageRating < 3
                ? 'danger'
                : 'warning'
        }
        actions={(
          <button
            type="button"
            onClick={() => void fetchData({ background: true })}
            disabled={refreshing}
            className="btn admin-secondary-action h-10 rounded-xl px-4 text-sm font-semibold normal-case"
          >
            <Lucide.RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Đang cập nhật' : 'Làm mới'}
          </button>
        )}
      />

      {error ? (
        <section className="admin-error-note flex items-center gap-3 p-4" role="alert">
          <Lucide.CircleAlert size={18} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </section>
      ) : null}

      <section className="admin-panel px-4 py-4 sm:px-5" aria-label="Bộ lọc mức độ hài lòng">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
            <ManagerSelectMenu
              value={range}
              onChange={(value) => updateFilter('range', value)}
              options={TIME_OPTIONS}
              ariaLabel="Lọc đánh giá theo thời gian"
            />
            <ManagerSelectMenu
              value={areaId}
              onChange={(value) => updateFilter('area', value)}
              options={areaOptions}
              ariaLabel="Lọc đánh giá theo khu vực"
            />
            <ManagerSelectMenu
              value={categoryId}
              onChange={(value) => updateFilter('category', value)}
              options={categoryOptions}
              ariaLabel="Lọc đánh giá theo danh mục"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
            <span className="text-xs font-medium text-slate-500">
              {items.length} đánh giá toàn hệ thống · {metrics.total} đánh giá trong phạm vi lọc · đã kiểm tra {data?.incidentCount ?? 0} sự vụ
            </span>
            <ManagerListRefreshIndicator visible={refreshing} label="Đang làm mới" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số hài lòng tổng quan">
        <ManagerMetricCard
          label="Điểm trung bình"
          value={metrics.averageRating == null ? '—' : metrics.averageRating.toFixed(1)}
          description={metrics.total > 0 ? `Tính trên ${metrics.total} đánh giá hợp lệ.` : 'Chưa có đánh giá trong phạm vi lọc.'}
          icon={Lucide.Star}
          toneClass="bg-amber-50 text-amber-700"
        />
        <ManagerMetricCard
          label="Tỷ lệ hài lòng"
          value={`${metrics.satisfactionRate}%`}
          description={`${metrics.satisfiedCount} / ${metrics.total} người dùng chọn hài lòng.`}
          icon={Lucide.ThumbsUp}
          toneClass="bg-emerald-50 text-emerald-700"
        />
        <ManagerMetricCard
          label="Tổng đánh giá"
          value={metrics.total}
          description="Đánh giá được gửi sau khi người dân xem kết quả xử lý."
          icon={Lucide.MessageSquareText}
          toneClass="bg-blue-50 text-blue-700"
        />
        <ManagerMetricCard
          label="Cần chú ý"
          value={metrics.lowReviews.length}
          description="Đánh giá 1–2 sao hoặc người dân chọn chưa hài lòng."
          icon={Lucide.TriangleAlert}
          toneClass="bg-rose-50 text-rose-700"
        />
      </section>

      {metrics.total === 0 ? (
        <ManagerEmptyState
          icon={Lucide.StarOff}
          title="Chưa có đánh giá trong phạm vi này"
          description="Chỉ những phản ánh đã có kết quả được phê duyệt và được người dân đánh giá mới xuất hiện tại đây."
        />
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          <article className="admin-panel overflow-hidden xl:flex xl:h-full xl:flex-col">
            <ManagerSectionHeader
              title="Phân bố số sao"
              description="Tỷ lệ đánh giá từ 1 đến 5 sao trong phạm vi đang xem."
              icon={Lucide.ChartNoAxesColumn}
            />
            <div className="px-5 py-4 sm:px-6 sm:py-5 xl:flex xl:flex-1">
              <RatingDistribution counts={metrics.counts} total={metrics.total} />
            </div>
          </article>

          <article className="admin-panel overflow-hidden xl:flex xl:h-full xl:flex-col">
            <ManagerSectionHeader
              title="Xu hướng đánh giá"
              description="Điểm trung bình theo từng kỳ có phát sinh đánh giá."
              icon={Lucide.ChartNoAxesCombined}
            />
            <div className="p-5 sm:p-6 xl:flex xl:flex-1 xl:items-center">
              <SatisfactionTrend points={metrics.trend} />
            </div>
          </article>
        </section>
      )}

      <section className="admin-panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
              <Lucide.MessageSquareWarning size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Đánh giá cần chú ý</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {metrics.lowReviews.length > 0
                  ? `Có ${metrics.lowReviews.length} đánh giá 1–2 sao hoặc được người dân đánh dấu chưa hài lòng.`
                  : 'Hiện chưa có đánh giá 1–2 sao hoặc phản hồi chưa hài lòng theo bộ lọc đang chọn.'}
              </p>
            </div>
          </div>
        </div>

        {metrics.lowReviews.length === 0 ? (
          <div className="px-5 py-8 sm:px-6 sm:py-10">
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/55 px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
                <Lucide.CircleCheckBig size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-[-0.01em] text-slate-900">
                Không có đánh giá thấp trong phạm vi này
              </h3>
              <p className="mt-2 max-w-xl text-sm font-normal leading-6 text-slate-500">
                Chưa ghi nhận đánh giá 1–2 sao hoặc phản hồi chưa hài lòng theo bộ lọc đang chọn.
              </p>
            </div>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {metrics.lowReviews.slice(0, 6).map((review, index) => {
              const incident = review?.incident || {};
              const rating = Number(review?.rating) || 0;
              const name = review?.userName || 'Người dân';

              return (
                <li key={review?.reviewId ?? `${incident.incidentId}-${index}`} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <RatingStars rating={rating} />
                        <span className={`text-xs font-bold ${getRatingTone(rating)}`}>
                          {rating}/5
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            review?.isSatisfied === true
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {review?.isSatisfied === true ? 'Hài lòng' : 'Chưa hài lòng'}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-sm font-semibold text-slate-950 sm:text-[15px]">
                        {incident.title || 'Sự vụ chưa có tiêu đề'}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                        {review?.comment?.trim() || 'Người dân không để lại nhận xét.'}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{name}</span>
                        <span>{incident.areaName || 'Chưa rõ khu vực'}</span>
                        <span>{incident.categoryName || 'Chưa rõ danh mục'}</span>
                        <span>{formatDateTime(review?.createdAt)}</span>
                      </div>
                    </div>

                    {incident.incidentId ? (
                      <Link
                        to={`/manager/incidents/${incident.incidentId}`}
                        state={{ from: returnPath }}
                        className="btn admin-secondary-action h-9 shrink-0 rounded-xl px-3 text-xs font-semibold normal-case"
                      >
                        Xem sự vụ
                        <Lucide.ArrowUpRight size={14} />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {metrics.lowReviews.length > 6 ? (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Đang hiển thị 6 đánh giá cần chú ý gần nhất theo mức điểm thấp. Hãy dùng bộ lọc phía trên để thu hẹp phạm vi khi cần.
          </div>
        ) : null}
      </section>

      <aside className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3.5 sm:px-5">
        <Lucide.Info className="mt-0.5 shrink-0 text-blue-700" size={17} />
        <p className="text-sm leading-6 text-slate-600">
          <strong className="font-semibold text-slate-950">Nguồn dữ liệu:</strong>{' '}
          trang này chỉ sử dụng đánh giá sau xử lý do người dân gửi gồm số sao, lựa chọn hài lòng và nhận xét.
          Dữ liệu phân tích cảm xúc AI của nội dung phản ánh không được dùng để tính các chỉ số tại đây.
        </p>
      </aside>
    </article>
  );
};

export default SentimentDashboard;
