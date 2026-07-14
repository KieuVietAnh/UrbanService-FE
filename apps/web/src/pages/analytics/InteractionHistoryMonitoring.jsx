import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ManagerSectionHeader,
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

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
  }, [debouncedSearch, pageNumber, pageSize, statusFilter]);

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
        className="admin-panel overflow-visible"
        aria-labelledby="interaction-list-title"
        aria-busy={loading}
      >
        <ManagerSectionHeader
          id="interaction-list-title"
          title="Dòng phản ánh toàn hệ thống"
          description="Tìm kiếm, lọc trạng thái và mức ưu tiên để theo dõi hồ sơ."
          icon={Lucide.ListTree}
          actions={(
            <form
              className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label
                className="relative block w-full sm:w-[260px]"
                htmlFor="interaction-search"
              >
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
                  className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
                  placeholder="Tìm mã, tiêu đề, khu vực"
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
                widthClass="sm:w-[175px]"
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
                widthClass="sm:w-[190px]"
              />
            </form>
          )}
        />

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
          <ManagerEmptyState
            icon={Lucide.SearchX}
            title="Không có phản ánh phù hợp"
            description="Hãy thay đổi từ khóa, trạng thái hoặc mức ưu tiên."
          />
        ) : (
          <section
            className={`admin-table-wrap m-5 overflow-hidden transition-opacity sm:m-6 ${
              loading
                ? 'pointer-events-none opacity-60'
                : 'opacity-100'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="table w-full">
                <caption className="sr-only">
                  Danh sách phản ánh và trạng thái tương tác trong hệ thống
                </caption>

                <thead className="admin-table-head">
                  <tr className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                    <th scope="col">Phản ánh</th>
                    <th scope="col">Phân loại</th>
                    <th scope="col">Tương tác</th>
                    <th scope="col">Ưu tiên</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Cập nhật</th>
                    <th scope="col" className="text-right">Theo dõi</th>
                  </tr>
                </thead>

                <tbody className="admin-table-body divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleTickets.map((ticket) => {
                    const feedbackId = ticket.feedbackId || ticket.id;
                    const updatedAt = ticket.updatedAt || ticket.createdAt;

                    return (
                      <tr
                        key={feedbackId}
                        className="admin-table-row align-top"
                      >
                        <th
                          scope="row"
                          className="min-w-[320px] font-normal"
                        >
                          <article>
                            <span className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                              {feedbackId}
                            </span>

                            <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
                              {ticket.title || 'Không có tiêu đề'}
                            </h3>

                            <address className="mt-1 flex items-center gap-1.5 not-italic text-xs text-slate-500 dark:text-slate-400">
                              <Lucide.MapPin size={13} aria-hidden="true" />
                              {ticket.locationText ||
                                ticket.areaName ||
                                'Chưa có vị trí'}
                            </address>
                          </article>
                        </th>

                        <td>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {ticket.categoryName || 'Chưa phân loại'}
                          </span>
                        </td>

                        <td>
                          <dl className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Lucide.MessageCircle
                                size={14}
                                aria-hidden="true"
                              />
                              <dt className="sr-only">Bình luận</dt>
                              <dd>{ticket.commentCount || 0}</dd>
                            </div>

                            <div className="flex items-center gap-1">
                              <Lucide.ThumbsUp
                                size={14}
                                aria-hidden="true"
                              />
                              <dt className="sr-only">Đồng tình</dt>
                              <dd>{ticket.supportCount || 0}</dd>
                            </div>
                          </dl>
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
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              STATUS_BADGE_CLASSES[ticket.status] ||
                              STATUS_BADGE_CLASSES.Submitted
                            }`}
                          >
                            {getStatusLabel(ticket.status)}
                          </span>
                        </td>

                        <td>
                          <time
                            className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400"
                            dateTime={updatedAt || undefined}
                          >
                            {formatDateTime(updatedAt)}
                          </time>
                        </td>

                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/manager/interactions/${feedbackId}`
                              )
                            }
                            className="btn btn-sm admin-secondary-action rounded-xl"
                            aria-label={`Mở chi tiết phản ánh ${
                              ticket.title || feedbackId
                            }`}
                          >
                            <Lucide.Eye size={15} aria-hidden="true" />
                            Mở chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400">
            {pagination.totalItems === 0 ? (
              'Không có dữ liệu'
            ) : (
              <>
                Trang{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {pageNumber}
                </strong>{' '}
                / {pagination.totalPages} · {pagination.totalItems} phản ánh
                {priorityFilter !== 'all'
                  ? ` · ${visibleTickets.length} hồ sơ khớp ưu tiên trên trang`
                  : ''}
              </>
            )}
          </p>

          <section
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
            aria-label="Điều khiển phân trang"
          >
            <label
              className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"
              htmlFor="interaction-page-size"
            >
              <span>Số dòng</span>

              <select
                id="interaction-page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <nav
              className="flex items-center gap-2"
              aria-label="Phân trang danh sách phản ánh"
            >
              <button
                type="button"
                className="btn btn-sm admin-secondary-action rounded-xl"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() =>
                  setPageNumber((current) => Math.max(1, current - 1))
                }
              >
                <Lucide.ChevronLeft size={15} aria-hidden="true" />
                Trước
              </button>

              <button
                type="button"
                className="btn btn-sm admin-secondary-action rounded-xl"
                disabled={!pagination.hasNextPage || loading}
                onClick={() =>
                  setPageNumber((current) => current + 1)
                }
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
