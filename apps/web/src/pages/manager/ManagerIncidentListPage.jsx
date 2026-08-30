import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import {
  getPriorityIntent,
  getSeverityIntent,
  getStatusIntent,
} from '@urbanmind/shared-types';
import { incidentManagementApi, toolsApi } from '@urbanmind/shared-api';

import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import EmptyState from '../../components/design-system/EmptyState';
import Input from '../../components/design-system/Input';
import Select from '../../components/design-system/Select';
import { ManagerPageHeader } from '../../components/manager/ManagerPageElements';
import { getCategoryLabel } from '../../utils/categoryLabels';
import {
  MISSING_INCIDENT_VALUE,
  collectIncidentEnumValues,
  formatManagerIncidentCode,
  formatManagerIncidentCount,
  formatManagerIncidentDateTime,
  getManagerIncidentPriorityLabel,
  getManagerIncidentSeverityLabel,
  getManagerIncidentStatusLabel,
  hasManagerIncidentFilters,
} from './managerIncidentUtils';

const PAGE_SIZE_OPTIONS = [10, 20, 30];

const PAGE_STATE = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  API_UNAVAILABLE: 'api-unavailable',
});

const getAreaId = (area) => area?.areaId ?? area?.id;
const getAreaName = (area) => area?.areaName || area?.name || area?.displayName || MISSING_INCIDENT_VALUE;
const getCategoryId = (category) => category?.categoryId ?? category?.id;

function FilterField({ label, htmlFor, children, className = '' }) {
  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
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
        <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid gap-4 px-5 py-5 sm:px-6 xl:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)_minmax(14rem,1.2fr)_auto] xl:items-center">
            <div>
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
            <div className="h-10 w-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="flex gap-2">
              <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <span className="sr-only">Đang tải dữ liệu</span>
    </section>
  );
}

function IncidentBadges({ incident }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge intent={getStatusIntent(incident?.status)}>
        {getManagerIncidentStatusLabel(incident?.status)}
      </Badge>
      <Badge intent={getPriorityIntent(incident?.priority)}>
        Ưu tiên: {getManagerIncidentPriorityLabel(incident?.priority)}
      </Badge>
      <Badge intent={getSeverityIntent(incident?.severity)}>
        Mức độ: {getManagerIncidentSeverityLabel(incident?.severity)}
      </Badge>
      {incident?.mergedIntoIncidentId ? <Badge intent="neutral">Đã gộp</Badge> : null}
    </div>
  );
}

function DetailLink({ incident }) {
  const incidentId = incident?.incidentId;
  if (!incidentId) return <span className="text-sm text-slate-500">{MISSING_INCIDENT_VALUE}</span>;

  return (
    <Link
      to={`/manager/incidents/${incidentId}`}
      className="inline-flex min-h-10 min-w-[8.75rem] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
      aria-label={`Xem chi tiết sự vụ ${formatManagerIncidentCode(incidentId)}`}
    >
      Xem chi tiết
      <Lucide.ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function IncidentCards({ incidents }) {
  return (
    <div className="divide-y divide-slate-100 xl:hidden dark:divide-slate-800">
      {incidents.map((incident) => (
        <article key={incident.incidentId} className="px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-blue-700 dark:text-blue-300">
                {formatManagerIncidentCode(incident.incidentId)}
              </p>
              <h3 className="mt-1.5 text-base font-bold leading-6 text-slate-950 dark:text-white">
                {incident.title || MISSING_INCIDENT_VALUE}
              </h3>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" aria-hidden="true">
              <Lucide.BriefcaseBusiness size={19} />
            </span>
          </div>

          <div className="mt-4"><IncidentBadges incident={incident} /></div>

          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phường / Khu vực</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{incident.areaName || MISSING_INCIDENT_VALUE}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Danh mục</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{getCategoryLabel(incident.categoryName, MISSING_INCIDENT_VALUE)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff phụ trách</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{incident.assignedStaffName || 'Chưa phân công'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Số Report</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{formatManagerIncidentCount(incident.reportCount)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Người theo dõi</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{formatManagerIncidentCount(incident.subscriberCount)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cập nhật gần nhất</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{formatManagerIncidentDateTime(incident.updatedAt || incident.createdAt)}</dd>
            </div>
          </dl>

          {incident.locationText ? (
            <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <Lucide.MapPin className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              {incident.locationText}
            </p>
          ) : null}

          <div className="mt-5"><DetailLink incident={incident} /></div>
        </article>
      ))}
    </div>
  );
}

function IncidentTable({ incidents }) {
  return (
    <div className="hidden xl:block">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">Danh sách sự vụ thuộc phạm vi quản lý</caption>
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[14%]" />
          <col className="w-[18%]" />
          <col className="w-[11%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead className="admin-table-head">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em]">
            <th scope="col" className="px-5 py-3">Sự vụ</th>
            <th scope="col" className="px-4 py-3">Khu vực / Danh mục</th>
            <th scope="col" className="px-4 py-3">Trạng thái xử lý</th>
            <th scope="col" className="px-4 py-3">Staff phụ trách</th>
            <th scope="col" className="px-4 py-3">Quy mô</th>
            <th scope="col" className="px-4 py-3">Cập nhật</th>
            <th scope="col" className="px-5 py-3"><span className="sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody className="admin-table-body divide-y divide-slate-100 dark:divide-slate-800">
          {incidents.map((incident) => (
            <tr key={incident.incidentId} className="admin-table-row align-top">
              <th scope="row" className="px-5 py-4 text-left font-normal">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-blue-700 dark:text-blue-300">
                  {formatManagerIncidentCode(incident.incidentId)}
                </p>
                <p className="mt-1.5 line-clamp-2 font-bold leading-6 text-slate-950 dark:text-white">
                  {incident.title || MISSING_INCIDENT_VALUE}
                </p>
                {incident.locationText ? <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{incident.locationText}</p> : null}
              </th>
              <td className="px-4 py-4">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{incident.areaName || MISSING_INCIDENT_VALUE}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{getCategoryLabel(incident.categoryName, MISSING_INCIDENT_VALUE)}</p>
              </td>
              <td className="px-4 py-4"><IncidentBadges incident={incident} /></td>
              <td className="px-4 py-4">
                <p className="line-clamp-2 font-semibold leading-5 text-slate-800 dark:text-slate-100">{incident.assignedStaffName || 'Chưa phân công'}</p>
              </td>
              <td className="px-4 py-4">
                <p className="font-bold text-slate-900 dark:text-white">{formatManagerIncidentCount(incident.reportCount)} Report</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatManagerIncidentCount(incident.subscriberCount)} người theo dõi</p>
              </td>
              <td className="px-4 py-4">
                <time dateTime={incident.updatedAt || incident.createdAt || undefined} className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {formatManagerIncidentDateTime(incident.updatedAt || incident.createdAt)}
                </time>
              </td>
              <td className="px-3 py-4 text-right"><DetailLink incident={incident} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ pagination, pageSize, loading, onPageChange, onPageSizeChange }) {
  const pageNumber = Math.max(Number(pagination.pageNumber) || 1, 1);
  const totalPages = Math.max(Number(pagination.totalPages) || 1, 1);
  const totalItems = Number(pagination.totalItems) || 0;

  return (
    <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
        <strong className="text-slate-800 dark:text-slate-200">{totalItems.toLocaleString('vi-VN')}</strong> sự vụ · Trang {pageNumber}/{totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="manager-incident-page-size" className="text-sm font-medium text-slate-600 dark:text-slate-300">Số dòng</label>
        <Select id="manager-incident-page-size" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="h-10 w-20" disabled={loading}>
          {PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
        <Button type="button" variant="outline" size="sm" disabled={loading || !pagination.hasPreviousPage} onClick={() => onPageChange(pageNumber - 1)}>
          <Lucide.ChevronLeft size={16} aria-hidden="true" />
          Trước
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={loading || !pagination.hasNextPage} onClick={() => onPageChange(pageNumber + 1)}>
          Sau
          <Lucide.ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </footer>
  );
}

function PageMessage({ state, hasActiveFilters, onRetry }) {
  const content = {
    [PAGE_STATE.API_UNAVAILABLE]: {
      icon: Lucide.ServerOff,
      title: 'Chưa có API hỗ trợ danh sách sự vụ',
      description: 'Backend hiện chưa cung cấp nguồn dữ liệu phù hợp cho danh sách sự vụ.',
    },
    [PAGE_STATE.ERROR]: {
      icon: Lucide.TriangleAlert,
      title: 'Không thể tải danh sách sự vụ',
      description: 'Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng thử lại.',
      action: (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <Lucide.RefreshCw size={16} aria-hidden="true" />
          Thử lại
        </Button>
      ),
    },
    [PAGE_STATE.EMPTY]: hasActiveFilters
      ? {
        icon: Lucide.SearchX,
        title: 'Không tìm thấy sự vụ phù hợp',
        description: 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',
      }
      : {
        icon: Lucide.ClipboardList,
        title: 'Chưa có sự vụ nào',
        description: 'Các sự vụ thuộc phạm vi quản lý sẽ xuất hiện tại đây.',
      },
  }[state];

  return content ? <EmptyState {...content} /> : null;
}

export function ManagerIncidentListPage() {
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [draftSearch, setDraftSearch] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    areaId: '',
    categoryId: '',
    status: '',
    priority: '',
    severity: '',
    includeMerged: false,
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [state, setState] = useState(PAGE_STATE.LOADING);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const loadLookups = async () => {
      const [areaResult, categoryResult] = await Promise.allSettled([
        toolsApi.getAreas(),
        toolsApi.getCategories(),
      ]);
      if (!active) return;
      setAreas(areaResult.status === 'fulfilled' && Array.isArray(areaResult.value) ? areaResult.value : []);
      setCategories(categoryResult.status === 'fulfilled' && Array.isArray(categoryResult.value) ? categoryResult.value : []);
    };
    void loadLookups();
    return () => { active = false; };
  }, []);

  const loadIncidents = useCallback(async (signal) => {
    if (!incidentManagementApi.capabilities.list.available) {
      setState(PAGE_STATE.API_UNAVAILABLE);
      return;
    }

    setState(PAGE_STATE.LOADING);
    try {
      const response = await incidentManagementApi.getIncidents({
        pageNumber,
        pageSize,
        ...filters,
      }, { signal });
      setIncidents(response.items);
      setPagination(response);
      setState(response.items.length > 0 ? PAGE_STATE.READY : PAGE_STATE.EMPTY);
    } catch (error) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      setIncidents([]);
      const status = Number(error?.status ?? error?.response?.status);
      setState([404, 405].includes(status) ? PAGE_STATE.API_UNAVAILABLE : PAGE_STATE.ERROR);
    }
  }, [filters, pageNumber, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    void loadIncidents(controller.signal);
    return () => controller.abort();
  }, [loadIncidents, refreshKey]);

  const statusOptions = useMemo(
    () => collectIncidentEnumValues(incidents, 'status', filters.status),
    [filters.status, incidents],
  );
  const priorityOptions = useMemo(
    () => collectIncidentEnumValues(incidents, 'priority', filters.priority),
    [filters.priority, incidents],
  );
  const severityOptions = useMemo(
    () => collectIncidentEnumValues(incidents, 'severity', filters.severity),
    [filters.severity, incidents],
  );
  const hasActiveFilters = hasManagerIncidentFilters(filters);
  const loading = state === PAGE_STATE.LOADING;

  const changeFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPageNumber(1);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setFilters({ search: '', areaId: '', categoryId: '', status: '', priority: '', severity: '', includeMerged: false });
    setPageNumber(1);
  };

  return (
    <main className="space-y-6 pb-8">
      <ManagerPageHeader
        title="Quản lý sự vụ"
        description="Theo dõi, kiểm tra và phân công các sự vụ thuộc phạm vi quản lý."
        icon={Lucide.BriefcaseBusiness}
        statusLabel="Nguồn dữ liệu"
        statusValue="Incident"
        statusTone="info"
      />

      <section className="admin-panel p-5 sm:p-6" aria-labelledby="manager-incident-filter-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="manager-incident-filter-title" className="admin-section-title">Bộ lọc sự vụ</h2>
            <p className="admin-section-description mt-1">Các điều kiện dưới đây được gửi trực tiếp đến API quản lý Incident.</p>
          </div>
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <Lucide.RotateCcw size={16} aria-hidden="true" />
              Xóa bộ lọc
            </Button>
          ) : null}
        </div>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12"
          onSubmit={(event) => {
            event.preventDefault();
            changeFilter('search', draftSearch.trim());
          }}
        >
          <FilterField label="Tìm kiếm" htmlFor="manager-incident-search" className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <div className="flex gap-2">
              <Input id="manager-incident-search" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Mã, tiêu đề hoặc nội dung sự vụ" />
              <Button type="submit" size="sm" className="shrink-0 whitespace-nowrap" disabled={loading}>
                <Lucide.Search size={16} aria-hidden="true" />
                Tìm
              </Button>
            </div>
          </FilterField>
          <FilterField label="Phường / Khu vực" htmlFor="manager-incident-area" className="xl:col-span-2">
            <Select id="manager-incident-area" value={filters.areaId} onChange={(event) => changeFilter('areaId', event.target.value)}>
              <option value="">Tất cả khu vực</option>
              {areas.map((area) => <option key={getAreaId(area)} value={getAreaId(area)}>{getAreaName(area)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Danh mục" htmlFor="manager-incident-category" className="xl:col-span-2">
            <Select id="manager-incident-category" value={filters.categoryId} onChange={(event) => changeFilter('categoryId', event.target.value)}>
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => <option key={getCategoryId(category)} value={getCategoryId(category)}>{getCategoryLabel(category?.name || category?.categoryName, MISSING_INCIDENT_VALUE)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Trạng thái" htmlFor="manager-incident-status" className="xl:col-span-2">
            <Select id="manager-incident-status" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map((value) => <option key={value} value={value}>{getManagerIncidentStatusLabel(value)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Mức ưu tiên" htmlFor="manager-incident-priority" className="xl:col-span-2">
            <Select id="manager-incident-priority" value={filters.priority} onChange={(event) => changeFilter('priority', event.target.value)}>
              <option value="">Tất cả mức ưu tiên</option>
              {priorityOptions.map((value) => <option key={value} value={value}>{getManagerIncidentPriorityLabel(value)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Mức độ nghiêm trọng" htmlFor="manager-incident-severity" className="xl:col-span-3">
            <Select id="manager-incident-severity" value={filters.severity} onChange={(event) => changeFilter('severity', event.target.value)}>
              <option value="">Tất cả mức độ</option>
              {severityOptions.map((value) => <option key={value} value={value}>{getManagerIncidentSeverityLabel(value)}</option>)}
            </Select>
          </FilterField>
          <div className="flex items-end sm:col-span-2 lg:col-span-2 xl:col-span-4">
            <label className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <input type="checkbox" checked={filters.includeMerged} onChange={(event) => changeFilter('includeMerged', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Hiển thị sự vụ đã gộp
            </label>
          </div>
        </form>
      </section>

      {loading ? <IncidentListSkeleton /> : null}
      {state === PAGE_STATE.READY ? (
        <section className="admin-panel overflow-hidden" aria-labelledby="manager-incident-list-title">
          <header className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
            <h2 id="manager-incident-list-title" className="admin-section-title">Danh sách sự vụ</h2>
            <p className="admin-section-description mt-1">Theo dõi trạng thái, quy mô Report và Staff đang phụ trách.</p>
          </header>
          <IncidentCards incidents={incidents} />
          <IncidentTable incidents={incidents} />
          <Pagination pagination={pagination} pageSize={pageSize} loading={loading} onPageChange={setPageNumber} onPageSizeChange={(value) => { setPageSize(value); setPageNumber(1); }} />
        </section>
      ) : null}
      {[PAGE_STATE.EMPTY, PAGE_STATE.ERROR, PAGE_STATE.API_UNAVAILABLE].includes(state) ? (
        <PageMessage state={state} hasActiveFilters={hasActiveFilters} onRetry={() => setRefreshKey((value) => value + 1)} />
      ) : null}
    </main>
  );
}

export default ManagerIncidentListPage;
