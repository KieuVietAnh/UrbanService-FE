import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import {
  getPriorityIntent,
  getSeverityIntent,
  getStatusIntent,
} from '@urbanmind/shared-types';
import { toolsApi } from '@urbanmind/shared-api';

import Button from '../../components/design-system/Button';
import Badge from '../../components/design-system/Badge';
import EmptyState from '../../components/design-system/EmptyState';
import Input from '../../components/design-system/Input';
import Select from '../../components/design-system/Select';
import { useAuth } from '../../contexts/AuthContext';
import { getCategoryLabel } from '../../utils/categoryLabels';
import {
  STAFF_INCIDENT_LIST_STATE,
  useStaffIncidentList,
} from '../../hooks/useStaffIncidentList';

const PAGE_SIZE_OPTIONS = [10, 20, 30];

const STATUS_LABELS = {
  new: 'Mới',
  open: 'Đang mở',
  verified: 'Đã xác minh',
  assigned: 'Đã phân công',
  inprogress: 'Đang xử lý',
  submittedforapproval: 'Chờ phê duyệt',
  needrework: 'Cần làm lại',
  resolved: 'Đã giải quyết',
  approved: 'Đã phê duyệt',
  closed: 'Đã đóng',
  cancelled: 'Đã hủy',
  rejected: 'Đã từ chối',
  merged: 'Đã hợp nhất',
};

const PRIORITY_LABELS = {
  critical: 'Khẩn cấp',
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  normal: 'Trung bình',
  low: 'Thấp',
};

const SEVERITY_LABELS = {
  critical: 'Nghiêm trọng',
  urgent: 'Nghiêm trọng',
  major: 'Cao',
  high: 'Cao',
  medium: 'Trung bình',
  normal: 'Trung bình',
  minor: 'Thấp',
  low: 'Thấp',
};

const normalizeEnumKey = (value) => String(value ?? '')
  .trim()
  .replace(/[-_\s]+/g, '')
  .toLowerCase();

const getEnumLabel = (value, labels) => {
  if (value === null || value === undefined || value === '') return 'Chưa có dữ liệu';
  return labels[normalizeEnumKey(value)] || 'Khác';
};

const formatIncidentCode = (incidentId) => {
  const normalized = String(incidentId ?? '').trim();
  return normalized ? `SV-${normalized.slice(0, 8).toUpperCase()}` : 'Chưa có dữ liệu';
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const formatCount = (value) => {
  if (value === null || value === undefined || value === '') return 'Chưa có dữ liệu';
  const count = Number(value);
  return Number.isFinite(count) ? count.toLocaleString('vi-VN') : 'Chưa có dữ liệu';
};

const getAreaLabel = (area) => (
  area?.areaName || area?.name || area?.displayName || 'Khu vực chưa đặt tên'
);

const collectFilterValues = (incidents, field, selectedValue) => {
  const values = new Set();
  incidents.forEach((incident) => {
    const value = String(incident?.[field] ?? '').trim();
    if (value) values.add(value);
  });
  if (selectedValue) values.add(selectedValue);
  return Array.from(values).sort((left, right) => left.localeCompare(right, 'vi'));
};

function FilterField({ label, htmlFor, children }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}

function IncidentListSkeleton() {
  return (
    <section className="admin-panel overflow-hidden" aria-busy="true" aria-label="Đang tải danh sách sự vụ">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-800">
        <div className="h-5 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(13rem,1fr)_auto] lg:items-center">
            <div>
              <div className="h-4 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-5 w-3/4 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-3 w-1/2 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <span className="sr-only">Đang tải dữ liệu</span>
    </section>
  );
}

export function StaffIncidentListState({ state, hasActiveFilters = false, onRetry, scopeUnavailable = false }) {
  if (state === STAFF_INCIDENT_LIST_STATE.LOADING) {
    return <IncidentListSkeleton />;
  }

  const stateContent = {
    [STAFF_INCIDENT_LIST_STATE.API_UNAVAILABLE]: {
      icon: Lucide.ServerOff,
      title: 'Chưa có API hỗ trợ danh sách sự vụ',
      description: 'Giao diện đã sẵn sàng nhưng backend hiện chưa cung cấp API phù hợp để tải danh sách sự vụ của Staff.',
    },
    [STAFF_INCIDENT_LIST_STATE.ERROR]: {
      icon: Lucide.TriangleAlert,
      title: 'Không thể tải danh sách sự vụ',
      description: scopeUnavailable
        ? 'Không xác định được tài khoản nhân viên hiện tại để lọc phạm vi công việc.'
        : 'Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng thử lại.',
      action: scopeUnavailable ? null : (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <Lucide.RefreshCw size={16} aria-hidden="true" />
          Thử lại
        </Button>
      ),
    },
    [STAFF_INCIDENT_LIST_STATE.EMPTY]: {
      icon: Lucide.ClipboardList,
      title: 'Chưa có sự vụ nào',
      description: 'Các sự vụ được phân công cho bạn sẽ xuất hiện tại đây.',
    },
    [STAFF_INCIDENT_LIST_STATE.NO_RESULTS]: {
      icon: Lucide.SearchX,
      title: 'Không tìm thấy sự vụ phù hợp',
      description: 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',
    },
  };

  const content = stateContent[
    state === STAFF_INCIDENT_LIST_STATE.EMPTY && hasActiveFilters
      ? STAFF_INCIDENT_LIST_STATE.NO_RESULTS
      : state
  ];

  if (!content) return null;

  return (
    <section aria-live="polite">
      <EmptyState {...content} />
    </section>
  );
}

function IncidentBadges({ incident }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge intent={getStatusIntent(incident?.status)}>
        {getEnumLabel(incident?.status, STATUS_LABELS)}
      </Badge>
      <Badge intent={getPriorityIntent(incident?.priority)}>
        Ưu tiên: {getEnumLabel(incident?.priority, PRIORITY_LABELS)}
      </Badge>
      <Badge intent={getSeverityIntent(incident?.severity)}>
        Mức độ: {getEnumLabel(incident?.severity, SEVERITY_LABELS)}
      </Badge>
      {incident?.mergedIntoIncidentId ? <Badge intent="neutral">Đã hợp nhất</Badge> : null}
    </div>
  );
}

function IncidentDetailLink({ incidentId }) {
  if (!incidentId) {
    return <span className="text-sm font-medium text-slate-500">Chưa có dữ liệu</span>;
  }

  const incidentCode = formatIncidentCode(incidentId);

  return (
    <Link
      to={`/staff/incidents/${incidentId}`}
      className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/50"
      aria-label={`Xem chi tiết sự vụ ${incidentCode}`}
    >
      Xem chi tiết
      <Lucide.ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function IncidentList({ incidents }) {
  return (
    <section className="admin-panel overflow-hidden" aria-label="Danh sách sự vụ được giao">
      <div className="hidden lg:block">
        <table className="table table-fixed w-full text-sm">
          <caption className="sr-only">Các sự vụ được phân công cho tài khoản nhân viên hiện tại</caption>
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="admin-table-head">
            <tr className="text-[11px] font-semibold uppercase tracking-[0.06em]">
              <th scope="col">Sự vụ</th>
              <th scope="col">Khu vực và danh mục</th>
              <th scope="col">Trạng thái xử lý</th>
              <th scope="col">Báo cáo</th>
              <th scope="col">Cập nhật</th>
              <th scope="col"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody className="admin-table-body divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.map((incident) => {
              const incidentId = incident?.incidentId;
              const code = formatIncidentCode(incidentId);
              return (
                <tr key={incidentId} className="admin-table-row align-middle">
                  <th scope="row" className="font-normal">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300" title={incidentId}>{code}</p>
                    <p className="mt-1.5 line-clamp-2 font-semibold leading-6 text-slate-900 dark:text-slate-100">
                      {incident?.title || 'Chưa có dữ liệu'}
                    </p>
                  </th>
                  <td>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident?.areaName || 'Chưa có dữ liệu'}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {incident?.locationText || getCategoryLabel(incident?.categoryName, 'Chưa có dữ liệu')}
                    </p>
                    {incident?.locationText ? (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        {getCategoryLabel(incident?.categoryName, 'Chưa có dữ liệu')}
                      </p>
                    ) : null}
                  </td>
                  <td><IncidentBadges incident={incident} /></td>
                  <td>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{formatCount(incident?.reportCount)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatCount(incident?.subscriberCount)} người theo dõi
                    </p>
                  </td>
                  <td>
                    <time dateTime={incident?.updatedAt || incident?.createdAt || undefined} className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {formatDateTime(incident?.updatedAt || incident?.createdAt)}
                    </time>
                  </td>
                  <td className="text-right"><IncidentDetailLink incidentId={incidentId} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        {incidents.map((incident) => {
          const incidentId = incident?.incidentId;
          return (
            <article key={incidentId} className="px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300" title={incidentId}>
                    {formatIncidentCode(incidentId)}
                  </p>
                  <h3 className="mt-1.5 text-base font-bold leading-6 text-slate-900 dark:text-slate-100">
                    {incident?.title || 'Chưa có dữ liệu'}
                  </h3>
                </div>
                <Lucide.BriefcaseBusiness className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              </div>

              <div className="mt-4"><IncidentBadges incident={incident} /></div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phường / Khu vực</dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                    {incident?.areaName || 'Chưa có dữ liệu'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Danh mục</dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                    {getCategoryLabel(incident?.categoryName, 'Chưa có dữ liệu')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Số báo cáo</dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                    {formatCount(incident?.reportCount)} báo cáo
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cập nhật lần cuối</dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateTime(incident?.updatedAt || incident?.createdAt)}
                  </dd>
                </div>
              </dl>

              {incident?.locationText ? (
                <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <Lucide.MapPin className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  {incident.locationText}
                </p>
              ) : null}

              <div className="mt-5"><IncidentDetailLink incidentId={incidentId} /></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Pagination({ pagination, pageNumber, pageSize, loading, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(Number(pagination?.totalPages) || 1, 1);
  const totalItems = Number(pagination?.totalItems) || 0;

  return (
    <footer className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-slate-100">{totalItems.toLocaleString('vi-VN')}</span> sự vụ được giao
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="staff-incident-page-size" className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Số dòng
        </label>
        <Select
          id="staff-incident-page-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 w-20"
          disabled={loading}
        >
          {PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
        <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Trang {pageNumber} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Trang trước"
          disabled={loading || !pagination?.hasPreviousPage}
          onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
        >
          <Lucide.ChevronLeft size={16} aria-hidden="true" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Trang sau"
          disabled={loading || !pagination?.hasNextPage}
          onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
        >
          Sau
          <Lucide.ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </footer>
  );
}

export default function StaffIncidentListPage() {
  const { user } = useAuth();
  const assignedStaffUserId = String(user?.userId ?? '').trim();
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [draftSearch, setDraftSearch] = useState('');
  const [filters, setFilters] = useState({
    areaId: '',
    categoryId: '',
    status: '',
    priority: '',
    severity: '',
    search: '',
    includeMerged: false,
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;

    const loadLookups = async () => {
      const [areasResult, categoriesResult] = await Promise.allSettled([
        toolsApi.getAreas(),
        toolsApi.getCategories(),
      ]);

      if (!active) return;
      setAreas(areasResult.status === 'fulfilled' && Array.isArray(areasResult.value) ? areasResult.value : []);
      setCategories(categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value) ? categoriesResult.value : []);
    };

    void loadLookups();
    return () => { active = false; };
  }, []);

  const queryParams = useMemo(() => ({
    pageNumber,
    pageSize,
    areaId: filters.areaId,
    categoryId: filters.categoryId,
    status: filters.status,
    priority: filters.priority,
    severity: filters.severity,
    search: filters.search,
    includeMerged: filters.includeMerged,
    assignedStaffUserId,
  }), [assignedStaffUserId, filters, pageNumber, pageSize]);

  const {
    capability,
    error,
    incidents,
    pagination,
    retry,
    state,
  } = useStaffIncidentList(queryParams, { enabled: Boolean(assignedStaffUserId) });

  const statusOptions = useMemo(
    () => collectFilterValues(incidents, 'status', filters.status),
    [filters.status, incidents],
  );
  const priorityOptions = useMemo(
    () => collectFilterValues(incidents, 'priority', filters.priority),
    [filters.priority, incidents],
  );
  const severityOptions = useMemo(
    () => collectFilterValues(incidents, 'severity', filters.severity),
    [filters.severity, incidents],
  );

  const hasActiveFilters = Boolean(
    filters.areaId
    || filters.categoryId
    || filters.status
    || filters.priority
    || filters.severity
    || filters.search
    || filters.includeMerged
  );
  const loading = state === STAFF_INCIDENT_LIST_STATE.LOADING;
  const scopeUnavailable = error?.message === 'STAFF_SCOPE_UNAVAILABLE';

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPageNumber(1);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateFilter('search', draftSearch.trim());
  };

  const handleResetFilters = () => {
    setDraftSearch('');
    setFilters({
      areaId: '',
      categoryId: '',
      status: '',
      priority: '',
      severity: '',
      search: '',
      includeMerged: false,
    });
    setPageNumber(1);
  };

  return (
    <article className="admin-page-shell space-y-6">
      <header className="admin-page-hero px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.ClipboardList size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="admin-hero-title">Sự vụ của tôi</h1>
              <p className="admin-hero-description">
                Theo dõi các sự vụ được phân công, mức độ ưu tiên và tiến độ xử lý.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-blue-200/80 bg-blue-50/80 px-3.5 py-2.5 text-sm font-semibold text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/35 dark:text-blue-200">
            <Lucide.UserRoundCheck size={17} aria-hidden="true" />
            Chỉ hiển thị sự vụ được giao cho bạn
          </div>
        </div>
      </header>

      <section className="admin-panel overflow-hidden" aria-labelledby="staff-incident-filters-title">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <h2 id="staff-incident-filters-title" className="admin-section-title">Bộ lọc sự vụ</h2>
          <p className="admin-section-description mt-1">
            Tìm và thu hẹp danh sách trong đúng phạm vi công việc được giao.
          </p>
        </header>

        <form onSubmit={handleSearchSubmit} className="px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(0,1fr))]">
            <div className="sm:col-span-2 lg:col-span-1">
              <FilterField label="Tìm kiếm" htmlFor="staff-incident-search">
                <div className="relative">
                  <Lucide.Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="staff-incident-search"
                    type="search"
                    value={draftSearch}
                    onChange={(event) => setDraftSearch(event.target.value)}
                    placeholder="Tìm theo mã hoặc tiêu đề sự vụ"
                    className="h-11 pl-10"
                  />
                </div>
              </FilterField>
            </div>

            <FilterField label="Trạng thái" htmlFor="staff-incident-status">
              <Select id="staff-incident-status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="h-11">
                <option value="">Tất cả trạng thái</option>
                {statusOptions.map((value) => <option key={value} value={value}>{getEnumLabel(value, STATUS_LABELS)}</option>)}
              </Select>
            </FilterField>

            <FilterField label="Mức ưu tiên" htmlFor="staff-incident-priority">
              <Select id="staff-incident-priority" value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)} className="h-11">
                <option value="">Tất cả mức ưu tiên</option>
                {priorityOptions.map((value) => <option key={value} value={value}>{getEnumLabel(value, PRIORITY_LABELS)}</option>)}
              </Select>
            </FilterField>

            <FilterField label="Mức độ nghiêm trọng" htmlFor="staff-incident-severity">
              <Select id="staff-incident-severity" value={filters.severity} onChange={(event) => updateFilter('severity', event.target.value)} className="h-11">
                <option value="">Tất cả mức độ</option>
                {severityOptions.map((value) => <option key={value} value={value}>{getEnumLabel(value, SEVERITY_LABELS)}</option>)}
              </Select>
            </FilterField>

            <FilterField label="Phường / Khu vực" htmlFor="staff-incident-area">
              <Select id="staff-incident-area" value={filters.areaId} onChange={(event) => updateFilter('areaId', event.target.value)} className="h-11">
                <option value="">Tất cả khu vực</option>
                {areas.map((area) => (
                  <option key={area?.areaId ?? area?.id} value={area?.areaId ?? area?.id}>
                    {getAreaLabel(area)}
                  </option>
                ))}
              </Select>
            </FilterField>

            <FilterField label="Danh mục" htmlFor="staff-incident-category">
              <Select id="staff-incident-category" value={filters.categoryId} onChange={(event) => updateFilter('categoryId', event.target.value)} className="h-11">
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category?.categoryId ?? category?.id} value={category?.categoryId ?? category?.id}>
                    {getCategoryLabel(category?.categoryName || category?.name)}
                  </option>
                ))}
              </Select>
            </FilterField>
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={filters.includeMerged}
                onChange={(event) => updateFilter('includeMerged', event.target.checked)}
              />
              Bao gồm sự vụ đã hợp nhất
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} disabled={!hasActiveFilters && !draftSearch}>
                <Lucide.RotateCcw size={16} aria-hidden="true" />
                Xóa bộ lọc
              </Button>
              <Button type="submit" size="sm">
                <Lucide.Search size={16} aria-hidden="true" />
                Tìm kiếm
              </Button>
            </div>
          </div>
        </form>
      </section>

      <section aria-labelledby="staff-incident-list-title">
        <div className="mb-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="staff-incident-list-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Danh sách sự vụ
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Dữ liệu sự vụ được lọc theo tài khoản nhân viên hiện tại.
            </p>
          </div>
          {loading && incidents.length > 0 ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Lucide.LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
              Đang làm mới
            </span>
          ) : null}
        </div>

        {state === STAFF_INCIDENT_LIST_STATE.READY ? (
          <>
            <IncidentList incidents={incidents} />
            <Pagination
              pagination={pagination}
              pageNumber={pageNumber}
              pageSize={pageSize}
              loading={loading}
              onPageChange={setPageNumber}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPageNumber(1);
              }}
            />
          </>
        ) : (
          <StaffIncidentListState
            state={state}
            hasActiveFilters={hasActiveFilters}
            onRetry={retry}
            scopeUnavailable={scopeUnavailable}
          />
        )}
      </section>

      {!capability.assignedToCurrentStaff ? (
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" role="note">
          Backend chưa hỗ trợ lọc “Sự vụ được giao cho tôi”. Dữ liệu hiện tại có thể bao gồm các sự vụ ngoài phạm vi của bạn.
        </aside>
      ) : null}
    </article>
  );
}
