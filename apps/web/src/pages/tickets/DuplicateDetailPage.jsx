import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { incidentMatchApi, managementFeedbackApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import LoadingSkeleton from '../../components/design-system/LoadingSkeleton';
import { ManagerEmptyState, ManagerPageHeader } from '../../components/manager/ManagerPageElements';
import {
  extractImageUrls,
  getCandidateReasoning,
  normalizeDuplicateCandidatePayload,
} from './duplicateDetailUtils';

const MISSING_VALUE = 'Chưa có dữ liệu';

const normalizeKey = (value) => String(value ?? '')
  .trim()
  .replace(/[-_\s]+/g, '')
  .toLowerCase();

const CANDIDATE_STATUS_LABELS = {
  pending: 'Chờ đánh giá',
  confirmed: 'Cùng sự vụ',
  rejected: 'Khác sự vụ',
};

const REPORT_STATUS_LABELS = {
  submitted: 'Đã gửi',
  aireviewed: 'Đã được AI phân tích',
  verified: 'Đã xác nhận',
  rejected: 'Đã từ chối',
  assigned: 'Đã phân công',
  inprogress: 'Đang xử lý',
  submittedforapproval: 'Chờ duyệt kết quả',
  needrework: 'Cần xử lý lại',
  approved: 'Đã duyệt',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng',
  merged: 'Đã gộp',
  cancelled: 'Đã hủy',
};

const PRIORITY_LABELS = {
  critical: 'Khẩn cấp',
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  normal: 'Trung bình',
  low: 'Thấp',
};

const CHANNEL_LABELS = {
  web: 'Cổng thông tin',
  mobile: 'Ứng dụng di động',
  chatbot: 'Trợ lý AI',
  ai: 'Trợ lý AI',
  hotline: 'Đường dây nóng',
  email: 'Email',
  manual: 'Nhập thủ công',
};

const getCandidateStatusLabel = (value) => (
  CANDIDATE_STATUS_LABELS[normalizeKey(value)] || 'Chưa xác định'
);

const getCandidateStatusIntent = (value) => ({
  pending: 'warning',
  confirmed: 'success',
  rejected: 'danger',
}[normalizeKey(value)] || 'neutral');

const getReportStatusLabel = (value) => (
  REPORT_STATUS_LABELS[normalizeKey(value)] || MISSING_VALUE
);

const getPriorityLabel = (value) => PRIORITY_LABELS[normalizeKey(value)] || MISSING_VALUE;
const getChannelLabel = (value) => CHANNEL_LABELS[normalizeKey(value)] || (value || MISSING_VALUE);

const formatDateTime = (value) => {
  if (!value) return MISSING_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING_VALUE;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const getConfidence = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed > 1 ? parsed : parsed * 100));
};

const formatConfidence = (value) => {
  const confidence = getConfidence(value);
  return confidence === null ? MISSING_VALUE : `${Math.round(confidence)}%`;
};

const formatId = (value, prefix = '') => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return MISSING_VALUE;
  return `${prefix}${normalized.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
};

const getCoordinates = (report = {}) => {
  const latitude = Number(report?.latitude ?? report?.coordinates?.latitude ?? report?.coordinates?.lat);
  const longitude = Number(report?.longitude ?? report?.coordinates?.longitude ?? report?.coordinates?.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return MISSING_VALUE;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const getNewReport = (candidate) => candidate?.primaryFeedback || candidate?.feedback || null;
const getRepresentativeReport = (candidate) => (
  candidate?.duplicateFeedback || candidate?.potentialParentFeedback || null
);

const mergeCandidateReports = (response, primaryDetail, representativeDetail) => (
  normalizeDuplicateCandidatePayload({
    ...response,
    primaryFeedback: primaryDetail || response?.feedback || response?.primaryFeedback || null,
    duplicateFeedback: representativeDetail
      || response?.potentialParentFeedback
      || response?.duplicateFeedback
      || null,
  })
);

const clearLegacyMatchCache = () => {
  try {
    window.sessionStorage.removeItem('staff-duplicate-all-cache');
    window.sessionStorage.setItem('staff-duplicate-cache-dirty', '1');
  } catch {
    // The Manager list always reloads from the API when storage is unavailable.
  }
};

function MetadataItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/65 px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm" aria-hidden="true">
        <Icon size={16} />
      </span>
      <dl className="min-w-0">
        <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-900">{value || MISSING_VALUE}</dd>
      </dl>
    </div>
  );
}

function ReportImageGrid({ images, reportLabel }) {
  if (!images.length) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
        <span>
          <Lucide.ImageOff size={24} className="mx-auto mb-2 text-slate-400" aria-hidden="true" />
          Chưa có hình ảnh
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.slice(0, 3).map((source, index) => (
        <a
          key={`${source}-${index}`}
          href={source}
          target="_blank"
          rel="noreferrer"
          className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${index === 0 ? 'col-span-2 row-span-2 min-h-44' : 'min-h-20'}`}
          aria-label={`Mở hình ảnh ${index + 1} của ${reportLabel}`}
        >
          <img src={source} alt={`Hình ảnh ${index + 1} của ${reportLabel}`} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/60 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
            <Lucide.Expand size={14} />
          </span>
        </a>
      ))}
    </div>
  );
}

function ReportPanel({ accent, eyebrow, report }) {
  const images = extractImageUrls(report || {});
  const isBlue = accent === 'blue';
  const accentClasses = isBlue
    ? 'border-blue-100 bg-blue-50/55 text-blue-700'
    : 'border-emerald-100 bg-emerald-50/55 text-emerald-700';

  return (
    <article className="min-w-0 p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accentClasses}`}>{eyebrow}</p>
          <h2 className="mt-3 text-lg font-semibold leading-7 text-slate-950">{report?.title || 'Chưa có tiêu đề'}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">{formatId(report?.feedbackId || report?.id, 'PA-')}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isBlue ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`} aria-hidden="true">
          <Lucide.FileText size={19} />
        </span>
      </header>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {report?.description || report?.content || MISSING_VALUE}
      </p>

      <div className="mt-5">
        <ReportImageGrid images={images} reportLabel={eyebrow.toLowerCase()} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetadataItem icon={Lucide.UserRound} label="Người gửi" value={report?.reporterName || report?.userName || report?.reportedByName || MISSING_VALUE} />
        <MetadataItem icon={Lucide.Tags} label="Danh mục" value={report?.categoryName || report?.category?.name || MISSING_VALUE} />
        <MetadataItem icon={Lucide.MapPin} label="Phường / khu vực" value={report?.areaName || report?.area?.name || MISSING_VALUE} />
        <MetadataItem icon={Lucide.Navigation} label="Địa chỉ" value={report?.locationText || report?.address || MISSING_VALUE} />
        <MetadataItem icon={Lucide.Crosshair} label="Tọa độ" value={getCoordinates(report)} />
        <MetadataItem icon={Lucide.Flag} label="Mức ưu tiên" value={getPriorityLabel(report?.priority)} />
        <MetadataItem icon={Lucide.Activity} label="Trạng thái Report" value={getReportStatusLabel(report?.status)} />
        <MetadataItem icon={Lucide.Radio} label="Kênh gửi" value={getChannelLabel(report?.submissionChannel)} />
        <MetadataItem icon={Lucide.CalendarClock} label="Thời gian gửi" value={formatDateTime(report?.createdAt || report?.createdDate)} />
        <MetadataItem icon={Lucide.RefreshCw} label="Cập nhật gần nhất" value={formatDateTime(report?.updatedAt)} />
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-label="Đang tải đề xuất" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="admin-panel p-5"><LoadingSkeleton rows={2} /></div>)}
      </div>
      <div className="admin-panel grid gap-0 overflow-hidden xl:grid-cols-2">
        <div className="p-6"><LoadingSkeleton rows={10} /></div>
        <div className="border-t border-slate-200 p-6 xl:border-l xl:border-t-0"><LoadingSkeleton rows={10} /></div>
      </div>
    </div>
  );
}

function DecisionDialog({ mode, open, submitting, destinationIncidentId, onClose, onConfirm }) {
  if (!open) return null;
  const confirmingSameIncident = mode === 'confirm';
  const title = confirmingSameIncident
    ? 'Xác nhận hai Report cùng một sự vụ?'
    : 'Xác nhận hai Report khác sự vụ?';
  const body = confirmingSameIncident
    ? `Report mới vẫn được lưu giữ và sẽ trở thành thông tin bổ sung cho sự vụ ${destinationIncidentId ? formatId(destinationIncidentId, 'SV-') : 'hiện có'}. Không có Report nào bị xóa.`
    : 'Hai Report sẽ tiếp tục thuộc hai sự vụ riêng biệt. Không có Report nào bị xóa hoặc bị coi là dữ liệu thừa.';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" onClick={onClose} disabled={submitting} aria-label="Đóng hộp thoại" />
      <section role="dialog" aria-modal="true" aria-labelledby="incident-match-dialog-title" className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${confirmingSameIncident ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`} aria-hidden="true">
              {confirmingSameIncident ? <Lucide.GitMerge size={20} /> : <Lucide.Split size={20} />}
            </span>
            <div>
              <h2 id="incident-match-dialog-title" className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100" aria-label="Đóng">
            <Lucide.X size={18} aria-hidden="true" />
          </button>
        </header>
        <footer className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={onClose}>Hủy</Button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${confirmingSameIncident ? 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-100' : 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-100'}`}
          >
            {submitting ? <Lucide.LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : confirmingSameIncident ? <Lucide.GitMerge size={16} aria-hidden="true" /> : <Lucide.Split size={16} aria-hidden="true" />}
            {submitting
              ? 'Đang xác nhận...'
              : confirmingSameIncident
                ? 'Xác nhận cùng sự vụ'
                : 'Xác nhận khác sự vụ'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export const IncidentMatchDetailPage = ({
  listPath = '/manager/incident-matches',
  canDecide = true,
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const candidateId = params.candidateId || params.duplicateCandidateId || '';
  const activeRequestRef = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState('');
  const [dialogMode, setDialogMode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadCandidate = useCallback(async () => {
    activeRequestRef.current?.abort();
    if (!candidateId) {
      setCandidate(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    activeRequestRef.current = controller;
    setLoading(true);
    setLoadError('');
    setNotFound(false);

    try {
      const response = await incidentMatchApi.getCandidate(candidateId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!response) {
        setNotFound(true);
        setCandidate(null);
        return;
      }

      const primaryId = response?.feedbackId || response?.feedback?.feedbackId || response?.primaryFeedback?.feedbackId;
      const representativeId = response?.potentialParentFeedbackId
        || response?.potentialParentFeedback?.feedbackId
        || response?.duplicateFeedback?.feedbackId;
      const [primaryResult, representativeResult] = await Promise.allSettled([
        primaryId ? managementFeedbackApi.getFeedbackById(primaryId) : Promise.resolve(null),
        representativeId ? managementFeedbackApi.getFeedbackById(representativeId) : Promise.resolve(null),
      ]);
      if (controller.signal.aborted) return;

      setCandidate(mergeCandidateReports(
        response,
        primaryResult.status === 'fulfilled' ? primaryResult.value : null,
        representativeResult.status === 'fulfilled' ? representativeResult.value : null,
      ));
    } catch (error) {
      if (controller.signal.aborted || error?.code === 'ERR_CANCELED') return;
      setCandidate(null);
      if (error?.status === 404) setNotFound(true);
      else setLoadError(error?.message || 'Không thể tải đề xuất');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void loadCandidate();
    return () => activeRequestRef.current?.abort();
  }, [loadCandidate, reloadKey]);

  useEffect(() => {
    if (!dialogMode) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !submitting) setDialogMode('');
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [dialogMode, submitting]);

  const newReport = useMemo(() => getNewReport(candidate), [candidate]);
  const representativeReport = useMemo(() => getRepresentativeReport(candidate), [candidate]);
  const candidateIsPending = normalizeKey(candidate?.status) === 'pending';
  const confidence = getConfidence(candidate?.confidenceScore);
  const reasoning = getCandidateReasoning(candidate);
  const currentIncidentId = candidate?.currentIncidentId || candidate?.incidentId || '';
  const suggestedIncidentId = candidate?.suggestedIncidentId || '';

  const submitDecision = async () => {
    if (!candidateIsPending || !canDecide || !dialogMode) return;
    setSubmitting(true);
    setActionError('');
    try {
      if (dialogMode === 'confirm') await incidentMatchApi.confirmCandidate(candidateId);
      else await incidentMatchApi.rejectCandidate(candidateId);

      clearLegacyMatchCache();
      const successMessage = dialogMode === 'confirm'
        ? 'Đã xác nhận các Report cùng một sự vụ'
        : 'Đã xác nhận các Report thuộc hai sự vụ khác nhau';
      setDialogMode('');
      navigate(listPath, { replace: true, state: { successMessage } });
    } catch (error) {
      setActionError(error?.message || (dialogMode === 'confirm'
        ? 'Không thể xác nhận các Report cùng sự vụ'
        : 'Không thể xác nhận các Report khác sự vụ'));
      setDialogMode('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !candidate) {
    return (
      <article className="admin-page-shell space-y-6">
        <ManagerPageHeader title="Chi tiết đề xuất cùng sự vụ" description="Đang tải dữ liệu so sánh hai Report." icon={Lucide.ScanSearch} />
        <DetailSkeleton />
      </article>
    );
  }

  if (notFound) {
    return (
      <article className="admin-page-shell space-y-6">
        <ManagerEmptyState
          icon={Lucide.FileQuestion}
          title="Không tìm thấy đề xuất"
          description="Đề xuất không tồn tại hoặc không còn khả dụng trong phạm vi của bạn."
          action={<Button type="button" variant="outline" size="sm" onClick={() => navigate(listPath)}>Về danh sách đề xuất</Button>}
        />
      </article>
    );
  }

  if (loadError || !candidate) {
    return (
      <article className="admin-page-shell space-y-6">
        <ManagerEmptyState
          icon={Lucide.TriangleAlert}
          title="Không thể tải đề xuất"
          description={loadError || 'Đã xảy ra lỗi khi tải dữ liệu đề xuất.'}
          action={(
            <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
              <Lucide.RefreshCw size={15} aria-hidden="true" />
              Thử lại
            </Button>
          )}
        />
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-6 pb-8">
      <nav className="flex flex-wrap items-center gap-2 px-1 text-sm font-medium text-slate-500" aria-label="Đường dẫn trang">
        <Link to={listPath} className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">Đề xuất cùng sự vụ</Link>
        <Lucide.ChevronRight size={15} aria-hidden="true" />
        <span className="text-slate-800">Chi tiết đề xuất</span>
      </nav>

      {actionError ? <ErrorAlert message={actionError} onClose={() => setActionError('')} /> : null}

      <ManagerPageHeader
        title="Chi tiết đề xuất cùng sự vụ"
        description="So sánh Report mới với Report đại diện của sự vụ được đề xuất trước khi ra quyết định."
        icon={Lucide.ScanSearch}
        statusLabel="Trạng thái"
        statusValue={getCandidateStatusLabel(candidate?.status)}
        statusTone={candidateIsPending ? 'review' : normalizeKey(candidate?.status) === 'confirmed' ? 'success' : 'info'}
        actions={(
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(listPath)}>
            <Lucide.ArrowLeft size={16} aria-hidden="true" />
            Quay lại danh sách
          </Button>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tóm tắt đề xuất">
        <div className="admin-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Độ tin cậy AI</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatConfidence(candidate?.confidenceScore)}</p>
        </div>
        <div className="admin-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sự vụ hiện tại</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{formatId(currentIncidentId, 'SV-')}</p>
        </div>
        <div className="admin-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sự vụ được đề xuất</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{formatId(suggestedIncidentId, 'SV-')}</p>
        </div>
        <div className="admin-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Kết luận</p>
          <div className="mt-2"><Badge intent={getCandidateStatusIntent(candidate?.status)} className="px-3 py-1 text-xs font-semibold">{getCandidateStatusLabel(candidate?.status)}</Badge></div>
        </div>
      </section>

      <section className="admin-panel overflow-hidden" aria-labelledby="incident-match-comparison-title">
        <header className="border-b border-slate-200 bg-gradient-to-r from-blue-50/60 via-white to-emerald-50/60 px-5 py-5 sm:px-6">
          <h2 id="incident-match-comparison-title" className="text-lg font-semibold text-slate-950">So sánh hai Report</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Mỗi Report vẫn được lưu giữ để cung cấp nội dung, hình ảnh, vị trí và bối cảnh riêng cho sự vụ.</p>
        </header>
        <div className="grid divide-y divide-slate-200 xl:grid-cols-2 xl:divide-x xl:divide-y-0">
          <ReportPanel accent="blue" eyebrow="Report mới" report={newReport} />
          <ReportPanel accent="emerald" eyebrow="Report đại diện sự vụ được đề xuất" report={representativeReport} />
        </div>
      </section>

      <section className="admin-panel overflow-hidden" aria-labelledby="incident-match-ai-title">
        <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700" aria-hidden="true"><Lucide.Sparkles size={18} /></span>
            <div>
              <h2 id="incident-match-ai-title" className="text-lg font-semibold text-slate-950">Phân tích của AI</h2>
              <p className="mt-1 text-sm text-slate-500">Thông tin tham khảo từ đề xuất của backend.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm">
            <span className="text-slate-500">Độ tin cậy</span>
            <strong className="text-violet-700">{formatConfidence(candidate?.confidenceScore)}</strong>
          </div>
        </header>
        <div className="p-5 sm:p-6">
          {reasoning ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{reasoning}</p>
          ) : (
            <p className="text-sm text-slate-500">Backend chưa cung cấp nội dung giải thích cho đề xuất này.</p>
          )}
          {confidence !== null ? (
            <div className="mt-5" aria-label={`Độ tin cậy ${Math.round(confidence)} phần trăm`}>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-600" style={{ width: `${confidence}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {canDecide && candidateIsPending ? (
        <section className="sticky bottom-4 z-30 rounded-3xl border border-slate-200 bg-white/95 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:px-5" aria-labelledby="incident-match-decision-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quyết định của Manager</p>
              <h2 id="incident-match-decision-title" className="mt-1 text-sm font-semibold text-slate-900">Hai Report này có phản ánh cùng một sự vụ không?</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Quyết định không xóa Report; dữ liệu của cả hai Report vẫn được lưu giữ.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setDialogMode('reject')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100">
                <Lucide.Split size={16} aria-hidden="true" />
                Khác sự vụ
              </button>
              <Button type="button" size="md" onClick={() => setDialogMode('confirm')}>
                <Lucide.GitMerge size={17} aria-hidden="true" />
                Cùng sự vụ
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="admin-panel flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600" aria-hidden="true"><Lucide.LockKeyhole size={17} /></span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{candidateIsPending ? 'Chế độ chỉ xem' : 'Đề xuất đã được đánh giá'}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{candidateIsPending ? 'Quyết định Cùng sự vụ / Khác sự vụ thuộc quyền của Manager.' : 'Không còn hành động quyết định nào cho đề xuất này.'}</p>
            </div>
          </div>
          <Badge intent={getCandidateStatusIntent(candidate?.status)} className="self-start px-3 py-1 text-xs font-semibold sm:self-auto">{getCandidateStatusLabel(candidate?.status)}</Badge>
        </section>
      )}

      <DecisionDialog
        mode={dialogMode}
        open={Boolean(dialogMode)}
        submitting={submitting}
        destinationIncidentId={suggestedIncidentId}
        onClose={() => !submitting && setDialogMode('')}
        onConfirm={() => void submitDecision()}
      />
    </article>
  );
};

export const DuplicateDetailPage = () => (
  <IncidentMatchDetailPage listPath="/staff/duplicates" canDecide={false} />
);
