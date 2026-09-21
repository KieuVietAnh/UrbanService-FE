import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { managementTypes } from '@urbanmind/shared-types';
import PublicPageMotion from '../../components/public/PublicPageMotion';
import useTicketDetail from '../../hooks/useTicketDetail';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  Drainage: 'Thoát nước',
  'Garbage Collection': 'Thu gom rác',
  'Public Safety': 'An toàn công cộng',
  'Road Maintenance': 'Bảo trì đường bộ',
  'Street Lighting': 'Chiếu sáng đô thị',
  'Water Supply': 'Cấp nước',
};



// ─── Utilities ────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (start, end) => {
  if (!start || !end) return '—';
  const diffMs = new Date(end) - new Date(start);
  if (Number.isNaN(diffMs) || diffMs < 0) return '—';
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  return diffDays === 1 ? '1 ngày' : `${diffDays} ngày`;
};

const isVideoUrl = (url = '') => {
  const v = String(url).toLowerCase();
  return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some((ext) => v.includes(ext));
};

const isImageDocument = (document) => {
  const fileType = String(document?.fileType || '').toLowerCase();
  const fileUrl = String(document?.fileUrl || '').toLowerCase();

  return (
    fileType.startsWith('image/') ||
    fileType === 'image' ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(fileUrl)
  );
};

const normalizeImageList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return [value];
  return [];
};

const getCategoryLabel = (name) =>
  CATEGORY_LABELS[name] || name || 'Chưa phân loại';



const getRatingText = (value) => {
  switch (value) {
    case 1: return 'Rất không hài lòng';
    case 2: return 'Không hài lòng';
    case 3: return 'Bình thường';
    case 4: return 'Hài lòng';
    case 5: return 'Rất hài lòng';
    default: return '';
  }
};

const translateHistoryStatus = (status) => {
  switch (status) {
    case managementTypes.feedbackStatus.SUBMITTED:             return 'Đã tiếp nhận';
    case managementTypes.feedbackStatus.AI_REVIEWED:           return 'Đang phân loại';
    case managementTypes.feedbackStatus.VERIFIED:              return 'Đã xác minh';
    case managementTypes.feedbackStatus.ASSIGNED:              return 'Đã phân công';
    case managementTypes.feedbackStatus.IN_PROGRESS:           return 'Đang xử lý';
    case managementTypes.feedbackStatus.RESOLVED:
    case managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL: return 'Kiểm tra kết quả';
    case managementTypes.feedbackStatus.NEED_REWORK:           return 'Cần xử lý bổ sung';
    case managementTypes.feedbackStatus.APPROVED:              return 'Chờ đánh giá';
    case managementTypes.feedbackStatus.CLOSED:                return 'Đã đóng';
    case managementTypes.feedbackStatus.REJECTED:              return 'Không tiếp nhận';
    default:                                                   return status || 'Cập nhật';
  }
};

const translateHistoryNote = (note) => {
  if (!note) return '';
  const n = String(note).toLowerCase().trim();
  const map = [
    ['feedback created',        'Phản ánh đã được tạo.'],
    ['feedback submitted',      'Phản ánh đã được gửi.'],
    ['reviewed by ai',          'Hệ thống đã phân tích và phân loại phản ánh.'],
    ['feedback verified',       'Phản ánh đã được xác minh.'],
    ['submitted for approval',  'Kết quả đã được gửi để kiểm tra và phê duyệt.'],
    ['need rework',             'Kết quả cần được xử lý hoặc bổ sung thêm.'],
    ['assigned',                'Phản ánh đã được phân công cho đơn vị xử lý.'],
    ['in progress',             'Đơn vị phụ trách đang xử lý phản ánh.'],
    ['approved',                'Kết quả xử lý đã được phê duyệt.'],
    ['rejected',                'Phản ánh chưa đủ điều kiện để tiếp nhận xử lý.'],
    ['closed',                  'Phản ánh đã được đóng.'],
  ];
  const match = map.find(([kw]) => n.includes(kw));
  return match ? match[1] : String(note).trim();
};

const getCommentAuthor = (c) =>
  c?.userName || c?.authorName || c?.createdByName || c?.fullName || 'Người dùng';

const getCommentContent = (c) =>
  c?.content || c?.message || c?.text || c?.comment || '';

const getCommentTimestamp = (c) => {
  const t = new Date(c?.createdAt || c?.createdDate || c?.timestamp || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const getCommentKey = (c, i) =>
  String(c?.commentId || c?.id || `${getCommentAuthor(c)}-${getCommentTimestamp(c)}-${i}`);

// ─── Sub-components ───────────────────────────────────────────────────────────

const ResultPageShell = ({ children }) => (
  <PublicPageMotion>
    <div data-public-reveal className="text-[var(--public-title)]">
      {children}
    </div>
  </PublicPageMotion>
);

const ResultSmartCityBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <svg
      viewBox="0 0 1400 320"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full text-primary"
      fill="none"
    >
      <path
        d="M-40 250C135 210 185 72 365 96C515 116 515 260 690 243C836 229 856 81 1018 90C1165 98 1192 214 1445 142"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.075"
      />
      <path
        d="M-15 278C180 238 222 129 397 145C564 160 614 294 786 262C934 234 964 126 1131 124C1250 122 1320 171 1435 188"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="9 12"
        strokeOpacity="0.06"
      />
      <circle cx="365" cy="96" r="7" fill="currentColor" fillOpacity="0.075" />
      <circle cx="690" cy="243" r="9" fill="currentColor" fillOpacity="0.06" />
      <circle cx="1018" cy="90" r="6" fill="currentColor" fillOpacity="0.09" />
      <circle cx="1131" cy="124" r="18" stroke="currentColor" strokeOpacity="0.06" />
    </svg>
    <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-secondary/[0.045] blur-3xl" />
    <div className="absolute -bottom-28 right-[10%] h-72 w-72 rounded-full bg-info/[0.065] blur-3xl" />
    <span className="absolute left-[56%] top-[18%] hidden h-8 w-8 items-center justify-center rounded-full border border-primary/10 bg-base-100/55 text-primary/35 shadow-sm backdrop-blur lg:flex">
      <Lucide.MapPin size={14} />
    </span>
    <span className="absolute bottom-[16%] left-[66%] hidden h-7 w-7 items-center justify-center rounded-full border border-success/10 bg-base-100/55 text-success/35 shadow-sm backdrop-blur lg:flex">
      <Lucide.Check size={13} />
    </span>
    <span className="absolute right-[22%] top-[16%] hidden h-7 w-7 items-center justify-center rounded-full border border-secondary/10 bg-base-100/55 text-secondary/35 shadow-sm backdrop-blur lg:flex">
      <Lucide.Radio size={13} />
    </span>
  </div>
);

const ResultSkeleton = () => (
  <ResultPageShell>
    <main className="space-y-4" aria-busy="true" aria-label="Đang tải kết quả xử lý">
      <section className="relative h-[200px] overflow-hidden rounded-[30px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[var(--public-shadow)]">
        <ResultSmartCityBackdrop />
        <div className="relative grid h-full gap-6 px-6 py-7 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-7 w-28 animate-pulse rounded-full bg-base-content/8" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-base-content/8" />
            </div>
            <div className="h-9 w-[min(480px,72%)] animate-pulse rounded-xl bg-base-content/10" />
            <div className="flex flex-wrap gap-3">
              <div className="h-7 w-32 animate-pulse rounded-xl bg-base-content/8" />
              <div className="h-7 w-40 animate-pulse rounded-xl bg-base-content/8" />
            </div>
          </div>
          <div className="hidden h-32 animate-pulse rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] xl:block" />
        </div>
      </section>
      <section className="h-36 animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          <section className="h-48 animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
          <section className="h-64 animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
          <section className="h-48 animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
        </div>
        <div className="space-y-4">
          <section className="h-64 animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
          <section className="h-48 animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
        </div>
      </div>
    </main>
  </ResultPageShell>
);

// ─── Journey Steps (progress tracker) ────────────────────────────────────────

const JOURNEY_STEPS = [
  {
    title: 'Đã tiếp nhận',
    description: 'Hồ sơ đã được ghi nhận',
    statuses: [
      managementTypes.feedbackStatus.SUBMITTED,
      managementTypes.feedbackStatus.AI_REVIEWED,
      managementTypes.feedbackStatus.VERIFIED,
    ],
    icon: Lucide.Inbox,
  },
  {
    title: 'Đang xử lý',
    description: 'Đơn vị phụ trách thực hiện',
    statuses: [
      managementTypes.feedbackStatus.ASSIGNED,
      managementTypes.feedbackStatus.IN_PROGRESS,
      managementTypes.feedbackStatus.NEED_REWORK,
    ],
    icon: Lucide.Wrench,
  },
  {
    title: 'Kiểm tra kết quả',
    description: 'Kết quả đang được rà soát',
    statuses: [
      managementTypes.feedbackStatus.RESOLVED,
      managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
    ],
    icon: Lucide.ClipboardCheck,
  },
  {
    title: 'Hoàn tất',
    description: 'Chờ đánh giá hoặc đã đóng',
    statuses: [
      managementTypes.feedbackStatus.APPROVED,
      managementTypes.feedbackStatus.CLOSED,
    ],
    icon: Lucide.CircleCheckBig,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const ResolutionResultPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    ticket,
    comments,
    history,
    chatInput,
    setChatInput,
    loading,
    error,
    handleSendChat,
    handleRateSubmit,
    rating,
    setRating,
    satisfied,
    setSatisfied,
    reviewComment,
    setReviewComment,
    ratingLoading,
    getAttachmentUrl,
  } = useTicketDetail(feedbackId, user);

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [visibleCommentCount, setVisibleCommentCount] = useState(5);
  const commentInputRef = useRef(null);

  // ── Derived images ──────────────────────────────────────────────────────────
  const beforeImages = useMemo(() => {
    return normalizeImageList(ticket?.attachments || [])
      .map((f) => getAttachmentUrl(f))
      .filter(Boolean);
  }, [ticket, getAttachmentUrl]);

  const afterImages = useMemo(() => {
    const documents = Array.isArray(ticket?.resolution?.completionDocuments)
      ? ticket.resolution.completionDocuments
      : [];

    return documents
      .filter(isImageDocument)
      .map((document) => getAttachmentUrl(document))
      .filter(Boolean);
  }, [ticket, getAttachmentUrl]);

  // ── Derived resolution data ─────────────────────────────────────────────────
  const latestResolutionHistory = useMemo(() => {
    const items = Array.isArray(ticket?.statusHistories) ? [...ticket.statusHistories] : [];
    const relevant = new Set([
      managementTypes.feedbackStatus.RESOLVED,
      managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
      managementTypes.feedbackStatus.APPROVED,
      managementTypes.feedbackStatus.CLOSED,
    ]);
    return items
      .filter((h) => relevant.has(h?.newStatus || h?.status))
      .sort((a, b) => new Date(b?.changedAt || 0) - new Date(a?.changedAt || 0))[0] || null;
  }, [ticket]);

  const resolutionDate =
    ticket?.resolution?.resolvedAt ||
    latestResolutionHistory?.changedAt ||
    ticket?.updatedAt ||
    ticket?.resolvedAt ||
    ticket?.createdAt;

  const resolutionSummary =
    ticket?.resolution?.resolutionSummary ||
    ticket?.resolution?.summary ||
    latestResolutionHistory?.note ||
    '';

  const processingDuration = useMemo(
    () => formatDuration(ticket?.createdAt, resolutionDate),
    [ticket, resolutionDate],
  );

  // ── History list ────────────────────────────────────────────────────────────
  const sortedHistory = useMemo(
    () => (Array.isArray(history)
      ? [...history].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
      : []),
    [history],
  );
  const visibleHistory = historyExpanded ? sortedHistory : sortedHistory.slice(-3);

  // ── Comments ────────────────────────────────────────────────────────────────
  const orderedComments = useMemo(
    () => (Array.isArray(comments) ? [...comments].sort(
      (a, b) => getCommentTimestamp(b) - getCommentTimestamp(a)
    ) : []),
    [comments],
  );
  const visibleComments = orderedComments.slice(0, visibleCommentCount);
  const hiddenCommentCount = Math.max(0, orderedComments.length - visibleComments.length);

  // ── Status/journey ──────────────────────────────────────────────────────────
  const journeyIndex = Math.max(
    0,
    JOURNEY_STEPS.findIndex((step) => step.statuses.includes(ticket?.status)),
  );

  const isCompleted = [
    managementTypes.feedbackStatus.APPROVED,
    managementTypes.feedbackStatus.CLOSED,
  ].includes(ticket?.status);

  const canSubmitReview = ticket?.status === managementTypes.feedbackStatus.APPROVED;
  const alreadyRated = ticket?.status === managementTypes.feedbackStatus.CLOSED;

  // ── Author / metadata ───────────────────────────────────────────────────────


  const locationText =
    ticket?.locationText ||
    ticket?.areaName ||
    ticket?.wardName ||
    'Chưa có thông tin địa điểm';

  const createdAt = ticket?.createdAt || ticket?.submittedAt;
  const operatorName = ticket?.assignment?.operatorName || ticket?.resolution?.operatorName || '';
  const commentCount = orderedComments.length || Number(ticket?.commentCount || 0);

  // ── Status label/tone for aside card ───────────────────────────────────────
  const statusLabel = isCompleted
    ? (alreadyRated ? 'Đã đóng' : 'Chờ đánh giá')
    : (ticket?.status === managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL
        ? 'Đang kiểm duyệt'
        : 'Đang xử lý');

  const statusTone = alreadyRated
    ? 'border-base-300 bg-base-200/55 text-base-content/65'
    : isCompleted
      ? 'border-success/25 bg-success/10 text-success'
      : 'border-warning/30 bg-warning/10 text-warning';

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading && !ticket) {
    return <ResultSkeleton />;
  }

  if (!ticket) {
    return (
      <ResultPageShell>
        <main className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] px-6 py-16 text-center shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <Lucide.FileWarning size={34} className="mx-auto text-base-content/35" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-bold">Không thể xem kết quả</h1>
          <p className="mt-2 text-sm text-base-content/55">
            {error || 'Chúng tôi không tìm thấy phản ánh này hoặc bạn chưa có quyền xem.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="btn admin-primary-action mt-5 rounded-2xl"
          >
            Quay lại danh sách
          </button>
        </main>
      </ResultPageShell>
    );
  }

  return (
    <ResultPageShell>
      <main className="relative isolate space-y-4 text-[var(--public-title)]">
        {/* Page-level soft background */}
        <div
          className="pointer-events-none absolute -inset-x-3 -inset-y-4 -z-10 overflow-hidden rounded-[36px] border border-[var(--public-border-soft)] bg-[linear-gradient(180deg,var(--public-surface-soft),transparent)] sm:-inset-x-5 sm:-inset-y-5"
          aria-hidden="true"
        />

        {/* ── RESULT OVERVIEW ───────────────────────────────────────────── */}
        <article className="relative overflow-hidden rounded-[28px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_82%_0%,rgba(37,99,235,0.11),transparent_44%)]" aria-hidden="true" />

          <div className="relative p-5 sm:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <header className="min-w-0 max-w-4xl">
                <button
                  type="button"
                  onClick={() => navigate(`/tickets/${feedbackId}`)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-3 text-sm font-semibold text-[var(--public-copy)] transition hover:border-primary/25 hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <Lucide.ArrowLeft size={15} aria-hidden="true" />
                  Quay lại chi tiết
                </button>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 text-xs font-semibold text-primary">
                    <Lucide.ClipboardCheck size={13} aria-hidden="true" />
                    Kết quả xử lý
                  </span>
                  {ticket.categoryName && (
                    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-3 text-xs font-semibold text-[var(--public-copy)]">
                      <Lucide.Tag size={13} aria-hidden="true" />
                      {getCategoryLabel(ticket.categoryName)}
                    </span>
                  )}
                  <span className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${statusTone}`}>
                    <Lucide.CircleCheck size={13} aria-hidden="true" />
                    {statusLabel}
                  </span>
                </div>

                <h1 className="mt-4 text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] sm:text-[2.35rem]">
                  {ticket.title || 'Kết quả xử lý phản ánh'}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--public-copy)]">
                  {resolutionSummary || 'Kết quả xử lý đã được cập nhật. Bạn có thể xem minh chứng, tiến độ và gửi đánh giá ở bên dưới.'}
                </p>
              </header>

              <aside className="w-full shrink-0 xl:w-[320px]">
                <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-4">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${statusTone}`}>
                      {alreadyRated
                        ? <Lucide.Archive size={18} aria-hidden="true" />
                        : <Lucide.CircleCheck size={18} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--public-muted)]">Trạng thái kết quả</p>
                      <p className="mt-1 text-base font-bold text-[var(--public-title)]">{statusLabel}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">
                        {alreadyRated ? 'Phản ánh đã hoàn tất quy trình.' : canSubmitReview ? 'Kết quả đã được duyệt và đang chờ đánh giá của bạn.' : 'Kết quả đang trong quá trình hoàn tất.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[var(--public-border)] bg-[var(--public-surface)] px-3 py-2.5">
                      <p className="text-[10px] text-[var(--public-muted)]">Hoàn tất</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--public-title)]">{formatDate(resolutionDate)}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--public-border)] bg-[var(--public-surface)] px-3 py-2.5">
                      <p className="text-[10px] text-[var(--public-muted)]">Thời gian xử lý</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--public-title)]">{processingDuration}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-6 grid gap-3 border-t border-[var(--public-border)] pt-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <Lucide.MapPin size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--public-muted)]">Vị trí</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-[var(--public-title)]" title={locationText}>{locationText}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <Lucide.CalendarDays size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--public-muted)]">Ngày gửi</p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--public-title)]">{formatDate(createdAt)}</p>
                </div>
              </div>

              {operatorName && (
                <div className="flex items-center gap-3 sm:col-span-2 xl:col-span-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <Lucide.Building2 size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--public-muted)]">Đơn vị xử lý</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--public-title)]">{operatorName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* ── COMPACT PROGRESS ───────────────────────────────────────────── */}
        <section
          className="rounded-[22px] border border-[var(--public-border)] bg-[var(--public-surface)] px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)] sm:px-5"
          aria-labelledby="result-progress-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="result-progress-title" className="text-sm font-bold">Tiến độ xử lý</h2>
              <p className="mt-0.5 text-xs text-[var(--public-muted)]">Các mốc chính từ tiếp nhận đến hoàn tất.</p>
            </div>
            <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
              {isCompleted ? 'Đã hoàn tất' : `Bước ${journeyIndex + 1}/${JOURNEY_STEPS.length}`}
            </span>
          </div>

          <ol className="mt-4 grid gap-2 sm:grid-cols-4">
            {JOURNEY_STEPS.map((step, index) => {
              const completed = isCompleted ? true : index < journeyIndex;
              const active = !isCompleted && index === journeyIndex;
              return (
                <li key={step.title} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${completed || active ? 'border-primary/15 bg-primary/[0.035]' : 'border-[var(--public-border)] bg-[var(--public-surface-strong)]'}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${completed ? 'bg-primary text-primary-content' : active ? 'bg-primary/12 text-primary' : 'bg-base-content/5 text-base-content/35'}`}>
                    {completed ? <Lucide.Check size={14} aria-hidden="true" /> : <span className="text-[11px] font-bold">{index + 1}</span>}
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-semibold ${completed || active ? 'text-[var(--public-title)]' : 'text-[var(--public-muted)]'}`}>{step.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--public-muted)]">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── SECTION 3: 2-COLUMN MAIN GRID ───────────────────────────────── */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">

          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Resolution Summary */}
            <section
              className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5"
              aria-labelledby="resolution-summary-title"
            >
              <header className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success" aria-hidden="true">
                  <Lucide.CheckCircle2 size={19} />
                </span>
                <div>
                  <h2 id="resolution-summary-title" className="text-lg font-bold">Kết quả xử lý</h2>
                  <p className="mt-0.5 text-xs text-base-content/55">Mô tả chính thức từ đơn vị phụ trách</p>
                </div>
              </header>

              <div className="mt-4 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 py-4 sm:px-5">
                {resolutionSummary ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-base-content/75">
                    {resolutionSummary}
                  </p>
                ) : (
                  <p className="text-sm leading-7 text-base-content/55 italic">
                    Phản ánh đã được đơn vị phụ trách hoàn tất xử lý. Hiện chưa có mô tả chi tiết bổ sung.
                  </p>
                )}
              </div>

              {operatorName && (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] px-4 py-3">
                  <Lucide.Building2 size={16} className="shrink-0 text-[var(--public-muted)]" aria-hidden="true" />
                  <span className="text-xs font-medium text-[var(--public-muted)]">Đơn vị xử lý</span>
                  <span className="ml-auto text-sm font-semibold text-[var(--public-title)]">{operatorName}</span>
                </div>
              )}
            </section>

            {/* Before / After Evidence */}
            <section
              className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5"
              aria-labelledby="evidence-title"
            >
              <h2 id="evidence-title" className="text-lg font-bold">So sánh trước và sau</h2>
              <p className="mt-1 text-sm text-base-content/55">
                Hình ảnh giúp bạn thấy sự thay đổi thực tế sau khi đơn vị xử lý hoàn tất.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Before */}
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-content/80">
                    <Lucide.ImagePlus size={15} className="text-rose-500" aria-hidden="true" />
                    Trước khi xử lý
                  </div>
                  {beforeImages[0] ? (
                    <div className="overflow-hidden rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)]">
                      {isVideoUrl(beforeImages[0]) ? (
                        <video
                          controls
                          className="h-56 w-full object-cover sm:h-64"
                          src={beforeImages[0]}
                          aria-label="Video trước khi xử lý"
                        />
                      ) : (
                        <img
                          src={beforeImages[0]}
                          alt="Hình ảnh trước khi xử lý"
                          className="h-56 w-full object-cover sm:h-64"
                          loading="lazy"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] text-center sm:h-64">
                      <Lucide.ImageOff size={22} className="text-base-content/25" aria-hidden="true" />
                      <p className="text-xs text-base-content/45">Không có hình ảnh trước xử lý</p>
                    </div>
                  )}

                  {/* Additional before images */}
                  {beforeImages.length > 1 && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {beforeImages.slice(1, 4).map((img, idx) => (
                        <div
                          key={`before-extra-${idx}`}
                          className="overflow-hidden rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-soft)]"
                        >
                          <img
                            src={img}
                            alt={`Hình ảnh trước ${idx + 2}`}
                            className="h-20 w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* After */}
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-content/80">
                    <Lucide.CheckCircle2 size={15} className="text-success" aria-hidden="true" />
                    Sau khi xử lý
                  </div>
                  {afterImages[0] ? (
                    <div className="overflow-hidden rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)]">
                      {isVideoUrl(afterImages[0]) ? (
                        <video
                          controls
                          className="h-56 w-full object-cover sm:h-64"
                          src={afterImages[0]}
                          aria-label="Video sau khi xử lý"
                        />
                      ) : (
                        <img
                          src={afterImages[0]}
                          alt="Hình ảnh sau khi xử lý"
                          className="h-56 w-full object-cover sm:h-64"
                          loading="lazy"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] text-center sm:h-64">
                      <Lucide.ImagePlus size={22} className="text-base-content/25" aria-hidden="true" />
                      <p className="text-xs font-semibold text-base-content/45">Chưa có hình ảnh sau xử lý</p>
                      <p className="max-w-[160px] text-[11px] text-base-content/35 leading-4">
                        Hình ảnh sẽ được cập nhật khi có sẵn.
                      </p>
                    </div>
                  )}

                  {/* Additional after images */}
                  {afterImages.length > 1 && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {afterImages.slice(1, 4).map((img, idx) => (
                        <div
                          key={`after-extra-${idx}`}
                          className="overflow-hidden rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-soft)]"
                        >
                          <img
                            src={img}
                            alt={`Hình ảnh sau ${idx + 2}`}
                            className="h-20 w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Processing History */}
            <section
              className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5"
              aria-labelledby="history-title"
            >
              <header>
                <h2 id="history-title" className="text-lg font-bold">Lịch sử cập nhật</h2>
                <p className="mt-1 text-sm text-base-content/60">Các thay đổi được ghi nhận theo thứ tự thời gian.</p>
              </header>

              {sortedHistory.length > 0 ? (
                <>
                  <ol className="mt-4">
                    {visibleHistory.map((item, index) => (
                      <li
                        key={item?.historyId || index}
                        className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-4 last:pb-0"
                      >
                        {index !== visibleHistory.length - 1 && (
                          <span
                            className="absolute bottom-0 left-[15px] top-8 w-px bg-base-300"
                            aria-hidden="true"
                          />
                        )}
                        <span className="relative z-10 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                          <Lucide.Check size={14} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 border-b border-base-300 pb-3 last:border-b-0">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold">
                              {translateHistoryStatus(item?.newStatus || item?.status)}
                            </p>
                            <time
                              dateTime={item?.changedAt || undefined}
                              className="text-xs text-base-content/52"
                            >
                              {formatDate(item?.changedAt)}
                            </time>
                          </div>
                          {(item?.note || item?.description) && (
                            <p className="mt-1.5 text-sm leading-6 text-base-content/58">
                              {translateHistoryNote(item?.note || item?.description)}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  {sortedHistory.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setHistoryExpanded((v) => !v)}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:underline"
                    >
                      {historyExpanded ? (
                        <>Thu gọn lịch sử <Lucide.ChevronUp size={15} aria-hidden="true" /></>
                      ) : (
                        <>Xem toàn bộ {sortedHistory.length} cập nhật <Lucide.ChevronDown size={15} aria-hidden="true" /></>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-base-300 bg-base-200/25 px-5 py-8 text-center text-sm text-base-content/55">
                  Chưa có lịch sử cập nhật.
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Resident Rating */}
            <section
              className={`relative overflow-hidden rounded-[24px] border bg-[var(--public-surface)] shadow-[0_14px_34px_rgba(15,23,42,0.07)] ${
                alreadyRated
                  ? 'border-[var(--public-border)]'
                  : canSubmitReview
                    ? 'border-primary/20'
                    : 'border-[var(--public-border)]'
              }`}
              aria-labelledby="rating-title"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_90%_0%,rgba(37,99,235,0.10),transparent_45%)]" aria-hidden="true" />
              <div className="relative p-4 sm:p-5">
                <header className="flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      alreadyRated ? 'bg-base-content/5 text-base-content/45' : 'bg-primary/10 text-primary'
                    }`}
                    aria-hidden="true"
                  >
                    <Lucide.Star size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--public-muted)]">Phản hồi của bạn</p>
                    <h2 id="rating-title" className="mt-1 text-lg font-bold">Đánh giá kết quả xử lý</h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">
                      Đánh giá của bạn giúp cải thiện chất lượng xử lý phản ánh.
                    </p>
                  </div>
                </header>

                {canSubmitReview ? (
                  <form onSubmit={handleRateSubmit} className="mt-5 space-y-4">
                    <fieldset className="rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 py-4">
                      <legend className="px-1 text-xs font-semibold text-[var(--public-muted)]">Mức độ hài lòng</legend>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <label key={value} className="group flex flex-1 cursor-pointer justify-center">
                            <input
                              type="radio"
                              name="result-rating"
                              value={value}
                              checked={rating === value}
                              onChange={() => setRating(value)}
                              className="peer sr-only"
                              aria-label={`${value} sao`}
                            />
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:bg-warning/8 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/35">
                              <Lucide.Star
                                size={28}
                                className={`transition ${
                                  rating >= value
                                    ? 'fill-warning text-warning'
                                    : 'text-base-content/18'
                                }`}
                                aria-hidden="true"
                              />
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 min-h-5 text-center">
                        <p className={`text-xs font-semibold ${rating > 0 ? 'text-warning' : 'text-[var(--public-muted)]'}`}>
                          {rating > 0 ? getRatingText(rating) : 'Chọn từ 1 đến 5 sao'}
                        </p>
                      </div>
                    </fieldset>

                    <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${satisfied ? 'border-success/25 bg-success/[0.055]' : 'border-[var(--public-border)] bg-[var(--public-surface-strong)]'}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${satisfied ? 'bg-success/10 text-success' : 'bg-base-content/5 text-base-content/45'}`}>
                        <Lucide.ThumbsUp size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">Tôi hài lòng với kết quả này</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--public-muted)]">Xác nhận nhanh mức độ hài lòng của bạn.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={satisfied}
                        onChange={(e) => setSatisfied(e.target.checked)}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                    </label>

                    <label className="block rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] p-3.5">
                      <span className="text-sm font-semibold">Ý kiến thêm</span>
                      <span className="mt-0.5 block text-[11px] text-[var(--public-muted)]">Không bắt buộc, nhưng sẽ hữu ích cho đơn vị xử lý.</span>
                      <textarea
                        rows="4"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Chia sẻ nhận xét về kết quả xử lý..."
                        className="textarea textarea-bordered mt-3 min-h-[104px] w-full resize-y rounded-xl border-[var(--public-border)] bg-[var(--public-surface)] text-sm focus:border-primary/40 focus:outline-none"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={ratingLoading}
                      className="btn admin-primary-action h-11 min-h-11 w-full rounded-xl"
                    >
                      {ratingLoading
                        ? <span className="loading loading-spinner loading-sm" />
                        : <Lucide.Send size={15} aria-hidden="true" />}
                      Gửi đánh giá
                    </button>
                  </form>
                ) : alreadyRated ? (
                  <div className="mt-5 rounded-2xl border border-success/20 bg-success/[0.055] px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                        <Lucide.CircleCheck size={18} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Đánh giá đã được ghi nhận</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">Cảm ơn bạn đã phản hồi về kết quả xử lý phản ánh này.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 py-4 text-sm text-[var(--public-muted)]">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
                        <Lucide.Info size={16} aria-hidden="true" />
                      </span>
                      <p className="leading-6">Kết quả cần được phê duyệt trước khi bạn có thể gửi đánh giá.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Community Discussion */}
            <section
              id="result-comments"
              className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5"
              aria-labelledby="comments-title"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="comments-title" className="text-base font-bold">Trao đổi về phản ánh</h2>
                  <p className="mt-0.5 text-xs text-base-content/55">
                    Trao đổi thêm về kết quả xử lý của phản ánh này.
                  </p>
                </div>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 text-xs font-semibold text-primary">
                  <Lucide.MessageCircle size={13} aria-hidden="true" />
                  {commentCount}
                </span>
              </header>

              {/* Compose */}
              <form
                onSubmit={handleSendChat}
                className="mt-4 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-content shadow-sm">
                    {(user?.fullName || user?.name || 'Bạn').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <label htmlFor="result-comment-input" className="sr-only">
                      Bạn nghĩ gì về kết quả xử lý?
                    </label>
                    <textarea
                      ref={commentInputRef}
                      id="result-comment-input"
                      rows="2"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Bạn nghĩ gì về kết quả xử lý?"
                      className="textarea textarea-bordered min-h-[64px] max-h-36 w-full resize-y rounded-xl border-[var(--public-border)] bg-[var(--public-surface)] px-3 py-2.5 text-sm leading-6 focus:border-primary/40 focus:outline-none"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={!chatInput?.trim()}
                        className="btn admin-primary-action h-9 min-h-9 rounded-xl px-4 text-xs"
                      >
                        <Lucide.Send size={13} aria-hidden="true" />
                        Gửi bình luận
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Comment list */}
              <div className="mt-4">
                {visibleComments.length > 0 ? (
                  <div className="space-y-3">
                    {visibleComments.map((comment, index) => {
                      const author = getCommentAuthor(comment);
                      const content = getCommentContent(comment);
                      return (
                        <article
                          key={getCommentKey(comment, index)}
                          className="grid grid-cols-[36px_minmax(0,1fr)] gap-3"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-xs font-bold text-secondary">
                            {author.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 rounded-2xl rounded-tl-md border border-base-300 bg-base-100 px-3 py-2.5 shadow-sm transition hover:border-primary/15">
                            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <p className="truncate text-xs font-semibold text-base-content">{author}</p>
                              <time
                                dateTime={comment?.createdAt || undefined}
                                className="shrink-0 text-[11px] text-base-content/42"
                              >
                                {formatDate(comment?.createdAt)}
                              </time>
                            </header>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-base-content/68">
                              {content || 'Bình luận không có nội dung.'}
                            </p>
                          </div>
                        </article>
                      );
                    })}

                    {/* Load more */}
                    {(hiddenCommentCount > 0 || (visibleCommentCount > 5 && orderedComments.length > 5)) && (
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        {hiddenCommentCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setVisibleCommentCount((c) => c + 5)}
                            className="btn btn-outline btn-sm rounded-xl px-4"
                          >
                            <Lucide.MessageSquareMore size={14} aria-hidden="true" />
                            Xem thêm {Math.min(5, hiddenCommentCount)} bình luận
                          </button>
                        )}
                        {visibleCommentCount > 5 && orderedComments.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setVisibleCommentCount(5)}
                            className="btn btn-ghost btn-sm rounded-xl px-4 text-base-content/55"
                          >
                            <Lucide.ChevronUp size={14} aria-hidden="true" />
                            Thu gọn
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] px-4 py-8 text-center">
                    <Lucide.MessagesSquare size={22} className="text-base-content/25" aria-hidden="true" />
                    <p className="text-sm font-semibold text-base-content/60">Chưa có bình luận nào</p>
                    <p className="max-w-[200px] text-xs leading-5 text-base-content/42">
                      Hãy là người đầu tiên chia sẻ.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </ResultPageShell>
  );
};