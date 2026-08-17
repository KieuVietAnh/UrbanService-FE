import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { duplicateManagementApi } from '@urbanmind/shared-api';
import { SuccessAlert, ErrorAlert } from '../../components/alerts/ErrorAlert';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import * as Lucide from 'lucide-react';
import { ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';
import { normalizeDuplicateCandidatePayload } from './duplicateDetailUtils';

const PAGE_SIZE = 10;
const DUPLICATE_ALL_CACHE_KEY = 'staff-duplicate-all-cache';
const DUPLICATE_CACHE_DIRTY_KEY = 'staff-duplicate-cache-dirty';

const readDuplicateAllCache = () => {
  try {
    const raw = sessionStorage.getItem(DUPLICATE_ALL_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeDuplicateAllCache = (summary, allItems) => {
  try {
    sessionStorage.setItem(
      DUPLICATE_ALL_CACHE_KEY,
      JSON.stringify({ summary, allItems, savedAt: Date.now() })
    );
    sessionStorage.removeItem(DUPLICATE_CACHE_DIRTY_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const getDuplicateSummarySignature = (summary) => (
  [summary?.pending, summary?.confirmed, summary?.rejected, summary?.total]
    .map((value) => Number(value) || 0)
    .join('|')
);

const STATUS_FILTERS = [
  { key: '', label: 'Tổng trường hợp', summaryKey: 'total', icon: Lucide.Layers3, tone: 'blue' },
  { key: 'Pending', label: 'Chờ xử lý', summaryKey: 'pending', icon: Lucide.Clock3, tone: 'amber' },
  { key: 'Confirmed', label: 'Đã xác nhận', summaryKey: 'confirmed', icon: Lucide.BadgeCheck, tone: 'emerald' },
  { key: 'Rejected', label: 'Đã từ chối', summaryKey: 'rejected', icon: Lucide.XCircle, tone: 'rose' },
];

const getConfidenceValue = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 1 ? parsed : parsed * 100;
};

const formatConfidence = (value) => {
  const confidence = getConfidenceValue(value);
  return confidence === null ? '—' : `${Math.round(confidence)}%`;
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'Pending':
      return 'Chờ xử lý';
    case 'Confirmed':
      return 'Đã xác nhận';
    case 'Rejected':
      return 'Đã từ chối';
    default:
      return status || 'Không xác định';
  }
};

const getStatusIntent = (status) => {
  switch (status) {
    case 'Confirmed':
      return 'success';
    case 'Rejected':
      return 'danger';
    case 'Pending':
      return 'warning';
    default:
      return 'neutral';
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFeedback = (item) => item?.primaryFeedback || item?.feedback || {};
const getParentFeedback = (item) => item?.duplicateFeedback || item?.potentialParentFeedback || {};

const getToneClasses = (tone, active) => {
  const map = {
    blue: active
      ? 'border-blue-300 bg-blue-50/80 ring-2 ring-blue-100'
      : 'hover:border-blue-200 hover:bg-blue-50/35',
    amber: active
      ? 'border-amber-300 bg-amber-50/80 ring-2 ring-amber-100'
      : 'hover:border-amber-200 hover:bg-amber-50/35',
    emerald: active
      ? 'border-emerald-300 bg-emerald-50/80 ring-2 ring-emerald-100'
      : 'hover:border-emerald-200 hover:bg-emerald-50/35',
    rose: active
      ? 'border-rose-300 bg-rose-50/80 ring-2 ring-rose-100'
      : 'hover:border-rose-200 hover:bg-rose-50/35',
  };
  return map[tone] || '';
};

const getIconTone = (tone) => ({
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
}[tone] || 'bg-slate-100 text-slate-600');

export const DuplicateDetection = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [initialAllCache] = useState(() => readDuplicateAllCache());
  const [summary, setSummary] = useState(() => initialAllCache?.summary || {
    pending: 0,
    confirmed: 0,
    rejected: 0,
    total: 0,
  });
  const [items, setItems] = useState(() => (
    Array.isArray(initialAllCache?.allItems)
      ? initialAllCache.allItems.slice(0, PAGE_SIZE)
      : []
  ));
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(() => {
    const cachedCount = Array.isArray(initialAllCache?.allItems)
      ? initialAllCache.allItems.length
      : 0;
    const cachedTotal = Number(initialAllCache?.summary?.total) || cachedCount;
    return {
      pageNumber: 1,
      pageSize: PAGE_SIZE,
      totalItems: cachedTotal,
      totalPages: Math.max(1, Math.ceil(cachedCount / PAGE_SIZE)),
      hasPreviousPage: false,
      hasNextPage: cachedCount > PAGE_SIZE,
    };
  });
  const [loading, setLoading] = useState(() => !Array.isArray(initialAllCache?.allItems));
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const successMessage = location.state?.successMessage;
    if (!successMessage) return;

    setMessage({ type: 'success', text: successMessage });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage((current) => current.type === 'success' ? current : { type: '', text: '' });

    try {
      const summaryResponse = await duplicateManagementApi.getDuplicateSummary();

      const nextSummary = {
        pending: Number(summaryResponse?.pendingCount ?? summaryResponse?.pending ?? 0) || 0,
        confirmed: Number(summaryResponse?.confirmedCount ?? summaryResponse?.confirmed ?? 0) || 0,
        rejected: Number(summaryResponse?.rejectedCount ?? summaryResponse?.rejected ?? 0) || 0,
        total: Number(summaryResponse?.totalCount ?? summaryResponse?.total ?? 0) || 0,
      };
      setSummary(nextSummary);

      if (!statusFilter) {
        const cachedAll = readDuplicateAllCache();
        const cachedItems = Array.isArray(cachedAll?.allItems) ? cachedAll.allItems : [];
        const cacheIsDirty = sessionStorage.getItem(DUPLICATE_CACHE_DIRTY_KEY) === '1';
        const summaryUnchanged =
          getDuplicateSummarySignature(cachedAll?.summary)
          === getDuplicateSummarySignature(nextSummary);

        if (!cacheIsDirty && cachedItems.length > 0 && summaryUnchanged) {
          const cachedTotalPages = Math.max(1, Math.ceil(cachedItems.length / PAGE_SIZE));
          const safeCachedPage = Math.min(page, cachedTotalPages);
          const cachedStartIndex = (safeCachedPage - 1) * PAGE_SIZE;

          setItems(cachedItems.slice(cachedStartIndex, cachedStartIndex + PAGE_SIZE));
          setPagination({
            pageNumber: safeCachedPage,
            pageSize: PAGE_SIZE,
            totalItems: Number(nextSummary.total) || cachedItems.length,
            totalPages: cachedTotalPages,
            hasPreviousPage: safeCachedPage > 1,
            hasNextPage: safeCachedPage < cachedTotalPages,
          });
          return;
        }

        const statusCounts = [
          ['Pending', nextSummary.pending],
          ['Confirmed', nextSummary.confirmed],
          ['Rejected', nextSummary.rejected],
        ];

        const fetchAllForStatus = async (status, count) => {
          if (!count) return [];

          const totalStatusPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
          const responses = await Promise.all(
            Array.from({ length: totalStatusPages }, (_, index) => (
              duplicateManagementApi.getDuplicateCandidates({
                status,
                page: index + 1,
                pageSize: PAGE_SIZE,
              })
            ))
          );

          return responses.flatMap((response) => (
            Array.isArray(response?.items) ? response.items : []
          ));
        };

        const groupedResults = await Promise.all(
          statusCounts.map(([status, count]) => fetchAllForStatus(status, count))
        );

        const allItems = groupedResults
          .flat()
          .map((item) => normalizeDuplicateCandidatePayload(item))
          .sort((a, b) => (
            new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
          ));

        const allTotal = nextSummary.total || allItems.length;
        const allTotalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
        const safeAllPage = Math.min(page, allTotalPages);
        const startIndex = (safeAllPage - 1) * PAGE_SIZE;
        const currentItems = allItems.slice(startIndex, startIndex + PAGE_SIZE);

        writeDuplicateAllCache(nextSummary, allItems);
        setItems(currentItems);
        setPagination({
          pageNumber: safeAllPage,
          pageSize: PAGE_SIZE,
          totalItems: allTotal,
          totalPages: Math.max(1, Math.ceil(allTotal / PAGE_SIZE)),
          hasPreviousPage: safeAllPage > 1,
          hasNextPage: safeAllPage < Math.max(1, Math.ceil(allTotal / PAGE_SIZE)),
        });
        return;
      }

      const candidatesResponse = await duplicateManagementApi.getDuplicateCandidates({
        status: statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });

      const normalizedItems = (
        Array.isArray(candidatesResponse?.items) ? candidatesResponse.items : []
      ).map((item) => normalizeDuplicateCandidatePayload(item));

      const rawPagination = candidatesResponse?.pagination || candidatesResponse || {};
      const summaryTotalForFilter = statusFilter === 'Pending'
        ? nextSummary.pending
        : statusFilter === 'Confirmed'
          ? nextSummary.confirmed
          : nextSummary.rejected;

      const apiTotalItems = Number(
        rawPagination?.totalItems
        ?? rawPagination?.totalCount
        ?? 0
      ) || 0;

      const resolvedTotalItems = apiTotalItems > 0
        ? apiTotalItems
        : Number(summaryTotalForFilter) > 0
          ? Number(summaryTotalForFilter)
          : normalizedItems.length;

      const resolvedPageSize = Number(rawPagination?.pageSize ?? PAGE_SIZE) || PAGE_SIZE;
      const apiTotalPages = Number(rawPagination?.totalPages ?? 0) || 0;
      const resolvedTotalPages = apiTotalPages > 0
        ? apiTotalPages
        : Math.ceil(resolvedTotalItems / resolvedPageSize);

      setItems(normalizedItems);
      setPagination({
        pageNumber: Number(rawPagination?.pageNumber ?? rawPagination?.page ?? page) || page,
        pageSize: resolvedPageSize,
        totalItems: resolvedTotalItems,
        totalPages: resolvedTotalPages,
        hasPreviousPage: Boolean(rawPagination?.hasPreviousPage ?? page > 1),
        hasNextPage: Boolean(rawPagination?.hasNextPage ?? page < resolvedTotalPages),
      });
    } catch (err) {
      console.error('Failed to load duplicate candidates', err);
      setMessage({
        type: 'error',
        text: err?.message || 'Không thể tải danh sách phản ánh nghi trùng.',
      });
      setItems((current) => (current.length > 0 ? current : []));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const start = Math.min(Math.max(currentPage - 2, 1), totalPages - 4);
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const currentFilterLabel = STATUS_FILTERS.find((filter) => filter.key === statusFilter)?.label || 'Tổng trường hợp';

  return (
    <div className="admin-page-shell space-y-6">
      {message.type === 'success' ? (
        <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      ) : null}
      {message.type === 'error' ? (
        <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      ) : null}

      <ManagerPageHeader
        title="Xử lý trùng lặp"
        description="Kiểm tra các đề xuất nghi trùng do AI phát hiện trước khi xác nhận gộp hoặc giữ phản ánh độc lập."
        icon={Lucide.ScanSearch}
        statusLabel="ĐANG HIỂN THỊ"
        statusValue={currentFilterLabel}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan trùng lặp">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.key;
          const Icon = filter.icon;

          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              aria-pressed={active}
              className={`admin-panel p-4 text-left transition-all duration-200 ${getToneClasses(filter.tone, active)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{filter.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold text-slate-950">{summary[filter.summaryKey]}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getIconTone(filter.tone)}`}>
                  <Icon size={19} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {filter.key === ''
                  ? 'Tất cả đề xuất trùng lặp trong hệ thống.'
                  : filter.key === 'Pending'
                    ? 'Các trường hợp đang chờ Staff đưa ra kết luận.'
                    : filter.key === 'Confirmed'
                      ? 'Các trường hợp đã được xác nhận là trùng.'
                      : 'Các trường hợp đã được xác định là không trùng.'}
              </p>
            </button>
          );
        })}
      </section>

      <section className="admin-panel overflow-hidden border-slate-200/90 bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/35 px-5 py-4 sm:px-6">
          <ManagerSectionHeader
            title={`Danh sách · ${currentFilterLabel}`}
            description="Mở một trường hợp để so sánh hai phản ánh, xem độ tin cậy và lý do AI."
            icon={Lucide.Files}
            actions={(
              <Button type="button" onClick={loadData} variant="ghost" size="sm" disabled={loading}>
                <Lucide.RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Làm mới
              </Button>
            )}
          />
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
            <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            Đang tải danh sách trùng lặp...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Lucide.Inbox size={22} />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Không có trường hợp phù hợp</h3>
            <p className="mt-1 text-sm text-slate-500">
              Hiện không có đề xuất trùng lặp ở trạng thái {currentFilterLabel.toLowerCase()}.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[25%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Phản ánh mới</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Phản ánh nghi là chính</th>
                    <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tương đồng</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Trạng thái</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Phát hiện lúc</th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hành động</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => {
                    const itemId = item.duplicateCandidateId || item.id;
                    const feedback = getFeedback(item);
                    const parent = getParentFeedback(item);
                    const confidence = getConfidenceValue(item.confidenceScore ?? item.confidence);
                    const status = item.status || 'Pending';

                    return (
                      <tr
                        key={itemId}
                        onClick={() => navigate(`/staff/duplicates/${itemId}`)}
                        className="cursor-pointer transition-colors hover:bg-blue-50/55"
                      >
                        <td className="px-5 py-3.5 align-middle">
                          <div className="line-clamp-2 font-semibold leading-5 text-slate-900">
                            {feedback.title || item.primaryTitle || 'Không có tiêu đề'}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {feedback.areaName || feedback.locationText || 'Chưa xác định khu vực'}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 align-middle">
                          <div className="line-clamp-2 font-semibold leading-5 text-slate-900">
                            {parent.title || item.duplicateTitle || 'Không có tiêu đề'}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {parent.areaName || parent.locationText || 'Chưa xác định khu vực'}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center align-middle">
                          <span className={`inline-flex min-w-14 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            confidence !== null && confidence >= 90
                              ? 'bg-emerald-50 text-emerald-700'
                              : confidence !== null && confidence >= 75
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}>
                            {formatConfidence(confidence)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 align-middle">
                          <Badge intent={getStatusIntent(status)} className="whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold">
                            {getStatusLabel(status)}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 align-middle text-slate-600">
                          {formatDateTime(item.createdAt)}
                        </td>

                        <td className="px-5 py-3.5 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/staff/duplicates/${itemId}`);
                            }}
                          className="whitespace-nowrap"
                          >
                            Chi tiết
                            <Lucide.ArrowRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Hiển thị{' '}
                <span className="font-semibold text-slate-700">
                  {items.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
                  {items.length === 0
                    ? 0
                    : Math.min(
                        (currentPage - 1) * PAGE_SIZE + items.length,
                        Math.max(pagination.totalItems, (currentPage - 1) * PAGE_SIZE + items.length)
                      )}
                </span>{' '}
                trong tổng số{' '}
                <span className="font-semibold text-slate-700">
                  {Math.max(pagination.totalItems, (currentPage - 1) * PAGE_SIZE + items.length)}
                </span>{' '}
                trường hợp
              </p>

              {totalPages > 1 ? (
                <nav className="flex items-center gap-1.5" aria-label="Phân trang danh sách trùng lặp">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <Lucide.ChevronLeft size={16} />
                  </button>

                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
                        pageNumber === currentPage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang sau"
                  >
                    <Lucide.ChevronRight size={16} />
                  </button>
                </nav>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
