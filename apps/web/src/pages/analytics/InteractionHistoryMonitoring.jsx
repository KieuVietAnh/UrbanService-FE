import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { getStatusLabel, managementTypes, PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import {
  ManagerEmptyState,
  ManagerMetricCard,
  ManagerPageHeader,
  ManagerSectionHeader,
} from '../../components/manager/ManagerPageElements';

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: managementTypes.feedbackStatus.VERIFIED, label: 'Đã xác minh' },
  { value: managementTypes.feedbackStatus.ASSIGNED, label: 'Đã phân công' },
  { value: managementTypes.feedbackStatus.IN_PROGRESS, label: 'Đang xử lý' },
  { value: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL, label: 'Chờ duyệt' },
  { value: managementTypes.feedbackStatus.NEED_REWORK, label: 'Cần làm lại' },
  { value: managementTypes.feedbackStatus.APPROVED, label: 'Đã duyệt' },
  { value: managementTypes.feedbackStatus.CLOSED, label: 'Đã đóng' },
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

export const InteractionHistoryMonitoring = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
      const totalPages = Number(response?.totalPages ?? (totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0));

      setTickets(items);
      setPagination({
        totalItems,
        totalPages,
        hasPreviousPage: Boolean(response?.hasPreviousPage ?? pageNumber > 1),
        hasNextPage: Boolean(response?.hasNextPage ?? pageNumber < totalPages),
      });
    } catch (err) {
      console.error('Failed to load interaction monitoring data', err);
      setError(err?.message || 'Không thể tải dữ liệu tương tác.');
      setTickets([]);
      setPagination({ totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [debouncedSearch, pageNumber, pageSize, statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const pageSummary = useMemo(() => {
    const interactions = tickets.reduce((sum, ticket) => (
      sum + Number(ticket.commentCount || 0) + Number(ticket.supportCount || 0)
    ), 0);
    const highPriority = tickets.filter((ticket) => ['High', 'Critical'].includes(ticket.priority)).length;
    const waitingApproval = tickets.filter((ticket) => (
      ticket.status === managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL
    )).length;

    return {
      interactions,
      highPriority,
      waitingApproval,
    };
  }, [tickets]);

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPageNumber(1);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setPageNumber(1);
  };

  if (!hasLoaded && loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải dữ liệu giám sát">
        <header className="admin-page-hero h-44 animate-pulse" />
        <section className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <article key={index} className="admin-stat-card h-28 animate-pulse" />)}
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
          <button type="button" onClick={loadTickets} className="btn admin-secondary-action rounded-2xl" disabled={loading}>
            <Lucide.RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            Làm mới
          </button>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tóm tắt dữ liệu đang xem">
        <ManagerMetricCard
          label="Kết quả phù hợp"
          value={pagination.totalItems}
          description="Tổng phản ánh khớp bộ lọc hiện tại."
          icon={Lucide.Files}
          toneClass="bg-blue-50 text-blue-700"
        />
        <ManagerMetricCard
          label="Đang hiển thị"
          value={tickets.length}
          description={`Số hồ sơ trên trang ${pagination.totalItems > 0 ? pageNumber : 0}.`}
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

      <section className="admin-panel overflow-hidden" aria-labelledby="interaction-list-title" aria-busy={loading}>
        <ManagerSectionHeader
          id="interaction-list-title"
          title="Dòng phản ánh toàn hệ thống"
          description="Tìm kiếm và lọc được xử lý trên máy chủ để danh sách vẫn nhanh khi dữ liệu tăng."
          icon={Lucide.ListTree}
          actions={(
            <form
              className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="relative block w-full sm:w-[300px]" htmlFor="interaction-search">
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

              <label className="relative block w-full sm:w-[190px]" htmlFor="interaction-status-filter">
                <span className="sr-only">Lọc trạng thái</span>
                <Lucide.ListFilter
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <select
                  id="interaction-status-filter"
                  value={statusFilter}
                  onChange={handleStatusChange}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <Lucide.ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </label>
            </form>
          )}
        />

        {error ? (
          <aside className="px-5 pt-5 sm:px-6" aria-live="polite">
            <ErrorAlert title="Lỗi tải dữ liệu" message={error} onClose={() => setError('')} />
          </aside>
        ) : null}

        {tickets.length === 0 ? (
          <ManagerEmptyState
            icon={Lucide.SearchX}
            title="Không có phản ánh phù hợp"
            description="Hãy đổi từ khóa hoặc trạng thái để mở rộng phạm vi tìm kiếm."
          />
        ) : (
          <section className={`admin-table-wrap m-5 overflow-hidden transition-opacity sm:m-6 ${loading ? 'pointer-events-none opacity-60' : 'opacity-100'}`}>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <caption className="sr-only">Danh sách phản ánh và trạng thái tương tác trong hệ thống</caption>
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
                <tbody className="admin-table-body divide-y divide-slate-100">
                  {tickets.map((ticket) => {
                    const feedbackId = ticket.feedbackId || ticket.id;
                    const updatedAt = ticket.updatedAt || ticket.createdAt;
                    return (
                      <tr key={feedbackId} className="admin-table-row align-top">
                        <th scope="row" className="min-w-[320px] font-normal">
                          <article>
                            <span className="font-mono text-[11px] font-semibold text-blue-700">{feedbackId}</span>
                            <h3 className="mt-2 text-sm font-semibold text-slate-950">{ticket.title || 'Không có tiêu đề'}</h3>
                            <address className="mt-1 flex items-center gap-1.5 not-italic text-xs text-slate-500">
                              <Lucide.MapPin size={13} aria-hidden="true" />
                              {ticket.locationText || ticket.areaName || 'Chưa có vị trí'}
                            </address>
                          </article>
                        </th>
                        <td>
                          <span className="text-sm font-medium text-slate-700">{ticket.categoryName || 'Chưa phân loại'}</span>
                        </td>
                        <td>
                          <dl className="flex gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Lucide.MessageCircle size={14} aria-hidden="true" />
                              <dt className="sr-only">Bình luận</dt>
                              <dd>{ticket.commentCount || 0}</dd>
                            </div>
                            <div className="flex items-center gap-1">
                              <Lucide.ThumbsUp size={14} aria-hidden="true" />
                              <dt className="sr-only">Đồng tình</dt>
                              <dd>{ticket.supportCount || 0}</dd>
                            </div>
                          </dl>
                        </td>
                        <td>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_BADGE_CLASSES[ticket.priority] || PRIORITY_BADGE_CLASSES.Medium}`}>
                            {ticket.priority || 'Medium'}
                          </span>
                        </td>
                        <td>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[ticket.status] || STATUS_BADGE_CLASSES.Submitted}`}>
                            {getStatusLabel(ticket.status)}
                          </span>
                        </td>
                        <td>
                          <time className="whitespace-nowrap text-xs text-slate-500" dateTime={updatedAt || undefined}>
                            {formatDateTime(updatedAt)}
                          </time>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/manager/interactions/${feedbackId}`)}
                            className="btn btn-sm admin-secondary-action rounded-xl"
                            aria-label={`Mở chi tiết phản ánh ${ticket.title || feedbackId}`}
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
          <p className="text-slate-500">
            {pagination.totalItems === 0 ? (
              'Không có dữ liệu'
            ) : (
              <>
                Trang <strong className="text-slate-800 dark:text-slate-200">{pageNumber}</strong> / {pagination.totalPages} · {pagination.totalItems} phản ánh
              </>
            )}
          </p>

          <section className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-label="Điều khiển phân trang">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500" htmlFor="interaction-page-size">
              <span>Số dòng</span>
              <select
                id="interaction-page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
              >
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
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
