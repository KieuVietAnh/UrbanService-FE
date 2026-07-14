import { useId } from 'react';

// src/components/charts/CustomCharts.jsx


// 1. Sentiment Donut Chart Component
export const SentimentDonutChart = ({ positive = 45, neutral = 35, negative = 20 }) => {
  const total = positive + neutral + negative;
  const posPct = total > 0 ? Math.round((positive / total) * 100) : 0;
  const neuPct = total > 0 ? Math.round((neutral / total) * 100) : 0;
  const negPct = total > 0 ? Math.round((negative / total) * 100) : 0;

  // Circle parameters for Donut
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke offsets
  const neuDash = (neuPct / 100) * circumference;
  const negDash = (negPct / 100) * circumference;
  const posDash = (posPct / 100) * circumference;

  // Cumulative offsets
  const posStrokeOffset = 0;
  const neuStrokeOffset = posDash;
  const negStrokeOffset = posDash + neuDash;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-base-100 rounded-2xl border border-base-300">
      <h4 className="text-sm font-bold mb-4 text-center">Chỉ Số Cảm Xúc Cư Dân (AI)</h4>
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle cx="60" cy="60" r={radius} fill="transparent" stroke="var(--fallback-b3, #e5e7eb)" strokeWidth="12" />
          
          {/* Positive segment */}
          {posPct > 0 && (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#10b981" // Emerald-500
              strokeWidth="12"
              strokeDasharray={`${posDash} ${circumference - posDash}`}
              strokeDashoffset={-posStrokeOffset}
              className="transition-all duration-1000 ease-out"
            />
          )}
          
          {/* Neutral segment */}
          {neuPct > 0 && (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#f59e0b" // Amber-500
              strokeWidth="12"
              strokeDasharray={`${neuDash} ${circumference - neuDash}`}
              strokeDashoffset={-neuStrokeOffset}
              className="transition-all duration-1000 ease-out"
            />
          )}
          
          {/* Negative segment */}
          {negPct > 0 && (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#ef4444" // Red-500
              strokeWidth="12"
              strokeDasharray={`${negDash} ${circumference - negDash}`}
              strokeDashoffset={-negStrokeOffset}
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-emerald-500">{posPct}%</span>
          <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500">Tích cực</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-6 text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Tích cực: {positive}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span>Trung tính: {neutral}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>Tiêu cực: {negative}</span>
        </div>
      </div>
    </div>
  );
};

// 2. SLA Performance Line Chart
const DEFAULT_SLA_TREND = [
  { label: 'T12', value: 75 },
  { label: 'T1', value: 82 },
  { label: 'T2', value: 80 },
  { label: 'T3', value: 88 },
  { label: 'T4', value: 92 },
  { label: 'T5', value: 95 },
];

export const SLAPerformanceChart = ({ data = DEFAULT_SLA_TREND }) => {
  const gradientId = useId().replace(/:/g, '');
  const series = Array.isArray(data) && data.length > 1
    ? data.map((item, index) => ({
      label: typeof item === 'number' ? `Kỳ ${index + 1}` : item.label,
      value: Number(typeof item === 'number' ? item : item.value) || 0,
    }))
    : DEFAULT_SLA_TREND;

  const width = 640;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 42, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = series.map((item, index) => ({
    ...item,
    x: padding.left + (index / (series.length - 1)) * chartWidth,
    y: padding.top + chartHeight - (Math.min(100, Math.max(0, item.value)) / 100) * chartHeight,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points.at(-1).x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
  const firstValue = points[0]?.value || 0;
  const latestValue = points.at(-1)?.value || 0;
  const delta = latestValue - firstValue;

  return (
    <section className="manager-chart" aria-label="Xu hướng tỷ lệ đạt SLA theo thời gian">
      <header className="manager-chart-summary">
        <span>
          <small>Tỷ lệ kỳ gần nhất</small>
          <strong>{latestValue}%</strong>
        </span>
        <span className={delta >= 0 ? 'manager-chart-trend is-positive' : 'manager-chart-trend is-negative'}>
          {delta >= 0 ? 'Tăng' : 'Giảm'} {Math.abs(delta)} điểm so với kỳ đầu
        </span>
      </header>

      <svg viewBox={`0 0 ${width} ${height}`} className="manager-line-chart" role="img" aria-labelledby={`${gradientId}-title ${gradientId}-desc`}>
        <title id={`${gradientId}-title`}>Biểu đồ xu hướng SLA</title>
        <desc id={`${gradientId}-desc`}>Tỷ lệ đạt SLA tăng từ {firstValue}% lên {latestValue}% trong {series.length} kỳ.</desc>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding.top + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="manager-chart-grid" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" className="manager-chart-axis-label">{tick}%</text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} className="manager-chart-area" />
        <path d={linePath} className="manager-chart-line" />

        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="8" className="manager-chart-point-halo" />
            <circle cx={point.x} cy={point.y} r="4.5" className="manager-chart-point" />
            <text x={point.x} y={height - 14} textAnchor="middle" className="manager-chart-axis-label">{point.label}</text>
            <title>{point.label}: {point.value}%</title>
          </g>
        ))}
      </svg>
    </section>
  );
};

// 3. Category Volume Bar Chart
export const CategoryVolumeBarChart = ({ data = [] }) => {
  const source = data.length > 0 ? data : [
    { categoryName: 'Vệ sinh', count: 18 },
    { categoryName: 'Điện chiếu sáng', count: 12 },
    { categoryName: 'Cấp thoát nước', count: 15 },
    { categoryName: 'Đường sá', count: 9 },
    { categoryName: 'Cây xanh', count: 6 },
  ];
  const categories = source.map((item, index) => ({
    name: item.categoryName || item.name || `Danh mục ${index + 1}`,
    count: Number(item.count ?? item.value ?? item.total ?? 0),
  }));
  const maxCount = Math.max(...categories.map((category) => category.count), 1);
  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <section className="manager-chart" aria-label="Khối lượng phản ánh theo danh mục dịch vụ">
      <header className="manager-chart-summary">
        <span>
          <small>Tổng khối lượng</small>
          <strong>{total}</strong>
        </span>
        <span className="manager-chart-muted">So sánh tương đối giữa các nhóm dịch vụ</span>
      </header>

      <ol className="manager-category-bars">
        {categories.map((category) => {
          const percentage = Math.round((category.count / maxCount) * 100);
          return (
            <li key={category.name}>
              <header>
                <span>{category.name}</span>
                <strong>{category.count}</strong>
              </header>
              <div className="manager-category-track" role="img" aria-label={`${category.name}: ${category.count} phản ánh`}>
                <span style={{ width: `${percentage}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
