import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import {
  getPriorityIntent,
  getStatusIntent,
  getStatusLabel,
} from '@urbanmind/shared-types';
import { toolsApi } from '@urbanmind/shared-api';

import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import EmptyState from '../../components/design-system/EmptyState';
import Input from '../../components/design-system/Input';
import Select from '../../components/design-system/Select';
import { ManagerPageHeader } from '../../components/manager/ManagerPageElements';
import { getCategoryLabel } from '../../utils/categoryLabels';
import {
  MISSING_VALUE,
  formatConfidence,
  formatReportCode,
  formatReviewDateTime,
  getAiCategoryName,
  getPriorityLabel,
  getReviewPriority,
} from './managerReportReviewUtils';

const PAGE_SIZE_OPTIONS = [10, 20, 30];

const QUEUE_STATE = {
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  API_UNAVAILABLE: 'api-unavailable',
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

function QueueSkeleton() {
  return (
    <section className="admin-panel overflow-hidden" aria-busy="true" aria-label="Đang tải hàng chờ xác nhận phản ánh">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-800">
        <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_auto] lg:items-center">
            <div>
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
            <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <span className="sr-only">Đang tải dữ liệu</span>
    </section>
  );
}

function QueueEmptyState({ state, hasActiveFilters, onRetry }) {
  const content = {
    [QUEUE_STATE.API_UNAVAILABLE]: {
      icon: Lucide.ServerOff,
      title: 'Chưa có API hỗ trợ hàng chờ xác nhận phản ánh',
      description: 'Backend hiện chưa cung cấp nguồn dữ liệu phù hợp cho hàng chờ này.',
    },
    [QUEUE_STATE.ERROR]: {
      icon: Lucide.TriangleAlert,
      title: 'Không thể tải hàng chờ xác nhận phản ánh',
      description: 'Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng thử lại.',
      action: (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <Lucide.RefreshCw size={16} aria-hidden="true" />
          Thử lại
        </Button>
      ),
    },
    [QUEUE_STATE.EMPTY]: hasActiveFilters
      ? {
        icon: Lucide.SearchX,
        title: 'Không tìm thấy phản ánh phù hợp',
        description: 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',
      }
      : {
        icon: Lucide.ClipboardCheck,
        title: 'Không có phản ánh nào chờ xác nhận',
        description: 'Các phản ánh sau khi AI phân tích sẽ xuất hiện tại đây để Manager kiểm tra.',
      },
  }[state];

  return content ? <EmptyState {...content} /> : null;
}

function ReviewBadges({ report }) {
  const priority = getReviewPriority(report);
  return (
    <div className="flex flex-wrap gap-2">
      <Badge intent={getStatusIntent(report?.status)}>
        {getStatusLabel(report?.status, MISSING_VALUE)}
      </Badge>
      <Badge intent={getPriorityIntent(priority)}>
        Ưu tiên: {getPriorityLabel(priority)}
      </Badge>
      <Badge intent="info">
        AI: {formatConfidence(report?.confidenceScore)}
      </Badge>
    </div>
  );
}

function ReportReviewLink({ report, from }) {
  const feedbackId = report?.feedbackId || report?.id;
  if (!feedbackId) return <span className="text-sm text-slate-500">{MISSING_VALUE}</span>;

  return (
    <Link
      to={`/manager/reports/review/${feedbackId}`}
      state={{ report, from }}
      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
      aria-label={`Xem và xác nhận phản ánh ${report?.title || formatReportCode(feedbackId)}`}
    >
      Xem và xác nhận
      <Lucide.ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function MobileReportCard({ report, from }) {
  const feedbackId = report?.feedbackId || report?.id;
  return (
    <article className="border-b border-slate-100 px-5 py-5 last:border-b-0 dark:border-slate-800 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
            {formatReportCode(feedbackId)}
          </p>
          <h3 className="mt-2 text-base font-bold leading-6 text-slate-950 dark:text-white">
            {report?.title || MISSING_VALUE}
          </h3>
        </div>
        <time className="text-xs font-medium text-slate-500 dark:text-slate-400" dateTime={report?.createdAt || undefined}>
          {formatReviewDateTime(report?.createdAt)}
        </time>
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {report?.summary || MISSING_VALUE}
      </p>
      <div className="mt-3"><ReviewBadges report={report} /></div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Danh mục AI đề xuất</dt>
          <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{getCategoryLabel(getAiCategoryName(report))}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Phường / Khu vực</dt>
          <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{report?.areaName || report?.locationText || MISSING_VALUE}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Người gửi</dt>
          <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{report?.reporterName || report?.userName || MISSING_VALUE}</dd>
        </div>
      </dl>

      <div className="mt-5"><ReportReviewLink report={report} from={from} /></div>
    </article>
  );
}

function ReviewQueueList({ reports, from }) {
  return (
    <section className="admin-panel overflow-hidden" aria-labelledby="manager-report-review-list-title">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
        <h2 id="manager-report-review-list-title" className="admin-section-title">Phản ánh cần kiểm tra</h2>
        <p className="admin-section-description mt-1">Dữ liệu phản ánh và kết quả phân tích được lấy trực tiếp từ hàng chờ AI.</p>
      </header>

      <div className="lg:hidden">
        {reports.map((report) => (
          <MobileReportCard key={report?.feedbackId || report?.id} report={report} from={from} />
        ))}
      </div>

      <div className="hidden lg:block">
        <table className="w-full table-fixed">
          <caption className="sr-only">Danh sách phản ánh chờ quản lý xác nhận</caption>
          <colgroup>
            <col className="w-[29%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[19%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead className="admin-table-head">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em]">
              <th scope="col" className="px-5 py-3">Phản ánh</th>
              <th scope="col" className="px-4 py-3">Danh mục AI</th>
              <th scope="col" className="px-4 py-3">Khu vực</th>
              <th scope="col" className="px-4 py-3">Tín hiệu xử lý</th>
              <th scope="col" className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="admin-table-body divide-y divide-slate-100 dark:divide-slate-800">
            {reports.map((report) => {
              const feedbackId = report?.feedbackId || report?.id;
              return (
                <tr key={feedbackId} className="admin-table-row align-top">
                  <th scope="row" className="px-5 py-4 text-left font-normal">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
                      {formatReportCode(feedbackId)}
                    </p>
                    <p className="mt-1.5 line-clamp-1 text-sm font-bold text-slate-950 dark:text-white">
                      {report?.title || MISSING_VALUE}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                      {report?.summary || MISSING_VALUE}
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Người gửi: {report?.reporterName || report?.userName || MISSING_VALUE}
                    </p>
                  </th>
                  <td className="px-4 py-4 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">
                    {getCategoryLabel(getAiCategoryName(report))}
                  </td>
                  <td className="px-4 py-4">
                    <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">
                      {report?.areaName || report?.locationText || MISSING_VALUE}
                    </p>
                    <time className="mt-2 block text-xs text-slate-500 dark:text-slate-400" dateTime={report?.createdAt || undefined}>
                      {formatReviewDateTime(report?.createdAt)}
                    </time>
                  </td>
                  <td className="px-4 py-4"><ReviewBadges report={report} /></td>
                  <td className="px-5 py-4 text-right"><ReportReviewLink report={report} from={from} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QueuePagination({ pagination, pageSize, loading, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, pagination?.totalPages || 0);
  const pageNumber = Math.max(1, pagination?.pageNumber || 1);
  return (
    <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
        {pagination?.totalItems > 0
          ? <>Trang <strong className="text-slate-800 dark:text-slate-200">{pageNumber}</strong> / {totalPages}, {pagination.totalItems.toLocaleString('vi-VN')} phản ánh</>
          : 'Không có dữ liệu'}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="manager-review-page-size" className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Số dòng
          <Select
            id="manager-review-page-size"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 w-20 py-1"
          >
            {PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
        </label>
        <nav className="flex gap-2" aria-label="Phân trang hàng chờ xác nhận phản ánh">
          <Button type="button" variant="outline" size="sm" disabled={loading || !pagination?.hasPreviousPage} onClick={() => onPageChange(pageNumber - 1)}>
            <Lucide.ChevronLeft size={16} aria-hidden="true" />
            Trước
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={loading || !pagination?.hasNextPage} onClick={() => onPageChange(pageNumber + 1)}>
            Sau
            <Lucide.ChevronRight size={16} aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </footer>
  );
}

export function ManagerReportReviewQueuePage() {
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [draftSearch, setDraftSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', categoryId: '' });
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [state, setState] = useState(QUEUE_STATE.LOADING);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      try {
        const response = await toolsApi.getCategories();
        if (active) setCategories(Array.isArray(response) ? response : []);
      } catch {
        if (active) setCategories([]);
      } finally {
        if (active) setCategoriesLoading(false);
      }
    };
    void loadCategories();
    return () => { active = false; };
  }, []);

  const loadQueue = useCallback(async () => {
    setState(QUEUE_STATE.LOADING);
    try {
      const response = await managementFeedbackApi.getAiReviewedFeedbackPage({
        pageNumber,
        pageSize,
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
      });
      setReports(response.items);
      setPagination(response);
      setState(response.items.length > 0 ? QUEUE_STATE.READY : QUEUE_STATE.EMPTY);
    } catch (error) {
      setReports([]);
      setState([404, 405].includes(Number(error?.status ?? error?.response?.status))
        ? QUEUE_STATE.API_UNAVAILABLE
        : QUEUE_STATE.ERROR);
    }
  }, [filters.categoryId, filters.search, pageNumber, pageSize]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue, refreshKey]);

  const hasActiveFilters = Boolean(filters.search || filters.categoryId);
  const currentPath = `${location.pathname}${location.search}`;

  const handleSearch = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: draftSearch.trim() }));
    setPageNumber(1);
  };

  const handleReset = () => {
    setDraftSearch('');
    setFilters({ search: '', categoryId: '' });
    setPageNumber(1);
  };

  const categoryOptions = useMemo(() => categories.map((category) => ({
    id: category?.categoryId ?? category?.id,
    label: getCategoryLabel(category?.categoryName || category?.name),
  })).filter((category) => category.id !== null && category.id !== undefined), [categories]);

  return (
    <article className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Hàng chờ xác nhận phản ánh"
        description="Kiểm tra các phản ánh đã được AI phân tích trước khi xác nhận và đưa vào quy trình xử lý sự vụ."
        icon={Lucide.ClipboardCheck}
        statusLabel="Đang chờ"
        statusValue={state === QUEUE_STATE.LOADING ? 'Đang tải' : `${pagination.totalItems.toLocaleString('vi-VN')} phản ánh`}
        statusTone="review"
      />

      <section className="admin-panel overflow-hidden" aria-labelledby="manager-review-filters-title">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <h2 id="manager-review-filters-title" className="admin-section-title">Bộ lọc hàng chờ</h2>
          <p className="admin-section-description mt-1">Tìm theo nội dung hoặc thu hẹp theo danh mục mà backend hỗ trợ.</p>
        </header>
        <form onSubmit={handleSearch} className="px-5 py-5 sm:px-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_auto] md:items-end">
            <FilterField label="Tìm kiếm" htmlFor="manager-report-review-search">
              <div className="relative">
                <Lucide.Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  id="manager-report-review-search"
                  type="search"
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  placeholder="Tìm theo mã, tiêu đề hoặc nội dung"
                  className="h-11 pl-10"
                />
              </div>
            </FilterField>

            <FilterField label="Danh mục" htmlFor="manager-report-review-category">
              <Select
                id="manager-report-review-category"
                value={filters.categoryId}
                disabled={categoriesLoading || categoryOptions.length === 0}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, categoryId: event.target.value }));
                  setPageNumber(1);
                }}
                className="h-11"
              >
                <option value="">{categoriesLoading ? 'Đang tải danh mục' : categoryOptions.length === 0 ? 'Chưa có dữ liệu danh mục' : 'Tất cả danh mục'}</option>
                {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </Select>
            </FilterField>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={!hasActiveFilters && !draftSearch}>
                <Lucide.RotateCcw size={16} aria-hidden="true" />
                Xóa lọc
              </Button>
              <Button type="submit" size="sm">
                <Lucide.Search size={16} aria-hidden="true" />
                Tìm kiếm
              </Button>
            </div>
          </div>
        </form>
      </section>

      {state === QUEUE_STATE.LOADING && reports.length === 0 ? <QueueSkeleton /> : null}

      {state === QUEUE_STATE.READY || (state === QUEUE_STATE.LOADING && reports.length > 0) ? (
        <section className={state === QUEUE_STATE.LOADING ? 'pointer-events-none opacity-60' : ''} aria-busy={state === QUEUE_STATE.LOADING}>
          <ReviewQueueList reports={reports} from={currentPath} />
          <QueuePagination
            pagination={pagination}
            pageSize={pageSize}
            loading={state === QUEUE_STATE.LOADING}
            onPageChange={setPageNumber}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPageNumber(1);
            }}
          />
        </section>
      ) : null}

      {[QUEUE_STATE.EMPTY, QUEUE_STATE.ERROR, QUEUE_STATE.API_UNAVAILABLE].includes(state) ? (
        <section aria-live="polite">
          <QueueEmptyState
            state={state}
            hasActiveFilters={hasActiveFilters}
            onRetry={() => setRefreshKey((current) => current + 1)}
          />
        </section>
      ) : null}
    </article>
  );
}

export default ManagerReportReviewQueuePage;
