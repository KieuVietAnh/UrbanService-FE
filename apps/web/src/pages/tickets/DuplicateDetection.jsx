import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { incidentMatchApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';
import { SuccessAlert } from '../../components/alerts/ErrorAlert';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import LoadingSkeleton from '../../components/design-system/LoadingSkeleton';
import {
  ManagerEmptyState,
  ManagerPageHeader,
  ManagerSectionHeader,
} from '../../components/manager/ManagerPageElements';
import { normalizeDuplicateCandidatePayload } from './duplicateDetailUtils';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  {
    key: '',
    label: 'Tất cả đề xuất',
    summaryKey: 'total',
    description: 'Toàn bộ đề xuất trong phạm vi quản lý.',
    icon: Lucide.Layers3,
    tone: 'blue',
  },
  {
    key: 'Pending',
    label: 'Chờ đánh giá',
    summaryKey: 'pending',
    description: 'Đang chờ Manager đưa ra quyết định.',
    icon: Lucide.Clock3,
    tone: 'amber',
  },
  {
    key: 'Confirmed',
    label: 'Cùng sự vụ',
    summaryKey: 'confirmed',
    description: 'Đã xác nhận hai Report cùng sự vụ.',
    icon: Lucide.BadgeCheck,
    tone: 'emerald',
  },
  {
    key: 'Rejected',
    label: 'Khác sự vụ',
    summaryKey: 'rejected',
    description: 'Đã xác nhận hai Report thuộc sự vụ riêng.',
    icon: Lucide.Split,
    tone: 'rose',
  },
];

const TONE_CLASSES = {
  blue: {
    active: 'border-blue-300 bg-blue-50/80 ring-2 ring-blue-100',
    hover: 'hover:border-blue-200 hover:bg-blue-50/35',
    icon: 'bg-blue-50 text-blue-700',
  },
  amber: {
    active: 'border-amber-300 bg-amber-50/80 ring-2 ring-amber-100',
    hover: 'hover:border-amber-200 hover:bg-amber-50/35',
    icon: 'bg-amber-50 text-amber-700',
  },
  emerald: {
    active: 'border-emerald-300 bg-emerald-50/80 ring-2 ring-emerald-100',
    hover: 'hover:border-emerald-200 hover:bg-emerald-50/35',
    icon: 'bg-emerald-50 text-emerald-700',
  },
  rose: {
    active: 'border-rose-300 bg-rose-50/80 ring-2 ring-rose-100',
    hover: 'hover:border-rose-200 hover:bg-rose-50/35',
    icon: 'bg-rose-50 text-rose-700',
  },
};

const getStatusLabel = (status) => ({
  Pending: 'Chờ đánh giá',
  Confirmed: 'Cùng sự vụ',
  Rejected: 'Khác sự vụ',
}[status] || 'Chưa xác định');

const getStatusIntent = (status) => ({
  Pending: 'warning',
  Confirmed: 'success',
  Rejected: 'danger',
}[status] || 'neutral');

const getConfidence = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 1 ? parsed : parsed * 100;
};

const formatConfidence = (value) => {
  const confidence = getConfidence(value);
  return confidence === null ? 'Chưa có dữ liệu' : `${Math.round(confidence)}%`;
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, 8).toUpperCase() : 'Chưa có dữ liệu';
};

const getCandidateId = (candidate) => candidate?.duplicateCandidateId || candidate?.id;
const getNewReport = (candidate) => candidate?.primaryFeedback || candidate?.feedback || {};
const getRepresentativeReport = (candidate) => (
  candidate?.duplicateFeedback || candidate?.potentialParentFeedback || {}
);

function ConfidenceBadge({ value }) {
  const confidence = getConfidence(value);
  const tone = confidence === null
    ? 'bg-slate-100 text-slate-600'
    : confidence >= 90
      ? 'bg-emerald-50 text-emerald-700'
      : confidence >= 75
        ? 'bg-blue-50 text-blue-700'
        : 'bg-amber-50 text-amber-700';

  return (
    <span className={`inline-flex min-w-16 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {formatConfidence(value)}
    </span>
  );
}

function ReportSummary({ report, fallbackTitle }) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 font-semibold leading-5 text-slate-900">
        {report?.title || fallbackTitle || 'Chưa có tiêu đề'}
      </p>
      <p className="mt-1 truncate text-xs text-slate-500">
        Report {shortId(report?.feedbackId || report?.id)} · {report?.areaName || report?.locationText || 'Chưa có dữ liệu khu vực'}
      </p>
    </div>
  );
}

function MobileCandidateCard({ candidate, detailPath }) {
  const newReport = getNewReport(candidate);
  const representativeReport = getRepresentativeReport(candidate);
  const status = candidate?.status || '';

  return (
    <article className="space-y-4 border-b border-slate-200 p-5 last:border-b-0">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Badge intent={getStatusIntent(status)} className="px-2.5 py-1 text-[11px] font-semibold">
          {getStatusLabel(status)}
        </Badge>
        <ConfidenceBadge value={candidate?.confidenceScore} />
      </header>

      <div className="grid gap-3">
        <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Report mới</p>
          <ReportSummary report={newReport} />
        </section>
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Report đại diện sự vụ đề xuất</p>
          <ReportSummary report={representativeReport} />
        </section>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-500">Sự vụ hiện tại</dt>
          <dd className="mt-1 font-semibold text-slate-800">{shortId(candidate?.currentIncidentId || candidate?.incidentId)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Sự vụ đề xuất</dt>
          <dd className="mt-1 font-semibold text-slate-800">{shortId(candidate?.suggestedIncidentId)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Cập nhật</dt>
          <dd className="mt-1 font-semibold text-slate-800">{formatDateTime(candidate?.updatedAt || candidate?.createdAt)}</dd>
        </div>
      </dl>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => detailPath(getCandidateId(candidate))}>
        Xem chi tiết
        <Lucide.ArrowRight size={15} aria-hidden="true" />
      </Button>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4 p-5 sm:p-6" aria-label="Đang tải danh sách đề xuất" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid gap-4 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_1fr_100px_120px]">
          <LoadingSkeleton rows={2} />
          <LoadingSkeleton rows={2} />
          <LoadingSkeleton rows={1} />
          <LoadingSkeleton rows={1} />
        </div>
      ))}
    </div>
  );
}

export const IncidentMatchListPage = ({ basePath = '/manager/incident-matches' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeRequestRef = useRef(null);
  const [summary, setSummary] = useState({ pending: 0, confirmed: 0, rejected: 0, total: 0 });
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '');

  const loadData = useCallback(async () => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const [summaryResult, pageResult] = await Promise.all([
        incidentMatchApi.getSummary({ signal: controller.signal }),
        incidentMatchApi.getCandidates(
          { Status: statusFilter, Page: page, PageSize: PAGE_SIZE },
          { signal: controller.signal },
        ),
      ]);
      if (controller.signal.aborted) return;

      setSummary(summaryResult);
      setItems((pageResult?.items || []).map(normalizeDuplicateCandidatePayload));
      setPagination(pageResult);
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.code === 'ERR_CANCELED') return;
      setItems([]);
      setError(requestError?.message || 'Không thể tải danh sách đề xuất');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void loadData();
    return () => activeRequestRef.current?.abort();
  }, [loadData]);

  useEffect(() => {
    if (!location.state?.successMessage) return;
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const totalPages = Math.max(1, Number(pagination?.totalPages) || 1);
  const currentPage = Math.min(page, totalPages);
  const currentFilter = STATUS_FILTERS.find((filter) => filter.key === statusFilter) || STATUS_FILTERS[0];
  const visiblePages = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const start = Math.min(Math.max(currentPage - 2, 1), totalPages - 4);
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const selectStatus = (status) => {
    setStatusFilter(status);
    setPage(1);
  };
  const openDetail = (candidateId) => navigate(`${basePath}/${candidateId}`);

  return (
    <article className="admin-page-shell space-y-6">
      {successMessage ? (
        <SuccessAlert message={successMessage} onClose={() => setSuccessMessage('')} />
      ) : null}

      <ManagerPageHeader
        title="Đề xuất cùng sự vụ"
        description="Xem các đề xuất của AI và quyết định liệu các Report có đang phản ánh cùng một sự vụ hay không."
        icon={Lucide.ScanSearch}
        statusLabel="Đang hiển thị"
        statusValue={currentFilter.label}
        statusTone={statusFilter === 'Pending' ? 'review' : 'info'}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan đề xuất cùng sự vụ">
        {STATUS_FILTERS.map((filter) => {
          const active = filter.key === statusFilter;
          const Icon = filter.icon;
          const tone = TONE_CLASSES[filter.tone];
          return (
            <button
              key={filter.key || 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => selectStatus(filter.key)}
              className={`admin-panel p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${active ? tone.active : tone.hover}`}
            >
              <span className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-semibold text-slate-600">{filter.label}</span>
                  <span className="mt-1.5 block text-2xl font-semibold text-slate-950">{summary[filter.summaryKey]}</span>
                </span>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`} aria-hidden="true">
                  <Icon size={19} />
                </span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">{filter.description}</span>
            </button>
          );
        })}
      </section>

      <section className="admin-panel overflow-hidden" aria-labelledby="incident-match-list-title">
        <ManagerSectionHeader
          id="incident-match-list-title"
          title={`Danh sách · ${currentFilter.label}`}
          description="So sánh Report mới với Report đại diện của sự vụ được đề xuất."
          icon={Lucide.Files}
          iconClassName="admin-mini-icon bg-blue-50 text-blue-700"
          actions={(
            <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => void loadData()}>
              <Lucide.RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              Làm mới
            </Button>
          )}
        />

        {loading ? <ListSkeleton /> : error ? (
          <ManagerEmptyState
            icon={Lucide.TriangleAlert}
            title="Không thể tải danh sách đề xuất"
            description={error}
            action={(
              <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
                <Lucide.RefreshCw size={15} aria-hidden="true" />
                Thử lại
              </Button>
            )}
          />
        ) : items.length === 0 ? (
          <ManagerEmptyState
            icon={Lucide.Inbox}
            title="Chưa có đề xuất nào"
            description={statusFilter
              ? `Chưa có đề xuất ở trạng thái “${currentFilter.label}”.`
              : 'Các đề xuất cùng sự vụ do AI phát hiện sẽ xuất hiện tại đây.'}
          />
        ) : (
          <>
            <div className="divide-y divide-slate-200 xl:hidden">
              {items.map((candidate) => (
                <MobileCandidateCard
                  key={getCandidateId(candidate)}
                  candidate={candidate}
                  detailPath={openDetail}
                />
              ))}
            </div>

            <div className="hidden xl:block">
              <table className="w-full table-fixed text-sm">
                <caption className="sr-only">Danh sách đề xuất hai Report cùng sự vụ</caption>
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="border-y border-slate-200 bg-slate-50/85">
                  <tr>
                    {['Report mới', 'Report đại diện sự vụ đề xuất', 'Sự vụ', 'Độ tin cậy', 'Trạng thái', 'Cập nhật', ''].map((label) => (
                      <th key={label || 'action'} scope="col" className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                        {label || <span className="sr-only">Hành động</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((candidate) => {
                    const candidateId = getCandidateId(candidate);
                    const status = candidate?.status || '';
                    return (
                      <tr key={candidateId} className="transition-colors hover:bg-blue-50/40">
                        <td className="px-4 py-4 align-top"><ReportSummary report={getNewReport(candidate)} /></td>
                        <td className="px-4 py-4 align-top"><ReportSummary report={getRepresentativeReport(candidate)} /></td>
                        <td className="px-4 py-4 align-top">
                          <dl className="space-y-1 text-xs">
                            <div className="flex items-center gap-2"><dt className="text-slate-500">Hiện tại</dt><dd className="font-semibold text-slate-800">{shortId(candidate?.currentIncidentId || candidate?.incidentId)}</dd></div>
                            <div className="flex items-center gap-2"><dt className="text-slate-500">Đề xuất</dt><dd className="font-semibold text-slate-800">{shortId(candidate?.suggestedIncidentId)}</dd></div>
                          </dl>
                        </td>
                        <td className="px-4 py-4 align-top"><ConfidenceBadge value={candidate?.confidenceScore} /></td>
                        <td className="px-4 py-4 align-top">
                          <Badge intent={getStatusIntent(status)} className="whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold">{getStatusLabel(status)}</Badge>
                        </td>
                        <td className="px-4 py-4 align-top text-xs leading-5 text-slate-600">{formatDateTime(candidate?.updatedAt || candidate?.createdAt)}</td>
                        <td className="px-4 py-4 text-right align-top">
                          <Button type="button" variant="outline" size="sm" className="whitespace-nowrap" aria-label={`Xem chi tiết đề xuất ${shortId(candidateId)}`} onClick={() => openDetail(candidateId)}>
                            Xem chi tiết
                            <Lucide.ArrowRight size={16} aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Trang <strong className="text-slate-800">{currentPage}</strong> / {totalPages} · {pagination?.totalItems || items.length} đề xuất
              </p>
              {totalPages > 1 ? (
                <nav className="flex flex-wrap items-center gap-1.5" aria-label="Phân trang đề xuất cùng sự vụ">
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước">
                    <Lucide.ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  {visiblePages.map((pageNumber) => (
                    <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} aria-current={pageNumber === currentPage ? 'page' : undefined} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${pageNumber === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'}`}>
                      {pageNumber}
                    </button>
                  ))}
                  <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau">
                    <Lucide.ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              ) : null}
            </footer>
          </>
        )}
      </section>
    </article>
  );
};

export const DuplicateDetection = () => (
  <IncidentMatchListPage basePath="/staff/duplicates" />
);
