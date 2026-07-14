import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { ManagerMetricCard, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';

const heatCenters = [
  { x: 300, y: 150, radius: 60, intensity: 0.8, name: 'Khu trung tâm Lê Lợi', issue: 'Ổ gà xuất hiện nhiều', category: 'roads' },
  { x: 500, y: 120, radius: 70, intensity: 0.7, name: 'Nguyễn Huệ', issue: 'Ứ đọng rác', category: 'waste' },
  { x: 180, y: 340, radius: 55, intensity: 0.9, name: 'Bùi Viện', issue: 'Mất điện chiếu sáng', category: 'lighting' },
  { x: 600, y: 380, radius: 80, intensity: 0.6, name: 'Nút giao Khánh Hội', issue: 'Cống ngập nước', category: 'water' },
  { x: 420, y: 220, radius: 50, intensity: 0.5, name: 'Ngã tư Hàm Nghi', issue: 'Sụt lún vỉa hè', category: 'roads' },
];

const categoryLabels = {
  roads: 'Đường sá & Giao thông',
  waste: 'Vệ sinh & Rác thải',
  lighting: 'Điện chiếu sáng',
  water: 'Cấp thoát nước',
};

export const HeatmapDashboard = () => {
  const [filterCategory, setFilterCategory] = useState('all');
  const width = 800;
  const height = 450;

  const filteredCenters = useMemo(() => (
    filterCategory === 'all'
      ? heatCenters
      : heatCenters.filter((center) => center.category === filterCategory)
  ), [filterCategory]);

  const sortedCenters = useMemo(
    () => [...filteredCenters].sort((a, b) => b.intensity - a.intensity),
    [filteredCenters],
  );

  const highestRisk = sortedCenters[0] || null;

  const averageIntensity = useMemo(() => {
    if (filteredCenters.length === 0) return 0;
    const total = filteredCenters.reduce((sum, center) => sum + center.intensity, 0);
    return Math.round((total / filteredCenters.length) * 100);
  }, [filteredCenters]);

  return (
    <article className="admin-page-shell space-y-5">
      <ManagerPageHeader
        title="Bản đồ nhiệt phản ánh đô thị"
        description="Khoanh vùng các cụm phản ánh để nhận diện điểm nóng và ưu tiên điều phối nguồn lực."
        icon={Lucide.MapPinned}
      />

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]" aria-label="Phân tích điểm nóng đô thị">
        <figure className="admin-panel self-start overflow-hidden">
          <ManagerSectionHeader
            title="Phân bố mật độ phản ánh"
            description="Vùng màu đậm thể hiện cụm phản ánh có cường độ cao hơn trong tập dữ liệu hiện tại."
            icon={Lucide.Map}
            actions={(
              <label className="flex w-full items-center gap-2 lg:w-auto" htmlFor="heatmap-category-filter">
                <span className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">Dịch vụ</span>
                <span className="relative block min-w-0 flex-1 lg:w-[220px]">
                  <select
                    id="heatmap-category-filter"
                    value={filterCategory}
                    onChange={(event) => setFilterCategory(event.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
                  >
                    <option value="all">Tất cả dịch vụ</option>
                    <option value="waste">Vệ sinh &amp; Rác thải</option>
                    <option value="lighting">Điện chiếu sáng</option>
                    <option value="water">Cấp thoát nước</option>
                    <option value="roads">Đường sá &amp; Giao thông</option>
                  </select>
                  <Lucide.ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                </span>
              </label>
            )}
          />
          <section className="p-4 sm:p-6">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full rounded-2xl bg-slate-950" role="img" aria-labelledby="heatmap-title heatmap-description">
              <title id="heatmap-title">Bản đồ nhiệt các cụm phản ánh đô thị</title>
              <desc id="heatmap-description">Biểu đồ không gian mô phỏng mật độ phản ánh theo các khu vực và danh mục dịch vụ.</desc>

              <path d="M 580 0 Q 640 180 520 300 T 700 450 L 800 450 L 800 0 Z" fill="#1e293b" opacity="0.4" />
              <rect x="80" y="80" width="160" height="120" rx="10" fill="#065f46" opacity="0.15" />
              <rect x="50" y="320" width="280" height="40" rx="8" fill="#065f46" opacity="0.15" />

              <g stroke="#ffffff" strokeOpacity="0.08" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="100" y1="200" x2="600" y2="200" />
                <line x1="500" y1="50" x2="500" y2="380" />
                <line x1="350" y1="280" x2="650" y2="280" />
                <path d="M 50 400 L 550 400 L 750 450" />
                <line x1="50" y1="360" x2="350" y2="260" />
              </g>

              <defs>
                <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
              </defs>

              {filteredCenters.map((center, index) => (
                <g key={`${center.name}-${index}`}>
                  <circle cx={center.x} cy={center.y} r={center.radius} fill="url(#heatGrad)" opacity={Math.max(0.55, center.intensity)} />
                  <circle cx={center.x} cy={center.y} r="5" fill="#ffffff" opacity="0.95" />
                </g>
              ))}

              <g transform="translate(20, 20)" className="text-[9px] font-bold fill-white">
                <rect width="150" height="70" rx="10" fill="#020617" opacity="0.84" stroke="#334155" />
                <circle cx="15" cy="18" r="6" fill="#ef4444" opacity="0.8" />
                <text x="28" y="21">Mật độ cao</text>
                <circle cx="15" cy="38" r="6" fill="#f97316" opacity="0.5" />
                <text x="28" y="41">Mật độ trung bình</text>
                <circle cx="15" cy="58" r="6" fill="#f97316" opacity="0.18" />
                <text x="28" y="61">Mật độ thấp</text>
              </g>
            </svg>
          </section>
          <figcaption className="border-t border-slate-200 px-5 py-3 text-xs leading-5 text-slate-500 sm:px-6 dark:border-slate-800 dark:text-slate-400">
            Bản đồ hiện dùng dữ liệu mô phỏng; khi triển khai thực tế cần kết nối tọa độ phản ánh với bản đồ GIS.
          </figcaption>
        </figure>

        <aside className="admin-panel flex min-h-0 flex-col overflow-hidden xl:max-h-[620px]" aria-labelledby="hotspot-list-title">
          <ManagerSectionHeader
            title="Danh sách điểm nóng"
            description="Ưu tiên khu vực có mật độ phản ánh cao."
            icon={Lucide.ListFilter}
          />
          {filteredCenters.length > 0 ? (
            <>
              <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-4 pr-3 sm:p-5 sm:pr-4" aria-label="Điểm nóng theo mức độ ưu tiên">
                {sortedCenters.map((center, index) => (
                  <li key={center.name}>
                    <article className="admin-inset-panel px-3.5 py-3">
                      <header className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" aria-hidden="true">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{center.name}</h3>
                            <strong className="shrink-0 text-sm text-rose-700 dark:text-rose-300">{Math.round(center.intensity * 100)}%</strong>
                          </span>
                          <p className="mt-0.5 truncate text-xs leading-5 text-slate-500 dark:text-slate-400">{center.issue}</p>
                          <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {categoryLabels[center.category]}
                          </span>
                        </span>
                      </header>
                    </article>
                  </li>
                ))}
              </ol>
              <footer className="shrink-0 border-t border-slate-200 px-5 py-2.5 text-xs text-slate-500 sm:px-6 dark:border-slate-800 dark:text-slate-400">
                Hiển thị {sortedCenters.length} điểm nóng phù hợp với bộ lọc.
              </footer>
            </>
          ) : (
            <p className="m-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 sm:m-6">Không có điểm nóng phù hợp với bộ lọc.</p>
          )}
        </aside>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Chỉ số bản đồ nhiệt">
        <ManagerMetricCard label="Điểm nóng đang hiển thị" value={filteredCenters.length} description="Cụm phản ánh sau khi áp dụng bộ lọc." icon={Lucide.Flame} toneClass="bg-rose-50 text-rose-700" />
        <ManagerMetricCard label="Mật độ trung bình" value={`${averageIntensity}%`} description="Mức tập trung tương đối của các cụm sự cố." icon={Lucide.Gauge} toneClass="bg-amber-50 text-amber-700" />
        <ManagerMetricCard label="Khu vực rủi ro cao" value={highestRisk?.name || '—'} description={highestRisk?.issue || 'Chưa có dữ liệu phù hợp.'} icon={Lucide.MapPinAlert} toneClass="bg-blue-50 text-blue-700" />
      </section>
    </article>
  );
};
