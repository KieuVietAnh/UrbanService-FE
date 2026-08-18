import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import {
  getStatusLabel,
  managementTypes,
  PRIORITY_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
} from '@urbanmind/shared-types';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import {
  ManagerEmptyState,
  ManagerMetricCard,
  ManagerPageHeader,
} from '../../components/manager/ManagerPageElements';

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: managementTypes.feedbackStatus.SUBMITTED, label: 'Đã gửi' },
  { value: managementTypes.feedbackStatus.AI_REVIEWED, label: 'Đã được AI xem xét' },
  { value: managementTypes.feedbackStatus.VERIFIED, label: 'Đã xác minh' },
  { value: managementTypes.feedbackStatus.ASSIGNED, label: 'Đã phân công' },
  { value: managementTypes.feedbackStatus.IN_PROGRESS, label: 'Đang xử lý' },
  {
    value: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
    label: 'Chờ duyệt',
  },
  { value: managementTypes.feedbackStatus.NEED_REWORK, label: 'Cần làm lại' },
  { value: managementTypes.feedbackStatus.APPROVED, label: 'Đã duyệt' },
  { value: managementTypes.feedbackStatus.REJECTED, label: 'Bị từ chối' },
  { value: managementTypes.feedbackStatus.CLOSED, label: 'Đã đóng' },
  { value: managementTypes.feedbackStatus.CANCELLED, label: 'Đã hủy' },
];

const priorityOptions = [
  { value: 'all', label: 'Tất cả ưu tiên' },
  { value: 'Critical', label: 'Khẩn cấp' },
  { value: 'High', label: 'Cao' },
  { value: 'Medium', label: 'Trung bình' },
  { value: 'Low', label: 'Thấp' },
];

const pageSizeOptions = [10, 20, 50];

const formatDateTime = (value) => {
  if (!value) return 'Chưa có dữ liệu';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatFeedbackCode = (value) => {
  const compact = String(value || '').replace(/-/g, '').toUpperCase();
  return compact ? `UM-${compact.slice(0, 8)}` : 'UM-UNKNOWN';
};

const FilterDropdown = ({
  value,
  options,
  onChange,
  icon: Icon,
  ariaLabel,
  widthClass = 'sm:w-[190px]',
}) => {
  const selectedOption =
    options.find((option) => option.value === value) || options[0];

  return (
    <details className={`group relative w-full ${widthClass}`}>
      <summary
        className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        aria-label={ariaLabel}
      >
        <Icon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />

        <span className="min-w-0 flex-1 truncate text-left">
          {selectedOption.label}
        </span>

        <Lucide.ChevronDown
          size={15}
          className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <menu className="absolute right-0 z-[80] mt-2 w-full min-w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={(event) => {
                  onChange(option.value);
                  event.currentTarget.closest('details')?.removeAttribute('open');
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{option.label}</span>

                {isSelected ? (
                  <Lucide.Check size={15} className="shrink-0" aria-hidden="true" />
                ) : null}
              </button>
            </li>
          );
        })}
      </menu>
    </details>
  );
};

export const InteractionHistoryMonitoring = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFilter = searchParams.get('categoryId') || '';
  const categoryNameFilter = searchParams.get('categoryName') || '';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPageNumber(1);
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        pageNumber,
        pageSize,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryIdFilter) params.categoryId = categoryIdFilter;

      const response = await managementFeedbackApi.getFeedbacks(params);

      const items = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response)
          ? response
          : [];

      const totalItems = Number(response?.totalItems ?? items.length);
      const totalPages = Number(
        response?.totalPages ??
          (totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0)
      );

      setTickets(items);
      setPagination({
        totalItems,
        totalPages,
        hasPreviousPage: Boolean(
          response?.hasPreviousPage ?? pageNumber > 1
        ),
        hasNextPage: Boolean(
          response?.hasNextPage ?? pageNumber < totalPages
        ),
      });
    } catch (err) {
      console.error('Failed to load interaction monitoring data', err);
      setError(err?.message || 'Không thể tải dữ liệu tương tác.');
      setTickets([]);
      setPagination({
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [categoryIdFilter, debouncedSearch, pageNumber, pageSize, statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const visibleTickets = useMemo(() => {
    if (priorityFilter === 'all') return tickets;

    return tickets.filter(
      (ticket) =>
        String(ticket.priority || '').toLowerCase() ===
        priorityFilter.toLowerCase()
    );
  }, [priorityFilter, tickets]);

  const pageSummary = useMemo(() => {
    const interactions = visibleTickets.reduce(
      (sum, ticket) =>
        sum +
        Number(ticket.commentCount || 0) +
        Number(ticket.supportCount || 0),
      0
    );

    const highPriority = visibleTickets.filter((ticket) =>
      ['High', 'Critical'].includes(ticket.priority)
    ).length;

    const waitingApproval = visibleTickets.filter(
      (ticket) =>
        ticket.status ===
        managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL
    ).length;

    return {
      interactions,
      highPriority,
      waitingApproval,
    };
  }, [visibleTickets]);

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setPageNumber(1);
  };

  if (!hasLoaded && loading) {
    return (
      <article
        className="admin-page-shell space-y-6"
        aria-busy="true"
        aria-label="Đang tải dữ liệu giám sát"
      >
        <header className="admin-page-hero h-44 animate-pulse" />

        <section className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={index}
              className="admin-stat-card h-28 animate-pulse"
            />
          ))}
        </section>

        <section className="admin-panel h-96 animate-pulse" />
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Giám sát luồng tương tác"
        description="Theo dõi luồng xử lý phản ánh và phát hiện điểm nghẽn dịch vụ."
        icon={Lucide.MessagesSquare}
        actions={(
          <button
            type="button"
            onClick={loadTickets}
            className="btn admin-secondary-action rounded-2xl"
            disabled={loading}
          >
            <Lucide.RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            Làm mới
          </button>
        )}
      />

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Tóm tắt dữ liệu đang xem"
      >
        <ManagerMetricCard
          label="Kết quả phù hợp"
          value={pagination.totalItems}
          description="Tổng phản ánh khớp bộ lọc máy chủ."
          icon={Lucide.Files}
          toneClass="bg-blue-50 text-blue-700"
        />

        <ManagerMetricCard
          label="Đang hiển thị"
          value={visibleTickets.length}
          description={`Số hồ sơ sau bộ lọc ưu tiên trên trang ${
            pagination.totalItems > 0 ? pageNumber : 0
          }.`}
          icon={Lucide.Rows3}
          toneClass="bg-emerald-50 text-emerald-700"
        />

        <ManagerMetricCard
          label="Chờ duyệt trên trang"
          value={pageSummary.waitingApproval}
          description="Hồ sơ cần Manager ra quyết định."
          icon={Lucide.BadgeCheck}
          toneClass="bg-amber-50 text-amber-700"
        />

        <ManagerMetricCard
          label="Tương tác trên trang"
          value={pageSummary.interactions}
          description={`${pageSummary.highPriority} hồ sơ ưu tiên cao hoặc khẩn cấp.`}
          icon={Lucide.MessageCircleMore}
          toneClass="bg-cyan-50 text-cyan-700"
        />
      </section>

      <section
        className="admin-panel overflow-hidden"
        aria-labelledby="interaction-list-title"
        aria-busy={loading}
      >
        <header className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <Lucide.ListTree size={18} aria-hidden="true" />
                </span>

                <div className="min-w-0">
                  <h2
                    id="interaction-list-title"
                    className="text-xl font-bold text-slate-950 dark:text-slate-100"
                  >
                    Danh sách phản ánh
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Hiển thị {visibleTickets.length} trên tổng số {pagination.totalItems} phản ánh
                  </p>
                </div>
              </div>

              {categoryIdFilter ? (
                <span className="mt-3 inline-flex h-9 max-w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                  <Lucide.Tags size={15} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Đang lọc: {categoryNameFilter || `Danh mục #${categoryIdFilter}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.delete('categoryId');
                      nextParams.delete('categoryName');
                      setSearchParams(nextParams, { replace: true });
                      setPageNumber(1);
                    }}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-blue-500 transition hover:bg-blue-100 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:hover:bg-blue-900/60"
                    aria-label="Bỏ lọc danh mục"
                    title="Bỏ lọc danh mục"
                  >
                    <Lucide.X size={14} aria-hidden="true" />
                  </button>
                </span>
              ) : null}
            </div>

            <form
              className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[300px_180px_190px]"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="relative block w-full" htmlFor="interaction-search">
                <span className="sr-only">Tìm phản ánh</span>
                <Lucide.Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="interaction-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:ring-blue-500/15"
                  placeholder="Tìm theo mã, nội dung, vị trí..."
                  autoComplete="off"
                  spellCheck="false"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <Lucide.X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </label>

              <FilterDropdown
                value={priorityFilter}
                options={priorityOptions}
                onChange={(value) => {
                  setPriorityFilter(value);
                  setPageNumber(1);
                }}
                icon={Lucide.Flag}
                ariaLabel="Lọc theo mức ưu tiên"
                widthClass="w-full"
              />

              <FilterDropdown
                value={statusFilter}
                options={statusOptions}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPageNumber(1);
                }}
                icon={Lucide.ListFilter}
                ariaLabel="Lọc theo trạng thái"
                widthClass="w-full"
              />
            </form>
          </div>
        </header>

        {error ? (
          <aside className="px-5 pt-5 sm:px-6" aria-live="polite">
            <ErrorAlert
              title="Lỗi tải dữ liệu"
              message={error}
              onClose={() => setError('')}
            />
          </aside>
        ) : null}

        {visibleTickets.length === 0 ? (
          <div className="p-6">
            <ManagerEmptyState
              icon={Lucide.SearchX}
              title="Không có phản ánh phù hợp"
              description="Hãy thay đổi từ khóa, trạng thái hoặc mức ưu tiên."
            />
          </div>
        ) : (
          <div
            className={`transition-opacity ${
              loading ? 'pointer-events-none opacity-60' : 'opacity-100'
            }`}
          >
            <table className="table table-fixed w-full">
              <caption className="sr-only">
                Danh sách phản ánh và trạng thái tương tác trong hệ thống
              </caption>

              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[31%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
              </colgroup>

              <thead className="admin-table-head">
                <tr className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                  <th scope="col">Mã</th>
                  <th scope="col">Nội dung</th>
                  <th scope="col">Danh mục</th>
                  <th scope="col">Ưu tiên</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col" className="text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="admin-table-body divide-y divide-slate-100 dark:divide-slate-800">
                {visibleTickets.map((ticket) => {
                  const feedbackId = ticket.feedbackId || ticket.id;
                  const updatedAt = ticket.updatedAt || ticket.createdAt;

                  return (
                    <tr key={feedbackId} className="admin-table-row align-middle">
                      <th scope="row" className="font-normal">
                        <button
                          type="button"
                          onClick={() => navigate(`/manager/interactions/${feedbackId}`)}
                          className="text-left text-sm font-bold text-blue-600 transition hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          title={feedbackId}
                        >
                          {formatFeedbackCode(feedbackId)}
                        </button>
                      </th>

                      <td className="min-w-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                            {ticket.title || 'Không có tiêu đề'}
                          </p>
                          <p
                            className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
                            title={ticket.locationText || ticket.areaName || 'Chưa có vị trí'}
                          >
                            <Lucide.MapPin size={13} className="shrink-0" aria-hidden="true" />
                            <span className="min-w-0 truncate">
                              {ticket.locationText || ticket.areaName || 'Chưa có vị trí'}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td>
                        <span className="block line-clamp-2 text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">
                          {ticket.categoryName || 'Chưa phân loại'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            PRIORITY_BADGE_CLASSES[ticket.priority] ||
                            PRIORITY_BADGE_CLASSES.Medium
                          }`}
                        >
                          {ticket.priority || 'Medium'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-1 text-center text-[11px] font-semibold leading-4 whitespace-normal ${
                            STATUS_BADGE_CLASSES[ticket.status] ||
                            STATUS_BADGE_CLASSES.Submitted
                          }`}
                        >
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>

                      <td>
                        <time
                          className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400"
                          dateTime={updatedAt || undefined}
                        >
                          {formatDateTime(updatedAt)}
                        </time>
                      </td>

                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/manager/interactions/${feedbackId}`)}
                          className="inline-flex items-center justify-end gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          aria-label={`Mở chi tiết phản ánh ${ticket.title || feedbackId}`}
                        >
                          Chi tiết
                          <Lucide.ChevronRight size={15} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400">
            {pagination.totalItems === 0 ? (
              'Không có dữ liệu'
            ) : (
              <>
                Trang <strong className="text-slate-800 dark:text-slate-200">{pageNumber}</strong> / {pagination.totalPages}
                {' · '}{pagination.totalItems} phản ánh
                {priorityFilter !== 'all'
                  ? ` · ${visibleTickets.length} hồ sơ khớp ưu tiên trên trang`
                  : ''}
              </>
            )}
          </p>

          <section className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-label="Điều khiển phân trang">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="interaction-page-size">
              <span>Số dòng</span>
              <select
                id="interaction-page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>

            <nav className="flex items-center gap-2" aria-label="Phân trang danh sách phản ánh">
              <button
                type="button"
                className="btn btn-sm admin-secondary-action rounded-xl"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
              >
                <Lucide.ChevronLeft size={15} aria-hidden="true" />
                Trước
              </button>
              <button
                type="button"
                className="btn btn-sm admin-secondary-action rounded-xl"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => setPageNumber((current) => current + 1)}
              >
                Sau
                <Lucide.ChevronRight size={15} aria-hidden="true" />
              </button>
            </nav>
          </section>
        </footer>
      </section>
    </article>
  );
};
