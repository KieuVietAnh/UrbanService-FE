import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import {
  INCIDENT_DASHBOARD_RANGES,
  extractApiErrorMessage,
  incidentDashboardApi,
  toolsApi,
} from '@urbanmind/shared-api';
import { ManagerSectionHeader, ManagerSelectMenu } from './ManagerPageElements';

/*
 * Bản đồ kéo theo Leaflet nên chỉ nạp khi thực sự hiển thị, tránh làm nặng lần
 * tải đầu của dashboard.
 */
const IncidentMap = lazy(() => import('../maps/IncidentMap').then((module) => ({ default: module.IncidentMap })));

const ALL_VALUE = '';

const RANGE_OPTIONS = [
  { value: INCIDENT_DASHBOARD_RANGES.ALL, label: 'Toàn bộ thời gian' },
  { value: INCIDENT_DASHBOARD_RANGES.LAST_7_DAYS, label: '7 ngày gần nhất' },
  { value: INCIDENT_DASHBOARD_RANGES.LAST_1_MONTH, label: '1 tháng gần nhất' },
  { value: INCIDENT_DASHBOARD_RANGES.LAST_6_MONTHS, label: '6 tháng gần nhất' },
  { value: INCIDENT_DASHBOARD_RANGES.LAST_1_YEAR, label: '1 năm gần nhất' },
];

const toCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SummaryStat = ({ label, value, toneClass }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">{label}</p>
    <p className={`mt-1 text-xl font-bold tracking-[-0.02em] ${toneClass || 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
  </div>
);

/**
 * Phân bố sự vụ theo danh mục và phường, kèm bản đồ các điểm đã có tọa độ.
 *
 * Ba tiêu chí lọc đều tùy chọn và gửi thẳng cho backend, nên con số hiển thị
 * luôn là con số backend tính chứ không phải lọc lại ở trình duyệt.
 */
export const IncidentDistributionPanel = () => {
  const [report, setReport] = useState(null);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    categoryId: ALL_VALUE,
    areaId: ALL_VALUE,
    range: INCIDENT_DASHBOARD_RANGES.LAST_1_MONTH,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([toolsApi.getAreas({ includeInactive: false }), toolsApi.getCategories()])
      .then(([areaResult, categoryResult]) => {
        if (cancelled) return;
        if (areaResult.status === 'fulfilled' && Array.isArray(areaResult.value)) setAreas(areaResult.value);
        if (categoryResult.status === 'fulfilled' && Array.isArray(categoryResult.value)) setCategories(categoryResult.value);
      });

    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await incidentDashboardApi.getDistribution({
        categoryId: filters.categoryId || undefined,
        areaId: filters.areaId || undefined,
        range: filters.range,
      });
      setReport(result);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không thể tải phân bố sự vụ.'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const categoryOptions = useMemo(() => ([
    { value: ALL_VALUE, label: 'Tất cả danh mục' },
    ...categories.map((item) => ({
      value: String(item?.categoryId ?? item?.id ?? ''),
      label: item?.categoryName ?? item?.name ?? 'Không tên',
    })).filter((option) => option.value),
  ]), [categories]);

  const areaOptions = useMemo(() => ([
    { value: ALL_VALUE, label: 'Tất cả phường' },
    ...areas.map((item) => ({
      value: String(item?.areaId ?? item?.id ?? ''),
      label: item?.areaName ?? item?.name ?? 'Không tên',
    })).filter((option) => option.value),
  ]), [areas]);

  const categoriesData = Array.isArray(report?.categories) ? report.categories : [];
  const maxCategoryCount = Math.max(1, ...categoriesData.map((item) => toCount(item?.count)));

  /*
   * IncidentMap dùng feedbackId làm khóa của marker, nên điểm sự vụ được ánh xạ
   * sang đúng khóa đó và điều hướng được chuyển về trang chi tiết sự vụ.
   */
  const mapIncidents = useMemo(() => categoriesData.flatMap((category) => (
    (Array.isArray(category?.areas) ? category.areas : []).flatMap((area) => (
      (Array.isArray(area?.points) ? area.points : []).map((point) => ({
        feedbackId: point?.incidentId,
        incidentId: point?.incidentId,
        title: point?.title,
        latitude: Number(point?.latitude),
        longitude: Number(point?.longitude),
        status: point?.status,
        priority: point?.priority,
        categoryName: point?.categoryName ?? category?.categoryName,
        locationText: point?.locationText,
        areaName: area?.areaName,
      }))
    ))
  )).filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)), [categoriesData]);

  const hasActiveFilter = Boolean(filters.categoryId || filters.areaId)
    || filters.range !== INCIDENT_DASHBOARD_RANGES.ALL;

  return (
    <section className="admin-panel overflow-hidden" aria-labelledby="incident-distribution-title">
      <ManagerSectionHeader
        id="incident-distribution-title"
        title="Phân bố sự vụ"
        description="Lọc theo danh mục, phường và khoảng thời gian, kèm vị trí các sự vụ trên bản đồ."
        icon={Lucide.ChartPie}
        actions={(
          <button
            type="button"
            onClick={() => setShowMap((open) => !open)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {showMap ? <Lucide.List size={14} aria-hidden="true" /> : <Lucide.Map size={14} aria-hidden="true" />}
            {showMap ? 'Ẩn bản đồ' : 'Hiện bản đồ'}
          </button>
        )}
      />

      <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="grid gap-2 sm:grid-cols-3">
          <ManagerSelectMenu
            value={filters.categoryId}
            options={categoryOptions}
            onChange={(value) => { setFilters((current) => ({ ...current, categoryId: value })); setExpandedCategoryId(null); }}
            ariaLabel="Lọc theo danh mục"
            className="w-full"
          />
          <ManagerSelectMenu
            value={filters.areaId}
            options={areaOptions}
            onChange={(value) => { setFilters((current) => ({ ...current, areaId: value })); setExpandedCategoryId(null); }}
            ariaLabel="Lọc theo phường"
            className="w-full"
          />
          <ManagerSelectMenu
            value={filters.range}
            options={RANGE_OPTIONS}
            onChange={(value) => setFilters((current) => ({ ...current, range: value }))}
            ariaLabel="Lọc theo khoảng thời gian"
            className="w-full"
          />
        </div>

        {hasActiveFilter ? (
          <button
            type="button"
            onClick={() => { setFilters({ categoryId: ALL_VALUE, areaId: ALL_VALUE, range: INCIDENT_DASHBOARD_RANGES.ALL }); setExpandedCategoryId(null); }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
          >
            <Lucide.RotateCcw size={13} aria-hidden="true" />Xóa bộ lọc
          </button>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <Lucide.TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 leading-6">{error}</p>
            <button type="button" onClick={() => void load()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-xs font-semibold hover:bg-amber-100 dark:bg-transparent">
              <Lucide.RefreshCcw size={14} aria-hidden="true" />Thử lại
            </button>
          </div>
        ) : null}

        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
          <SummaryStat label="Tổng sự vụ" value={toCount(report?.totalCount)} />
          <SummaryStat label="Đang mở" value={toCount(report?.openCount)} toneClass="text-blue-700 dark:text-blue-300" />
          <SummaryStat label="Đã hoàn thành" value={toCount(report?.completedCount)} toneClass="text-emerald-700 dark:text-emerald-300" />
          <SummaryStat label="Có tọa độ" value={toCount(report?.mappedCount)} />
        </div>

        {loading && !report ? (
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        ) : categoriesData.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
            Không có sự vụ nào khớp với bộ lọc hiện tại.
          </p>
        ) : (
          <div className={`grid gap-4 ${showMap ? 'xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]' : ''}`}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.05em] text-slate-400 dark:border-slate-800">
                Theo danh mục · bấm để xem phường
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoriesData.map((category) => {
                  const key = String(category?.categoryId ?? category?.categoryName);
                  const expanded = expandedCategoryId === key;
                  const count = toCount(category?.count);
                  const width = Math.max(4, (count / maxCategoryCount) * 100);
                  const areaRows = Array.isArray(category?.areas) ? category.areas : [];

                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setExpandedCategoryId(expanded ? null : key)}
                        className="w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                        aria-expanded={expanded}
                      >
                        <div className="flex items-center gap-3">
                          <Lucide.ChevronRight size={15} className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{category?.categoryName}</strong>
                            <span className="mt-0.5 block text-xs text-slate-400">
                              {toCount(category?.openCount)} đang mở · {toCount(category?.completedCount)} hoàn thành · {areaRows.length} phường
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <strong className="block text-sm font-semibold text-blue-700 dark:text-blue-300">{count}</strong>
                            <span className="block text-[11px] text-slate-400">{Number(category?.percentage ?? 0)}%</span>
                          </span>
                        </div>
                        <div className="ml-[26px] mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <span className="block h-full rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                        </div>
                      </button>

                      {expanded ? (
                        <ul className="border-t border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
                          {areaRows.map((area) => (
                            <li key={area?.areaId} className="flex items-center gap-3 px-4 py-2.5 pl-[42px]">
                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{area?.areaName}</strong>
                                {area?.districtName ? <span className="block text-[11px] text-slate-400">{area.districtName}</span> : null}
                              </span>
                              <span className="shrink-0 text-xs text-slate-500">
                                {toCount(area?.count)} · <span className="text-slate-400">{Number(area?.percentageInCategory ?? 0)}%</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            {showMap ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                {mapIncidents.length === 0 ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center">
                    <div>
                      <Lucide.MapPinOff size={26} className="mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có sự vụ nào có tọa độ</p>
                      <p className="mt-1 text-xs text-slate-400">Sự vụ khớp bộ lọc nhưng chưa gắn vị trí sẽ không hiện trên bản đồ.</p>
                    </div>
                  </div>
                ) : (
                  <Suspense fallback={<div className="h-[360px] animate-pulse bg-slate-100 dark:bg-slate-900" />}>
                    <div className="h-[360px]">
                      <IncidentMap
                        incidents={mapIncidents}
                        autoFitIncidents
                        fitRequestKey={mapIncidents.length}
                        returnPath="/dashboard"
                        detailPathBuilder={(ticket) => `/manager/incidents/${ticket?.incidentId ?? ticket?.feedbackId}`}
                      />
                    </div>
                  </Suspense>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

export default IncidentDistributionPanel;
