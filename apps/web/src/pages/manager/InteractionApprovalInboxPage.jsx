import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { managementTypes, PRIORITY_BADGE_CLASSES } from '@urbanmind/shared-types';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import {
  ManagerEmptyState,
  ManagerMetricCard,
  ManagerPageHeader,
} from '../../components/manager/ManagerPageElements';

const priorityLabels = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
  Critical: 'Khẩn cấp',
};

const pageSizeOptions = [5, 10, 20, 50];

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
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPageIndex(0);
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await managementFeedbackApi.getFeedbacks({
        pageIndex,
        pageSize,
        status: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
        search: debouncedSearch || undefined,
      });
      const list = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response)
          ? response
          : [];

      setItems(list);
      setTotalCount(Number(response?.totalItems ?? response?.totalCount ?? response?.total ?? list.length ?? 0));
    } catch (err) {
      console.error('Failed to load approval inbox', err);
      setError(err?.message || 'Không thể tải hàng đợi duyệt.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [debouncedSearch, pageIndex, pageSize]);

  useEffect(() => {
    loadItems();
  }, [loadItems, location.state?.refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const highPriorityCount = useMemo(
    () => items.filter((item) => ['High', 'Critical'].includes(item?.priority)).length,
    [items]
  );
  const oldestItem = useMemo(
    () => [...items].sort((a, b) => new Date(a?.updatedAt || a?.createdAt || 0) - new Date(b?.updatedAt || b?.createdAt || 0))[0] || null,
    [items]
  );

  const handlePageSizeChange = (event) => {
    setPageIndex(0);
    setPageSize(Number(event.target.value));
  };

  if (!hasLoaded && loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải hàng đợi duyệt">
        <header className="admin-page-hero h-44 animate-pulse" />
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
        <header className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Lucide.ListChecks size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="approval-queue-title" className="text-xl font-bold text-slate-950 dark:text-slate-100">
                  Danh sách cần duyệt
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Hiển thị {items.length} trên tổng số {totalCount} phản ánh đang chờ quyết định.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
              <label className="relative block w-full sm:w-[300px]" htmlFor="approval-search">
                <span className="sr-only">Tìm phản ánh</span>
                <Lucide.Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="approval-search"
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
            </div>
          </div>
        </header>

        {error ? (
          <aside className="px-5 pt-5 sm:px-6" aria-live="polite">
            <ErrorAlert title="Lỗi tải hàng đợi" message={error} onClose={() => setError('')} />
          </aside>
        ) : null}

        {items.length === 0 ? (
          <div className="p-6">
            <ManagerEmptyState
              icon={Lucide.BadgeCheck}
              title="Không có phản ánh đang chờ duyệt"
              description="Khi System Staff gửi kết quả xử lý, hồ sơ sẽ xuất hiện tại đây để Interaction Manager đánh giá."
            />
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-60' : 'opacity-100'}`}>
            <table className="table table-fixed w-full">
              <caption className="sr-only">Danh sách phản ánh đang chờ Interaction Manager duyệt</caption>
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[31%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="admin-table-head">
                <tr className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                  <th scope="col">Mã</th>
                  <th scope="col">Nội dung</th>
                  <th scope="col">Danh mục</th>
                  <th scope="col">Ưu tiên</th>
                  <th scope="col">Thời gian chờ</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col" className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="admin-table-body divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const feedbackId = item.feedbackId || item.id;
                  const createdAt = item.updatedAt || item.createdAt;
                  return (
                    <tr key={feedbackId} className="admin-table-row align-middle">
                      <th scope="row" className="font-normal">
                        <button
                          type="button"
                          onClick={() => navigate(`/manager/approvals/${feedbackId}`)}
                          className="text-left text-sm font-bold text-blue-600 transition hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          title={feedbackId}
                        >
                          {formatFeedbackCode(feedbackId)}
                        </button>
                      </th>

                      <td className="min-w-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                            {item.title || 'Không có tiêu đề'}
                          </p>
                          <p
                            className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
                            title={item.locationText || item.areaName || 'Chưa có vị trí'}
                          >
                            <Lucide.MapPin size={13} className="shrink-0" aria-hidden="true" />
                            <span className="min-w-0 truncate">
                              {item.locationText || item.areaName || 'Chưa có vị trí'}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td>
                        <span className="block line-clamp-2 text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">
                          {item.categoryName || 'Chưa phân loại'}
                        </span>
                      </td>

                      <td>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_BADGE_CLASSES[item.priority] || PRIORITY_BADGE_CLASSES.Medium}`}>
                          {priorityLabels[item.priority] || item.priority || 'Trung bình'}
                        </span>
                      </td>

                      <td>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">
                          <Lucide.Clock3 size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                          {getWaitingTime(createdAt)}
                        </span>
                      </td>

                      <td>
                        <time className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400" dateTime={createdAt || undefined}>
                          {formatDateTime(createdAt)}
                        </time>
                      </td>

                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/manager/approvals/${feedbackId}`)}
                          className="inline-flex items-center justify-end gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          aria-label={`Mở chi tiết phản ánh ${item.title || feedbackId}`}
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
            {totalCount === 0 ? (
              'Không có dữ liệu'
            ) : (
              <>
                Trang <strong className="text-slate-800 dark:text-slate-200">{pageIndex + 1}</strong> / {totalPages}
                {' · '}{totalCount} phản ánh
              </>
            )}
          </p>

          <section className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-label="Điều khiển phân trang">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="approval-page-size">
              <span>Số dòng</span>
              <select
                id="approval-page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="select select-bordered h-9 min-h-0 rounded-xl text-sm"
                aria-label="Số dòng mỗi trang"
              >
                {pageSizeOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

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
          </section>
        </footer>
      </section>
    </article>
  );
};
