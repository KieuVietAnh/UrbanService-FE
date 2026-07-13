import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { managementTypes, PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import {
  ManagerEmptyState,
  ManagerMetricCard,
  ManagerPageHeader,
  ManagerSectionHeader,
} from '../../components/manager/ManagerPageElements';

const priorityLabels = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
  Critical: 'Khẩn cấp',
};

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

const getWaitingTime = (value) => {
  if (!value) return 'Chưa xác định';
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return 'Chưa xác định';
  const hours = Math.max(0, Math.floor((Date.now() - createdAt) / 36e5));
  if (hours < 1) return 'Dưới 1 giờ';
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
};

export const InteractionApprovalInboxPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const loadItems = useCallback(async (
    requestedPage = pageIndex,
    requestedPageSize = pageSize,
    requestedSearch = search
  ) => {
    setLoading(true);
    setError('');
    try {
      const response = await managementFeedbackApi.getFeedbacks({
        pageIndex: requestedPage,
        pageSize: requestedPageSize,
        status: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
        search: requestedSearch || undefined,
      });
      const list = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
      setItems(list);
      setTotalCount(Number(response?.totalItems ?? response?.totalCount ?? response?.total ?? list.length ?? 0));
    } catch (err) {
      console.error('Failed to load approval inbox', err);
      setError(err?.message || 'Không thể tải hàng đợi duyệt.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, search]);

  useEffect(() => {
    loadItems();
  }, [loadItems, location.state?.refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const highPriorityCount = useMemo(() => items.filter((item) => ['High', 'Critical'].includes(item?.priority)).length, [items]);
  const oldestItem = useMemo(() => (
    [...items].sort((a, b) => new Date(a?.updatedAt || a?.createdAt || 0) - new Date(b?.updatedAt || b?.createdAt || 0))[0] || null
  ), [items]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPageIndex(0);
    loadItems(0, pageSize, search);
  };

  const handlePageSizeChange = (event) => {
    const nextPageSize = Number(event.target.value);
    setPageIndex(0);
    setPageSize(nextPageSize);
  };

  if (loading && items.length === 0) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải hàng đợi duyệt">
        <header className="admin-page-hero animate-pulse">
          <span className="block h-5 w-40 rounded-full bg-slate-100" />
          <span className="mt-4 block h-9 w-2/3 rounded-2xl bg-slate-100" />
          <span className="mt-3 block h-4 w-1/2 rounded-full bg-slate-100" />
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="admin-stat-card h-28 animate-pulse" />
          ))}
        </section>
        <section className="admin-panel h-96 animate-pulse" />
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-6">
      <ManagerPageHeader
        title="Hàng đợi duyệt kết quả"
        description="Kiểm tra kết quả xử lý, bằng chứng hoàn thành và lịch sử phối hợp trước khi phê duyệt hoặc yêu cầu làm lại."
        icon={Lucide.GitPullRequestArrow}
        statusLabel="Đang chờ quyết định"
        statusValue={`${totalCount} phản ánh`}
      />

      <section className="grid gap-4 md:grid-cols-3" aria-label="Tóm tắt hàng đợi duyệt">
        <ManagerMetricCard
          label="Chờ duyệt"
          value={totalCount}
          description="Tổng phản ánh cần quyết định."
          icon={Lucide.Inbox}
          toneClass="bg-blue-50 text-blue-700"
        />
        <ManagerMetricCard
          label="Ưu tiên cao"
          value={highPriorityCount}
          description="Phản ánh mức High hoặc Critical trên trang hiện tại."
          icon={Lucide.TriangleAlert}
          toneClass="bg-amber-50 text-amber-700"
        />
        <ManagerMetricCard
          label="Chờ lâu nhất"
          value={oldestItem ? getWaitingTime(oldestItem.updatedAt || oldestItem.createdAt) : '—'}
          description="Thời gian chờ của hồ sơ cũ nhất đang hiển thị."
          icon={Lucide.Clock3}
          toneClass="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section className="admin-panel overflow-hidden" aria-labelledby="approval-queue-title">
        <ManagerSectionHeader
          id="approval-queue-title"
          title="Danh sách cần duyệt"
          description="Ưu tiên hồ sơ khẩn cấp, hồ sơ chờ lâu và trường hợp có nhiều lần gửi lại kết quả."
          icon={Lucide.ListChecks}
          actions={(
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center" role="search" onSubmit={handleSearchSubmit}>
              <label className="input input-bordered flex h-11 min-w-[260px] items-center gap-2 rounded-2xl bg-white text-sm">
                <Lucide.Search size={16} className="text-slate-400" aria-hidden="true" />
                <span className="sr-only">Tìm kiếm phản ánh</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="grow"
                  placeholder="Tìm mã, tiêu đề, địa điểm..."
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-500">
                <span>Số dòng</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="select select-bordered h-11 rounded-2xl text-sm"
                  aria-label="Số dòng mỗi trang"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </form>
          )}
        />

        {error ? (
          <aside className="px-5 pt-5 sm:px-6" aria-live="polite">
            <ErrorAlert title="Lỗi tải hàng đợi" message={error} onClose={() => setError('')} />
          </aside>
        ) : null}

        {items.length === 0 ? (
          <ManagerEmptyState
            icon={Lucide.BadgeCheck}
            title="Không có phản ánh đang chờ duyệt"
            description="Khi System Staff gửi kết quả xử lý, hồ sơ sẽ xuất hiện tại đây để Interaction Manager đánh giá."
          />
        ) : (
          <section className="admin-table-wrap m-5 overflow-hidden sm:m-6">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <caption className="sr-only">Danh sách phản ánh đang chờ Interaction Manager duyệt</caption>
                <thead className="admin-table-head">
                  <tr className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                    <th scope="col">Phản ánh</th>
                    <th scope="col">Phân loại</th>
                    <th scope="col">Mức ưu tiên</th>
                    <th scope="col">Thời gian chờ</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col" className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="admin-table-body divide-y divide-slate-100">
                  {items.map((item) => {
                    const feedbackId = item.feedbackId || item.id;
                    const createdAt = item.updatedAt || item.createdAt;
                    return (
                      <tr key={feedbackId} className="admin-table-row align-top">
                        <th scope="row" className="min-w-[280px] font-normal">
                          <article>
                            <header className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-blue-700">{feedbackId}</span>
                              <time className="text-[11px] text-slate-400" dateTime={createdAt || undefined}>{formatDateTime(createdAt)}</time>
                            </header>
                            <h3 className="mt-2 text-sm font-semibold text-slate-950">{item.title || 'Không có tiêu đề'}</h3>
                            <address className="mt-1 flex items-center gap-1.5 not-italic text-xs text-slate-500">
                              <Lucide.MapPin size={13} aria-hidden="true" />
                              {item.locationText || item.areaName || 'Chưa có vị trí'}
                            </address>
                          </article>
                        </th>
                        <td>
                          <span className="text-sm font-medium text-slate-700">{item.categoryName || 'Chưa phân loại'}</span>
                        </td>
                        <td>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_BADGE_CLASSES[item.priority] || PRIORITY_BADGE_CLASSES.Medium}`}>
                            {priorityLabels[item.priority] || item.priority || 'Trung bình'}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Lucide.Clock3 size={14} className="text-slate-400" aria-hidden="true" />
                            {getWaitingTime(createdAt)}
                          </span>
                        </td>
                        <td>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[item.status] || STATUS_BADGE_CLASSES.SubmittedForApproval}`}>
                            Chờ duyệt
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/manager/approvals/${feedbackId}`)}
                            className="btn btn-sm admin-primary-action rounded-xl"
                            aria-label={`Xem và duyệt phản ánh ${item.title || feedbackId}`}
                          >
                            <Lucide.FileSearch size={15} aria-hidden="true" />
                            Xem hồ sơ
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

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-slate-500">
            Trang <strong className="text-slate-800">{totalCount === 0 ? 0 : pageIndex + 1}</strong> / {totalCount === 0 ? 0 : totalPages} · {totalCount} hồ sơ
          </p>
          <nav className="flex items-center gap-2" aria-label="Phân trang hàng đợi duyệt">
            <button
              type="button"
              className="btn btn-sm admin-secondary-action rounded-xl"
              disabled={pageIndex === 0 || loading}
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            >
              <Lucide.ChevronLeft size={15} aria-hidden="true" />
              Trước
            </button>
            <button
              type="button"
              className="btn btn-sm admin-secondary-action rounded-xl"
              disabled={pageIndex >= totalPages - 1 || loading || totalCount === 0}
              onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
            >
              Sau
              <Lucide.ChevronRight size={15} aria-hidden="true" />
            </button>
          </nav>
        </footer>
      </section>
    </article>
  );
};
