// src/pages/tickets/DuplicateDetection.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { duplicateManagementApi } from '@urbanmind/shared-api';
import { SuccessAlert, ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';
import { normalizeDuplicateCandidatePayload, extractImageUrls } from './duplicateDetailUtils';

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

const getStatusTone = (status) => {
  switch (status) {
    case 'Pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'Confirmed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const getRecommendationText = (confidenceScore) => {
  if (confidenceScore === null) {
    return {
      label: 'Cần phân tích thêm',
      description: 'Đợi AI xử lý để đưa ra đề xuất.',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
    };
  }

  if (confidenceScore >= 90) {
    return {
      label: 'Nhiều khả năng trùng',
      description: 'AI đánh giá khả năng trùng rất cao.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (confidenceScore >= 75) {
    return {
      label: 'Có thể trùng',
      description: 'AI gợi ý khả năng trùng; xem xét thêm.',
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
    };
  }

  return {
    label: 'Cần kiểm tra cẩn thận',
    description: 'AI cảnh báo chưa đủ bằng chứng trùng lặp.',
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  };
};

const getConfidenceValue = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 1 ? parsed : parsed * 100;
};

const formatConfidence = (value) => {
  const confidence = getConfidenceValue(value);
  if (confidence === null) return '—';
  return `${Math.round(confidence)}%`;
};

const getValue = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  return value;
};

// const getNestedValue = (source, path, fallback = '—') => {
//   let current = source;
//   for (const key of path) {
//     if (current == null || typeof current !== 'object') return fallback;
//     current = current[key];
//   }
//   return getValue(current, fallback);
// };

export const DuplicateDetection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [summary, setSummary] = useState({ pending: 0, confirmed: 0, rejected: 0, total: 0 });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, totalCount: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);

  useEffect(() => {
    const successMessage = location.state?.successMessage;
    if (successMessage) {
      setMessage({ type: 'success', text: successMessage });
    }
  }, [location.state]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryResponse, candidatesResponse] = await Promise.all([
          duplicateManagementApi.getDuplicateSummary(),
          duplicateManagementApi.getDuplicateCandidates({ status: 'Pending', page, pageSize: PAGE_SIZE }),
        ]);

        const normalizedItems = (Array.isArray(candidatesResponse?.items) ? candidatesResponse.items : []).map((item) => normalizeDuplicateCandidatePayload(item));

        setSummary(summaryResponse || { pending: 0, confirmed: 0, rejected: 0, total: 0 });
        setItems(normalizedItems);

        // If API list doesn't include image URLs, fetch detail per item to collect thumbnails
        const attachThumbnails = async (itemsArr) => {
          const promises = itemsArr.map(async (it) => {
            try {
              const id = it.duplicateCandidateId || it.id;
              if (!id) return it;
              const resp = await duplicateManagementApi.getDuplicateById(id);
              const normalized = normalizeDuplicateCandidatePayload(resp || null);
              const imgs = extractImageUrls(normalized?.primaryFeedback).concat(extractImageUrls(normalized?.duplicateFeedback));
              const thumbnail = imgs.length ? imgs[0] : null;
              return { ...it, thumbnail };
            } catch {
              return it;
            }
          });

          return Promise.all(promises);
        };

        // fire-and-forget: update items with thumbnails
        attachThumbnails(normalizedItems).then((withThumbs) => setItems(withThumbs)).catch(() => {});
        setPagination(candidatesResponse?.pagination || { page, pageSize: PAGE_SIZE, totalCount: 0, totalPages: 0 });
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: err?.message || 'Không thể tải danh sách phản ánh trùng lặp.' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [page]);

  useEffect(() => {
    if (!items.length) {
      setSelectedCandidateId(null);
      return;
    }

    const currentId = selectedCandidateId || items[0]?.duplicateCandidateId || items[0]?.id;
    const exists = items.some((item) => (item.duplicateCandidateId || item.id) === currentId);
    if (!exists) {
      setSelectedCandidateId(items[0]?.duplicateCandidateId || items[0]?.id || null);
      return;
    }

    if (!selectedCandidateId) {
      setSelectedCandidateId(currentId);
    }
  }, [items, selectedCandidateId]);

  const pageNumbers = useMemo(() => {
    const totalPages = pagination?.totalPages || 0;
    if (!totalPages) return [];
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [pagination]);

  const selectedCandidate = useMemo(() => {
    if (!items.length) return null;
    return items.find((item) => (item.duplicateCandidateId || item.id) === selectedCandidateId) || items[0];
  }, [items, selectedCandidateId]);

  const selectedMeta = useMemo(() => {
    if (!selectedCandidate) {
      return {
        titleA: 'Không có dữ liệu',
        titleB: 'Không có dữ liệu',
        descriptionA: '—',
        descriptionB: '—',
        categoryA: '—',
        categoryB: '—',
        locationA: '—',
        locationB: '—',
        reporterA: '—',
        reporterB: '—',
        createdA: '—',
        createdB: '—',
      };
    }

    const primaryFeedback = selectedCandidate.primaryFeedback || {};
    const duplicateFeedback = selectedCandidate.duplicateFeedback || {};
    const status = getStatusLabel(selectedCandidate.status || 'Pending');
    const confidence = formatConfidence(selectedCandidate.confidenceScore ?? selectedCandidate.confidence);
    const reason = selectedCandidate.reason || selectedCandidate.reasoning || selectedCandidate.duplicateReasoning || 'Không có thông tin phân tích từ hệ thống.';

    return {
      titleA: getValue(primaryFeedback.title || primaryFeedback.name || selectedCandidate.primaryTitle || selectedCandidate.primaryFeedbackTitle, 'Không có tiêu đề'),
      titleB: getValue(duplicateFeedback.title || duplicateFeedback.name || selectedCandidate.duplicateTitle || selectedCandidate.duplicateFeedbackTitle, 'Không có tiêu đề'),
      descriptionA: getValue(primaryFeedback.description || primaryFeedback.details || primaryFeedback.content || selectedCandidate.primaryDescription, 'Không có mô tả'),
      descriptionB: getValue(duplicateFeedback.description || duplicateFeedback.details || duplicateFeedback.content || selectedCandidate.duplicateDescription, 'Không có mô tả'),
      categoryA: getValue(primaryFeedback.categoryName || primaryFeedback.category?.name || '—', '—'),
      categoryB: getValue(duplicateFeedback.categoryName || duplicateFeedback.category?.name || '—', '—'),
      locationA: getValue(primaryFeedback.locationText || primaryFeedback.location || primaryFeedback.address || '—', '—'),
      locationB: getValue(duplicateFeedback.locationText || duplicateFeedback.location || duplicateFeedback.address || '—', '—'),
      reporterA: getValue(primaryFeedback.reporterName || primaryFeedback.userName || primaryFeedback.reporter?.name || '—', '—'),
      reporterB: getValue(duplicateFeedback.reporterName || duplicateFeedback.userName || duplicateFeedback.reporter?.name || '—', '—'),
      areaA: getValue(primaryFeedback.areaName || '—', '—'),
      areaB: getValue(duplicateFeedback.areaName || '—', '—'),
      priorityA: getValue(primaryFeedback.priority || '—', '—'),
      priorityB: getValue(duplicateFeedback.priority || '—', '—'),
      createdA: formatDateTime(primaryFeedback.createdAt || selectedCandidate.primaryCreatedAt || selectedCandidate.createdAt),
      createdB: formatDateTime(duplicateFeedback.createdAt || selectedCandidate.duplicateCreatedAt || selectedCandidate.createdAt),
      status,
      confidence,
      reason,
    };
  }, [selectedCandidate]);

  const confidenceScore = getConfidenceValue(selectedCandidate?.confidenceScore ?? selectedCandidate?.confidence);
  const confidenceLevel = confidenceScore === null ? 'Đang chờ phân tích' : confidenceScore >= 90 ? 'Độ tin cậy cao' : confidenceScore >= 75 ? 'Độ tin cậy tốt' : 'Cần kiểm tra thêm';
  const confidenceTone = confidenceScore === null ? 'border-slate-200 bg-slate-50 text-slate-700' : confidenceScore >= 90 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : confidenceScore >= 75 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  const recommendation = getRecommendationText(confidenceScore);
  const matchingSignals = [
    {
      label: 'Danh mục giống',
      active: selectedMeta.categoryA === selectedMeta.categoryB && selectedMeta.categoryA !== '—',
    },
    {
      label: 'Khu vực giống',
      active: selectedMeta.areaA === selectedMeta.areaB && selectedMeta.areaA !== '—',
    },
    {
      label: 'Nội dung tương đồng',
      active:
        selectedMeta.titleA === selectedMeta.titleB || selectedMeta.descriptionA === selectedMeta.descriptionB,
    },
    {
      label: 'Thời điểm gần nhau',
      active: selectedMeta.createdA === selectedMeta.createdB && selectedMeta.createdA !== '—',
    },
  ];

  return (
    <div className="space-y-6">
      {message.type === 'success' && (
        <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      )}
      {message.type === 'error' && (
        <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      )}

      <section className="admin-panel overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
              <Lucide.ScanSearch size={14} className="mr-2" />
              Hệ thống đánh giá trùng lặp
            </div>
            <div>
              <h2 className="admin-section-title text-3xl sm:text-[2rem]">Xử lý trùng lặp</h2>
              <p className="admin-section-description mt-2 max-w-xl text-base">
                Đánh giá nhanh hai phản ánh để quyết định chúng có cùng một sự cố hay không.
              </p>
            </div>
          </div>

          <div className="grid min-w-[320px] grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="min-h-[110px] rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-center shadow-sm">
              <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Chờ xác nhận</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{summary.pending}</div>
            </div>
            <div className="min-h-[110px] rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-center shadow-sm">
              <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Đã xác nhận trùng</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{summary.confirmed}</div>
            </div>
            <div className="min-h-[110px] rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-center shadow-sm">
              <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Đã từ chối</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{summary.rejected}</div>
            </div>
            <div className="min-h-[110px] rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-center shadow-sm">
              <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Tổng số trường hợp</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{summary.total}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="admin-panel overflow-hidden rounded-[24px] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="admin-section-title">Danh sách ứng viên trùng lặp</h3>
              <p className="admin-section-description mt-1">Chọn một mục để xem toàn bộ dữ liệu so sánh.</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
             {items.length}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500">
              <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              Đang tải dữ liệu trùng lặp...
            </div>
          ) : message.type === 'error' && !items.length ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 p-6 text-center text-sm text-rose-700">{message.text}</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">Không có dữ liệu trùng lặp nào ở trạng thái Chờ xử lý.</div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const itemId = item.duplicateCandidateId || item.id;
                const isSelected = itemId === selectedCandidateId;
                const confidence = getConfidenceValue(item.confidenceScore ?? item.confidence);
                const isHighConfidence = confidence !== null && confidence >= 90;
                const status = getStatusLabel(item.status || 'Pending');
                const statusTone = getStatusTone(item.status || 'Pending');

                return (
                  <button
                    key={itemId}
                    type="button"
                    onClick={() => setSelectedCandidateId(itemId)}
                    className={`group flex h-full w-full flex-col rounded-[20px] border p-4 text-left transition-all ${isSelected ? 'border-blue-300 bg-blue-50/70 shadow-[0_18px_50px_-18px_rgba(37,99,235,0.4)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{itemId || '—'}</div>
                        <div className="mt-1 text-xs text-slate-500 whitespace-nowrap">{status}</div>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap ${statusTone}`}>
                        {status}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap text-slate-500">
                          <Lucide.BarChart3 size={14} />
                          Điểm tương đồng
                        </span>
                        <span className={`font-semibold ${isHighConfidence ? 'text-emerald-700' : 'text-slate-800'} whitespace-nowrap`}>
                          {formatConfidence(item.confidenceScore ?? item.confidence)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap text-slate-500">
                          <Lucide.MapPin size={14} />
                          Khu vực
                        </span>
                        <span className="max-w-[170px] truncate font-medium text-slate-700">{getValue(item.primaryFeedback?.areaName || item.primaryFeedback?.locationText || item.primaryFeedback?.location || item.primaryFeedback?.address || '—', '—')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap text-slate-500">
                          <Lucide.Tags size={14} />
                          Danh mục
                        </span>
                        <span className="max-w-[170px] truncate font-medium text-slate-700">{getValue(item.primaryFeedback?.categoryName || item.primaryFeedback?.category?.name || '—', '—')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap text-slate-500">
                          <Lucide.Clock3 size={14} />
                          Tạo lúc
                        </span>
                        <span className="max-w-[170px] truncate font-medium text-slate-700">{formatDate(item.createdAt || item.createdDate)}</span>
                      </div>
                    </div>

                    {isHighConfidence && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        <Lucide.Sparkles size={12} />
                        Độ tin cậy cao
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="admin-panel overflow-hidden rounded-[24px] p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                  Đề xuất AI
                </div>
                <div className="flex flex-col gap-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between min-w-0">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 whitespace-nowrap">Điểm tương đồng</div>
                      <div className="mt-2 text-[3rem] font-black leading-none text-slate-900">{formatConfidence(selectedCandidate?.confidenceScore ?? selectedCandidate?.confidence)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 max-w-full">
                      <div className={`max-w-[240px] truncate rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap ${recommendation.tone}`}>
                        {recommendation.label}
                      </div>
                      <div className={`max-w-[220px] truncate rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap ${confidenceTone}`}>
                        {confidenceLevel}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 min-h-[96px]">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Phản ánh A</div>
                      <div className="mt-3 text-sm font-semibold text-slate-900 line-clamp-2 leading-6">{selectedMeta.titleA}</div>
                    </div>
                    <div className="rounded-[20px] border border-blue-200 bg-blue-50 p-4 min-h-[96px]">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-blue-700 whitespace-nowrap">Đề xuất AI</div>
                      <div className="mt-3 text-sm font-semibold text-slate-900 line-clamp-2 overflow-hidden leading-6">{recommendation.description}</div>
                    </div>
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 min-h-[96px]">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Phản ánh B</div>
                      <div className="mt-3 text-sm font-semibold text-slate-900 line-clamp-2 leading-6">{selectedMeta.titleB}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-slate-700">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Trạng thái</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 truncate">{selectedMeta.status}</div>
                    </div>
                    <div className={`rounded-full border px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${getStatusTone(selectedCandidate?.status || 'Pending')}`}>
                    {getStatusLabel(selectedCandidate?.status || 'Pending')}
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-sm text-slate-600">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Danh mục</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.categoryA}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Khu vực</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.areaA}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Ngày</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.createdA}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="admin-panel rounded-[24px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Phản ánh A</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 truncate">{selectedMeta.titleA}</h3>
                </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 whitespace-nowrap">Phản ánh A</div>
              </div>
              <div className="mt-5 space-y-4 text-slate-700">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Mô tả</div>
                  <p className="mt-2 text-sm leading-7 text-slate-900 line-clamp-4 overflow-hidden">{selectedMeta.descriptionA}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Người báo cáo</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.reporterA}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Danh mục</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.categoryA}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Khu vực</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.areaA}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Mức ưu tiên</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.priorityA}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Ngày tạo</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.createdA}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-panel rounded-[24px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Phản ánh B</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 truncate">{selectedMeta.titleB}</h3>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 whitespace-nowrap">Phản ánh B</div>
              </div>
              <div className="mt-5 space-y-4 text-slate-700">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Mô tả</div>
                  <p className="mt-2 text-sm leading-7 text-slate-900 line-clamp-4 overflow-hidden">{selectedMeta.descriptionB}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Người báo cáo</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.reporterB}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Danh mục</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.categoryB}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Khu vực</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.areaB}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Mức ưu tiên</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.priorityB}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 min-h-[88px]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Ngày tạo</div>
                    <div className="mt-2 font-semibold text-slate-900 truncate">{selectedMeta.createdB}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-panel rounded-[24px] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Phân tích AI</div>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Tại sao AI cho rằng hai phản ánh trùng nhau</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">AI đánh giá dựa trên sự tương đồng về nội dung, vị trí và thời gian. Hãy dùng những chỉ số sau để xác nhận quyết định.</p>
              </div>
              <div className={`rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap ${confidenceTone}`}>{confidenceLevel}</div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Tín hiệu trùng khớp</div>
                  <div className="mt-4 space-y-3">
                    {matchingSignals.map((signal) => (
                      <div key={signal.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="min-w-0 text-sm font-medium text-slate-900 truncate">{signal.label}</div>
                        <div className={`max-w-[88px] truncate rounded-full border px-3 py-1 text-xs font-semibold ${signal.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {signal.active ? 'Trùng' : 'Kiểm tra'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Tại sao AI nhận diện là trùng</div>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>AI đánh giá rằng hai phản ánh có sự trùng lặp mạnh về nội dung và bối cảnh báo cáo.</p>
                    <p>Độ tin cậy tổng thể: <span className="font-semibold text-slate-900">{selectedMeta.confidence}</span>.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Rủi ro tiềm ẩn</div>
                    <h4 className="mt-2 text-base font-semibold text-slate-900">Nếu ghép nhầm</h4>
                  </div>
                  <Lucide.AlertTriangle size={20} className="text-amber-500" />
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  <li className="rounded-2xl border border-amber-200 bg-amber-50 p-3">Thông tin khác nhau có thể khiến phản ánh bị mất dấu vấn đề riêng.</li>
                  <li className="rounded-2xl border border-rose-200 bg-rose-50 p-3">Nếu không giống, sẽ gây nhầm lẫn khi theo dõi giải quyết sự cố.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="sticky bottom-4 z-20 rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_70px_-24px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 max-w-full">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 whitespace-nowrap">Độ tin cậy AI</div>
                <div className="mt-2 text-lg font-semibold text-slate-900 truncate">{selectedMeta.confidence}</div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-nowrap">
                <button type="button" className="btn btn-primary whitespace-nowrap rounded-2xl px-6 py-3 shadow-lg shadow-blue-500/15">
                  <Lucide.CheckCircle2 size={16} className="mr-2" />
                  Xác nhận trùng
                </button>
                <button type="button" className="btn btn-outline whitespace-nowrap rounded-2xl px-6 py-3">
                  <Lucide.XCircle size={16} className="mr-2" />
                  Không trùng
                </button>
                <button
                  type="button"
                  className="btn btn-ghost whitespace-nowrap rounded-2xl px-6 py-3"
                  onClick={() => navigate(`/staff/duplicates/${selectedCandidate?.duplicateCandidateId || selectedCandidate?.id}`)}
                >
                  <Lucide.Eye size={16} className="mr-2" />
                  Xem chi tiết phản ánh
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {pageNumbers.length > 1 && (
        <div className="flex items-center justify-end gap-2 rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <button
            type="button"
            className="btn btn-sm btn-outline rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Trước
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`btn btn-sm rounded-xl ${pageNumber === page ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-outline rounded-xl"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};
