import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { managementTypes } from '@urbanmind/shared-types';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import useTicketDetail from '../../hooks/useTicketDetail';
import { getCommunityFeedDetail } from '../../services/api/feedApi';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { patchCommunityFeedCacheItem } from '../../services/cache/communityFeedCache';
import SupportButton from '../../components/community/SupportButton';
import PublicPageMotion from '../../components/public/PublicPageMotion';

const CATEGORY_LABELS = {
  'garbage collection': 'Thu gom rác',
  'waste management': 'Quản lý chất thải',
  'road maintenance': 'Bảo trì đường bộ',
  'street lighting': 'Chiếu sáng đô thị',
  drainage: 'Thoát nước',
  'water supply': 'Cấp nước',
  'public safety': 'An toàn công cộng',
};

const STATUS_META = {
  [managementTypes.feedbackStatus.VERIFIED]: {
    label: 'Đã xác minh',
    description: 'Thông tin phản ánh đã được kiểm tra và công khai.',
    icon: Lucide.BadgeCheck,
    className: 'border-info/20 bg-info/10 text-info',
  },
  [managementTypes.feedbackStatus.ASSIGNED]: {
    label: 'Đã chuyển xử lý',
    description: 'Phản ánh đã được chuyển đến đơn vị phụ trách.',
    icon: Lucide.SendToBack,
    className: 'border-secondary/20 bg-secondary/10 text-secondary',
  },
  [managementTypes.feedbackStatus.IN_PROGRESS]: {
    label: 'Đang xử lý',
    description: 'Đơn vị phụ trách đang thực hiện xử lý.',
    icon: Lucide.LoaderCircle,
    className: 'border-warning/25 bg-warning/10 text-warning',
  },
  [managementTypes.feedbackStatus.NEED_REWORK]: {
    label: 'Đang bổ sung kết quả',
    description: 'Kết quả đang được bổ sung hoặc thực hiện lại.',
    icon: Lucide.RotateCcw,
    className: 'border-warning/25 bg-warning/10 text-warning',
  },
  [managementTypes.feedbackStatus.RESOLVED]: {
    label: 'Đã có kết quả',
    description: 'Đơn vị xử lý đã gửi kết quả để kiểm tra.',
    icon: Lucide.ClipboardCheck,
    className: 'border-success/20 bg-success/10 text-success',
  },
  [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: {
    label: 'Đang kiểm tra kết quả',
    description: 'Kết quả xử lý đang được rà soát.',
    icon: Lucide.SearchCheck,
    className: 'border-secondary/20 bg-secondary/10 text-secondary',
  },
  [managementTypes.feedbackStatus.APPROVED]: {
    label: 'Đã phê duyệt',
    description: 'Kết quả xử lý đã được phê duyệt.',
    icon: Lucide.CircleCheck,
    className: 'border-success/20 bg-success/10 text-success',
  },
  [managementTypes.feedbackStatus.CLOSED]: {
    label: 'Đã đóng',
    description: 'Phản ánh đã hoàn tất toàn bộ quy trình.',
    icon: Lucide.Archive,
    className: 'border-base-300 bg-base-200 text-base-content/65',
  },
};

const JOURNEY_STEPS = [
  {
    title: 'Đã xác minh',
    description: 'Thông tin được công khai',
    statuses: [managementTypes.feedbackStatus.VERIFIED],
    icon: Lucide.BadgeCheck,
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
    description: 'Kết quả đã được duyệt',
    statuses: [
      managementTypes.feedbackStatus.APPROVED,
      managementTypes.feedbackStatus.CLOSED,
    ],
    icon: Lucide.CircleCheckBig,
  },
];

const getStatusLabel = (value) => {
  const statusMeta = STATUS_META[value];
  if (statusMeta?.label) return statusMeta.label;

  const normalizedValue = String(value || '').trim();
  return normalizedValue || 'Đang cập nhật';
};

const translateCategoryName = (categoryName) => {
  const normalizedCategory = String(categoryName || '')
    .trim()
    .toLocaleLowerCase('en-US');

  return CATEGORY_LABELS[normalizedCategory] ||
    categoryName ||
    'Chưa phân loại';
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa rõ thời gian';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const isVideoAttachment = (attachment, resolvedUrl = '') => {
  const mimeType = String(
    attachment?.mimeType ||
    attachment?.contentType ||
    attachment?.fileType ||
    ''
  ).toLowerCase();
  const normalizedUrl = String(resolvedUrl)
    .toLowerCase()
    .split('?')[0];

  return (
    mimeType.startsWith('video/') ||
    ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(
      (extension) => normalizedUrl.endsWith(extension)
    )
  );
};

const getCommentId = (comment, index) => (
  comment?.commentId || comment?.id || `${comment?.createdAt || 'comment'}-${index}`
);

const getCommentAuthor = (comment) => (
  comment?.userName ||
  comment?.authorName ||
  comment?.createdByName ||
  comment?.fullName ||
  'Người dân'
);

const getCommentContent = (comment) => (
  comment?.content ||
  comment?.text ||
  comment?.comment ||
  comment?.message ||
  ''
);

const getCommentTimestamp = (comment) => {
  const timestamp = new Date(
    comment?.createdAt ||
    comment?.createdDate ||
    comment?.timestamp ||
    0
  ).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const normalizeCommentText = (value) => (
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi-VN')
);

const DetailSmartCityBackdrop = () => (
  <div
    className="pointer-events-none absolute inset-0 overflow-hidden"
    aria-hidden="true"
  >
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
      <path
        d="M722 -25C761 70 742 145 802 207C872 278 1014 280 1075 194C1129 118 1091 38 1173 -28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.055"
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

const CommunityDetailShell = ({ children }) => (
  <PublicPageMotion>
    <div data-public-reveal className="text-[var(--public-title)]">
      {children}
    </div>
  </PublicPageMotion>
);

const DetailBackButton = ({ label, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-3 text-xs font-semibold text-[var(--public-copy)] shadow-sm transition hover:-translate-x-0.5 hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${className}`}
    aria-label={label}
  >
    <Lucide.ArrowLeft
      size={15}
      className="transition-transform group-hover:-translate-x-0.5"
      aria-hidden="true"
    />
    <span>{label}</span>
  </button>
);

const dedupeComments = (commentItems = []) => {
  const uniqueComments = [];
  const seenIds = new Set();
  const recentFingerprints = new Map();

  commentItems.forEach((comment, index) => {
    const rawId = comment?.commentId || comment?.id;
    const commentId = rawId ? String(rawId) : '';
    const author = normalizeCommentText(getCommentAuthor(comment));
    const content = normalizeCommentText(getCommentContent(comment));
    const timestamp = getCommentTimestamp(comment);
    const fingerprint = `${author}::${content}`;

    if (commentId && seenIds.has(commentId)) return;

    const previousTimestamp = recentFingerprints.get(fingerprint);
    const likelyOptimisticDuplicate = (
      fingerprint !== '::' &&
      previousTimestamp !== undefined &&
      (
        timestamp === 0 ||
        previousTimestamp === 0 ||
        Math.abs(timestamp - previousTimestamp) <= 10000
      )
    );

    if (likelyOptimisticDuplicate) return;

    if (commentId) seenIds.add(commentId);
    recentFingerprints.set(fingerprint, timestamp);
    uniqueComments.push({
      ...comment,
      __communityRenderKey: commentId || `${fingerprint}-${timestamp || index}`,
    });
  });

  return uniqueComments;
};

export const CommunityFeedDetailPage = () => {
  const params = useParams();
  const feedbackId = params.feedbackId || params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const cacheOwnerKey = (
    user?.userId || user?.id || user?.email || 'service-user'
  );

  const {
    ticket,
    comments,
    chatInput,
    setChatInput,
    loading,
    error,
    handleSendChat,
    getAttachmentUrl,
  } = useTicketDetail(feedbackId, user, getCommunityFeedDetail);

  const [previewIndex, setPreviewIndex] = useState(null);
  const [visibleCommentCount, setVisibleCommentCount] = useState(3);
  const [displaySupportCount, setDisplaySupportCount] = useState(0);
  const [relatedFeedbacks, setRelatedFeedbacks] = useState([]);
  const [relatedFeedbacksLoading, setRelatedFeedbacksLoading] = useState(false);
  const [relatedFeedbacksError, setRelatedFeedbacksError] = useState('');
  const commentsSectionRef = useRef(null);
  const commentInputRef = useRef(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const rootElement = document.documentElement;
    const previousScrollBehavior = rootElement.style.scrollBehavior;

    rootElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    rootElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      rootElement.style.scrollBehavior = previousScrollBehavior;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      rootElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, [feedbackId]);

  const attachments = Array.isArray(ticket?.attachments)
    ? ticket.attachments
    : [];
  const activeAttachment = Number.isInteger(previewIndex)
    ? attachments[previewIndex]
    : null;
  const activeAttachmentUrl = activeAttachment
    ? getAttachmentUrl(activeAttachment)
    : '';
  const activeAttachmentIsVideo = activeAttachment
    ? isVideoAttachment(activeAttachment, activeAttachmentUrl)
    : false;

  useEffect(() => {
    setVisibleCommentCount(3);
  }, [feedbackId]);

  useEffect(() => {
    setDisplaySupportCount(
      Number(ticket?.supportCount || ticket?.supports || 0)
    );
  }, [feedbackId, ticket?.supportCount, ticket?.supports]);

  useEffect(() => {
    const loadRelatedFeedbacks = async () => {
      if (!feedbackId) return;

      setRelatedFeedbacksLoading(true);
      setRelatedFeedbacksError('');

      try {
        const response = await managementFeedbackApi.getRelatedFeedbacks(feedbackId);
        setRelatedFeedbacks(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Failed to load related feedbacks', err);
        setRelatedFeedbacks([]);
        setRelatedFeedbacksError(
          err?.message || 'Không thể tải danh sách phản ánh liên quan.'
        );
      } finally {
        setRelatedFeedbacksLoading(false);
      }
    };

    loadRelatedFeedbacks();
  }, [feedbackId]);

  useEffect(() => {
    if (!activeAttachment) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewIndex(null);
        return;
      }

      if (
        attachments.length > 1 &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;

        setPreviewIndex((currentIndex) => {
          const safeIndex = Number.isInteger(currentIndex)
            ? currentIndex
            : 0;
          return (
            safeIndex + direction + attachments.length
          ) % attachments.length;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeAttachment, attachments.length]);

  const statusMeta = STATUS_META[ticket?.status] || {
    label: 'Đang cập nhật',
    description: 'Tiến độ xử lý đang được cập nhật.',
    icon: Lucide.Clock3,
    className: 'border-base-300 bg-base-200 text-base-content/60',
  };
  const StatusIcon = statusMeta.icon;
  const categoryLabel = translateCategoryName(
    ticket?.categoryName || ticket?.category?.name
  );
  const areaName = (
    ticket?.areaName ||
    ticket?.wardName ||
    ticket?.districtName ||
    'Chưa xác định khu vực'
  );
  const authorName = (
    ticket?.userName ||
    ticket?.reporterName ||
    ticket?.createdByName ||
    'Người dân'
  );
  const createdAt = ticket?.createdAt || ticket?.submittedAt;
  const updatedAt = ticket?.updatedAt || ticket?.lastUpdatedAt || createdAt;
  const uniqueComments = dedupeComments(
    Array.isArray(comments) ? comments : []
  );
  const commentCount = uniqueComments.length > 0
    ? uniqueComments.length
    : Number(ticket?.commentCount || 0);
  const supportCount = displaySupportCount;
  const orderedComments = [...uniqueComments].sort((firstComment, secondComment) => (
    getCommentTimestamp(secondComment) - getCommentTimestamp(firstComment)
  ));
  const visibleComments = orderedComments.slice(0, visibleCommentCount);
  const hiddenCommentCount = Math.max(
    0,
    orderedComments.length - visibleComments.length
  );
  const latestCommentAt = (
    orderedComments[0]?.createdAt ||
    orderedComments[0]?.createdDate ||
    updatedAt
  );

  useEffect(() => {
    if (!ticket || !feedbackId) return;

    patchCommunityFeedCacheItem(
      cacheOwnerKey,
      feedbackId,
      (cachedItem) => ({
        ...ticket,
        attachments: Array.isArray(ticket?.attachments)
          ? ticket.attachments
          : cachedItem?.attachments,
        supportCount,
        commentCount,
        __mediaState: Array.isArray(ticket?.attachments)
          ? (ticket.attachments.length > 0 ? 'ready' : 'empty')
          : cachedItem?.__mediaState,
      })
    );
  }, [
    cacheOwnerKey,
    commentCount,
    feedbackId,
    supportCount,
    ticket,
  ]);

  const matchedJourneyIndex = JOURNEY_STEPS.findIndex((step) => (
    step.statuses.includes(ticket?.status)
  ));
  const currentJourneyIndex = matchedJourneyIndex >= 0
    ? matchedJourneyIndex
    : 0;

  const movePreview = (direction) => {
    if (attachments.length <= 1) return;

    setPreviewIndex((currentIndex) => {
      const safeIndex = Number.isInteger(currentIndex)
        ? currentIndex
        : 0;
      return (
        safeIndex + direction + attachments.length
      ) % attachments.length;
    });
  };

  const backDestination = location.state?.from || '/community/feed';
  const backLabel = backDestination === '/community/map'
    ? 'Quay lại bản đồ sự cố'
    : 'Quay lại bảng tin';

  const handleBack = () => {
    navigate(backDestination);
  };

  const detailPath = `${location.pathname}${location.search}`;
  const commentReturnPath = `${detailPath}#community-comments`;

  const redirectToLoginForInteraction = () => {
    const loginPath = (
      `/login?intent=community-interaction&redirect=${encodeURIComponent(commentReturnPath)}`
    );

    navigate(loginPath, {
      state: {
        from: commentReturnPath,
        intent: 'community-interaction',
      },
    });
  };

  const scrollToComments = () => {
    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    commentsSectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });

    window.setTimeout(() => {
      commentInputRef.current?.focus({ preventScroll: true });
    }, prefersReducedMotion ? 0 : 420);
  };

  const handleJumpToComments = () => {
    if (!user) {
      redirectToLoginForInteraction();
      return;
    }

    scrollToComments();
  };

  useEffect(() => {
    if (
      !user ||
      loading ||
      location.hash !== '#community-comments'
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const prefersReducedMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      commentsSectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });

      window.setTimeout(() => {
        commentInputRef.current?.focus({ preventScroll: true });
      }, prefersReducedMotion ? 0 : 420);
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [feedbackId, loading, location.hash, user]);

  if (loading) {
    return (
      <CommunityDetailShell>
        <main
          className="space-y-4"
          aria-busy="true"
          aria-label="Đang tải chi tiết phản ánh cộng đồng"
        >
          <section className="relative h-[224px] overflow-hidden rounded-[30px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[var(--public-shadow)]">
            <DetailSmartCityBackdrop />
            <div className="relative grid h-full gap-6 px-6 py-7 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
              <div className="space-y-4">
                <div className="h-7 w-32 animate-pulse rounded-full bg-base-content/8" />
                <div className="h-9 w-[min(520px,78%)] animate-pulse rounded-xl bg-base-content/10" />
                <div className="flex flex-wrap gap-3">
                  <div className="h-8 w-32 animate-pulse rounded-xl bg-base-content/8" />
                  <div className="h-8 w-44 animate-pulse rounded-xl bg-base-content/8" />
                  <div className="h-8 w-36 animate-pulse rounded-xl bg-base-content/8" />
                </div>
              </div>
              <div className="hidden h-36 animate-pulse rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] xl:block" />
            </div>
          </section>

          <section className="h-44 animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="h-[420px] animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
            <div className="h-[280px] animate-pulse rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-sm" />
          </section>
        </main>
      </CommunityDetailShell>
    );
  }

  if (!ticket) {
    return (
      <CommunityDetailShell>
      <main className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] px-6 py-16 text-center shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
        <Lucide.FileWarning
          size={34}
          className="mx-auto text-base-content/35"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-lg font-bold">
          Không thể tải phản ánh cộng đồng
        </h1>
        <p className="mt-2 text-sm text-base-content/55">
          {error || 'Phản ánh có thể đã bị ẩn hoặc không còn công khai.'}
        </p>
        <button
          type="button"
          onClick={handleBack}
          className="btn admin-primary-action mt-5 rounded-2xl"
        >
          {backLabel}
        </button>
      </main>
      </CommunityDetailShell>
    );
  }

  return (
    <>
      <CommunityDetailShell>
        <main className="relative isolate space-y-4 text-[var(--public-title)]">
          <div
            className="pointer-events-none absolute -inset-x-3 -inset-y-4 -z-10 overflow-hidden rounded-[36px] border border-[var(--public-border-soft)] bg-[linear-gradient(180deg,var(--public-surface-soft),transparent)] sm:-inset-x-5 sm:-inset-y-5"
            aria-hidden="true"
          />

        <article className="relative isolate overflow-hidden rounded-[30px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[var(--public-shadow)]">
          <DetailSmartCityBackdrop />

          <div className="relative grid gap-6 px-5 py-5 sm:px-7 sm:py-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
            <header className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <DetailBackButton label={backLabel} onClick={handleBack} />
                <span
                  className="hidden h-5 w-px bg-[var(--public-border)] sm:block"
                  aria-hidden="true"
                />
                <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-secondary/15 bg-secondary/8 px-3 text-xs font-semibold text-secondary">
                  <Lucide.Tag size={13} aria-hidden="true" />
                  {categoryLabel}
                </span>
              </div>

              <h1 className="mt-5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {ticket.title || 'Phản ánh đô thị'}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-base-content/55">
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-content">
                    {authorName.charAt(0).toUpperCase()}
                  </span>
                  <strong className="font-semibold text-base-content">
                    {authorName}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lucide.MapPin size={15} aria-hidden="true" />
                  {areaName}
                </span>
                <time
                  dateTime={createdAt || undefined}
                  className="inline-flex items-center gap-1.5"
                >
                  <Lucide.CalendarDays size={15} aria-hidden="true" />
                  Đăng {formatDateTime(createdAt)}
                </time>
                {updatedAt && updatedAt !== createdAt ? (
                  <time
                    dateTime={updatedAt}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Lucide.Clock3 size={15} aria-hidden="true" />
                    Cập nhật {formatDateTime(updatedAt)}
                  </time>
                ) : null}
              </div>
            </header>

            <aside className="rounded-2xl border border-warning/25 bg-[var(--public-surface-strong)]/90 px-4 py-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[var(--public-muted)]">
                    Trạng thái xử lý
                  </p>
                  <p className="mt-1 truncate text-lg font-bold text-warning">
                    {statusMeta.label}
                  </p>
                </div>
                <StatusIcon size={18} className="shrink-0 text-warning" aria-hidden="true" />
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">
                {statusMeta.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SupportButton
                  feedbackId={feedbackId}
                  initialCount={supportCount}
                  initialSupported={ticket?.isSupportedByCurrentUser}
                  isAuthenticated={Boolean(user)}
                  onRequireAuth={redirectToLoginForInteraction}
                  onChange={({ count, isSupported }) => {
                    const nextSupportCount = Math.max(0, Number(count) || 0);
                    setDisplaySupportCount(nextSupportCount);
                    patchCommunityFeedCacheItem(cacheOwnerKey, feedbackId, {
                      supportCount: nextSupportCount,
                      isSupportedByCurrentUser: Boolean(isSupported),
                    });
                  }}
                  className="h-9"
                />
                <button
                  type="button"
                  onClick={handleJumpToComments}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface)] px-3 text-sm font-semibold text-[var(--public-copy)] transition hover:border-primary/25 hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label={`Đi tới phần ${commentCount} bình luận`}
                >
                  <Lucide.MessageCircle size={16} aria-hidden="true" />
                  {commentCount} bình luận
                </button>
              </div>
            </aside>
          </div>
        </article>

        <section className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5" aria-labelledby="community-progress-title">
          <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="community-progress-title" className="text-lg font-bold">
                Tiến độ xử lý công khai
              </h2>
              <p className="mt-1 text-sm text-base-content/60">
                Các mốc chính giúp cộng đồng theo dõi quá trình xử lý.
              </p>
            </div>
            <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
              Bước {currentJourneyIndex + 1}/{JOURNEY_STEPS.length}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto pb-1">
            <ol className="grid min-w-[680px] grid-cols-4">
              {JOURNEY_STEPS.map((step, index) => {
                const Icon = step.icon;
                const completed = index < currentJourneyIndex;
                const active = index === currentJourneyIndex;

                return (
                  <li key={step.title} className="relative px-2 text-center">
                    {index < JOURNEY_STEPS.length - 1 ? (
                      <span
                        className={`absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-[18px] h-0.5 ${
                          index < currentJourneyIndex
                            ? 'bg-primary/75'
                            : 'bg-base-content/15'
                        }`}
                        aria-hidden="true"
                      />
                    ) : null}

                    <span
                      className={`relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${
                        completed
                          ? 'border-primary bg-primary text-primary-content shadow-sm'
                          : active
                            ? 'border-primary bg-primary/12 text-primary ring-4 ring-primary/12 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
                            : 'border-base-content/20 bg-base-100 text-base-content/45 shadow-sm'
                      }`}
                    >
                      {completed ? (
                        <Lucide.Check size={16} aria-hidden="true" />
                      ) : (
                        <Icon size={16} aria-hidden="true" />
                      )}
                    </span>
                    <p className={`mt-2 text-sm font-semibold ${
                      active || completed
                        ? 'text-base-content'
                        : 'text-base-content/60'
                    }`}>
                      {step.title}
                    </p>
                    <p className={`mt-0.5 text-xs ${
                      active || completed
                        ? 'text-base-content/55'
                        : 'text-base-content/48'
                    }`}>
                      {step.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
          </div>
        </section>

        <section className="space-y-4">
          <article className="rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5">
            <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-info/[0.055] blur-3xl" aria-hidden="true" />
            <div className="relative">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Nội dung phản ánh</h2>
                <p className="mt-1 text-sm text-base-content/55">
                  Thông tin và minh chứng đã được công khai.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/45 px-3 py-1.5 text-xs font-semibold text-base-content/55">
                <Lucide.Paperclip size={13} aria-hidden="true" />
                {attachments.length} tệp
              </span>
            </header>

            <div className="mt-4 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 py-4 sm:px-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                {ticket.description || 'Không có mô tả chi tiết.'}
              </p>
            </div>

            <section className="relative mt-4 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-soft)] p-3 sm:p-4" aria-labelledby="community-evidence-title">
              <div className="pointer-events-none absolute right-4 top-3 text-primary/[0.05]" aria-hidden="true">
                <Lucide.Images size={64} strokeWidth={1.25} />
              </div>
              <h3 id="community-evidence-title" className="relative text-sm font-semibold">
                Hình ảnh và video
              </h3>

              {attachments.length > 0 ? (
                <div className="relative mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((attachment, index) => {
                    const attachmentUrl = getAttachmentUrl(attachment);
                    const video = isVideoAttachment(
                      attachment,
                      attachmentUrl
                    );

                    return (
                      <button
                        key={attachment?.attachmentId || attachment?.id || index}
                        type="button"
                        onClick={() => setPreviewIndex(index)}
                        className="group overflow-hidden rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] text-left transition hover:border-primary/25 hover:shadow-md"
                      >
                        <span className="relative flex h-44 items-center justify-center overflow-hidden sm:h-48">
                          {attachmentUrl ? (
                            video ? (
                              <>
                                <video
                                  src={attachmentUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/15 text-white transition group-hover:bg-black/30">
                                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur">
                                    <Lucide.Play size={18} fill="currentColor" aria-hidden="true" />
                                  </span>
                                </span>
                              </>
                            ) : (
                              <img
                                src={attachmentUrl}
                                alt={`Minh chứng ${index + 1}`}
                                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            )
                          ) : (
                            <Lucide.ImageOff
                              size={24}
                              className="text-base-content/30"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="flex items-center justify-between gap-2 border-t border-[var(--public-border-soft)] bg-[var(--public-surface-soft)] px-3 py-2.5">
                          <span className="truncate text-xs font-semibold">
                            Tệp {index + 1}
                          </span>
                          <Lucide.Expand size={14} className="text-base-content/35" aria-hidden="true" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] px-4 py-5 text-sm text-base-content/45">
                  <Lucide.ImageOff size={19} aria-hidden="true" />
                  Phản ánh chưa có minh chứng công khai.
                </div>
              )}
            </section>
            </div>
          </article>

          <section className="rounded-[28px] border border-base-300 bg-base-100 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Phản ánh liên quan</h2>
                <p className="mt-1 text-sm text-base-content/55">
                  Các phản ánh có thể thuộc cùng một vấn đề hoặc khu vực.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/45 px-3 py-1.5 text-xs font-semibold text-base-content/55">
                {relatedFeedbacks.length} mục
              </span>
            </div>

            {relatedFeedbacksLoading ? (
              <div className="mt-4 flex items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-200/35 px-4 py-6 text-sm text-base-content/55">
                <Lucide.LoaderCircle size={16} className="mr-2 animate-spin" aria-hidden="true" />
                Đang tải phản ánh liên quan...
              </div>
            ) : relatedFeedbacksError ? (
              <div className="mt-4 rounded-2xl border border-error/20 bg-error/8 px-4 py-4 text-sm text-error">
                {relatedFeedbacksError}
              </div>
            ) : relatedFeedbacks.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-base-300 bg-base-200/35 px-4 py-6 text-center text-sm text-base-content/50">
                Chưa có phản ánh liên quan nào.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {relatedFeedbacks.map((item, index) => {
                  const relatedId = item?.feedbackId || item?.id;
                  return (
                    <div key={relatedId || index} className="rounded-2xl border border-base-300 bg-base-200/35 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                            Feedback ID
                          </div>
                          <div className="mt-1 text-sm font-semibold text-base-content">{relatedId || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                            Trạng thái
                          </div>
                          <div className="mt-1 text-sm font-semibold text-base-content">
                            {getStatusLabel(item?.status)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                            Danh mục
                          </div>
                          <div className="mt-1 text-sm font-semibold text-base-content">
                            {translateCategoryName(item?.categoryName || item?.category?.name || item?.categoryType || item?.type)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                            Ngày tạo
                          </div>
                          <div className="mt-1 text-sm font-semibold text-base-content">
                            {formatDateTime(item?.createdAt || item?.createdDate)}
                          </div>
                        </div>
                      </div>
                      {relatedId ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/community/feed/${relatedId}`)}
                            className="btn btn-outline btn-sm rounded-xl"
                          >
                            <Lucide.ExternalLink size={14} aria-hidden="true" />
                            Xem chi tiết
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            id="community-comments"
            ref={commentsSectionRef}
            className="scroll-mt-24 rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5"
            aria-labelledby="community-comments-title"
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-secondary/[0.07] blur-3xl" aria-hidden="true" />
              <div className="relative">
                <h2 id="community-comments-title" className="text-lg font-bold">
                  Trao đổi cộng đồng
                </h2>
                <p className="mt-1 text-sm text-base-content/55">
                  Chia sẻ thông tin hữu ích và trao đổi văn minh về phản ánh.
                </p>
              </div>
              <span className="relative inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 text-xs font-semibold text-primary">
                <Lucide.MessageCircle size={14} aria-hidden="true" />
                {commentCount} bình luận
              </span>
            </header>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-stretch">
              <div className="flex min-h-full min-w-0 flex-col gap-4">
                <form
                  onSubmit={(event) => {
                    if (!user) {
                      event.preventDefault();
                      redirectToLoginForInteraction();
                      return;
                    }

                    handleSendChat(event);
                  }}
                  className="rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] p-3 shadow-sm sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-content shadow-sm">
                      {(user?.fullName || user?.name || 'Bạn').charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <label htmlFor="community-detail-comment" className="sr-only">
                        Viết bình luận công khai
                      </label>
                      <textarea
                        ref={commentInputRef}
                        id="community-detail-comment"
                        rows="2"
                        value={chatInput}
                        readOnly={!user}
                        onFocus={() => {
                          if (!user) {
                            redirectToLoginForInteraction();
                          }
                        }}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder={
                          user
                            ? 'Bạn nghĩ gì về phản ánh này?'
                            : 'Đăng nhập để tham gia bình luận'
                        }
                        className="textarea textarea-bordered min-h-[72px] max-h-40 w-full resize-y rounded-xl border-[var(--public-border)] bg-[var(--public-surface)] px-4 py-3 text-sm leading-6 focus:border-primary/40 focus:outline-none"
                      />

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-1.5 text-xs text-base-content/42">
                          <Lucide.Globe2 size={13} aria-hidden="true" />
                          Nội dung được hiển thị công khai.
                        </p>
                        <button
                          type={user ? 'submit' : 'button'}
                          onClick={
                            user
                              ? undefined
                              : redirectToLoginForInteraction
                          }
                          disabled={user ? !chatInput?.trim() : false}
                          className="btn admin-primary-action h-10 min-h-10 rounded-xl px-4"
                        >
                          {user ? (
                            <>
                              <Lucide.Send size={14} aria-hidden="true" />
                              Gửi bình luận
                            </>
                          ) : (
                            <>
                              <Lucide.LogIn size={14} aria-hidden="true" />
                              Đăng nhập để bình luận
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                <div className={visibleComments.length > 0 ? 'space-y-3' : 'flex flex-1'}>
                  {visibleComments.length > 0 ? (
                    visibleComments.map((comment, index) => {
                      const commentAuthor = getCommentAuthor(comment);
                      const commentContent = getCommentContent(comment);

                      return (
                        <article
                          key={comment.__communityRenderKey || getCommentId(comment, index)}
                          className="grid grid-cols-[40px_minmax(0,1fr)] gap-3"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-xs font-bold text-secondary">
                            {commentAuthor.charAt(0).toUpperCase()}
                          </span>

                          <div className="min-w-0 rounded-2xl rounded-tl-md border border-base-300 bg-base-100 px-4 py-3 shadow-sm transition hover:border-primary/15">
                            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <p className="truncate text-sm font-semibold text-base-content">
                                {commentAuthor}
                              </p>
                              <time
                                dateTime={comment?.createdAt || undefined}
                                className="shrink-0 text-xs text-base-content/42"
                              >
                                {formatDateTime(comment?.createdAt)}
                              </time>
                            </header>
                            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-base-content/68">
                              {commentContent || 'Bình luận không có nội dung.'}
                            </p>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="relative flex min-h-[270px] flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-surface-strong)] px-4 py-7 text-center">
                      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                        <svg
                          viewBox="0 0 760 180"
                          preserveAspectRatio="none"
                          className="h-full w-full text-primary"
                          fill="none"
                        >
                          <path
                            d="M-20 132C104 116 145 46 263 58C368 68 404 142 520 127C620 114 651 63 790 72"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeDasharray="8 11"
                            strokeOpacity="0.08"
                          />
                          <circle cx="263" cy="58" r="6" fill="currentColor" fillOpacity="0.08" />
                          <circle cx="520" cy="127" r="7" fill="currentColor" fillOpacity="0.065" />
                        </svg>
                      </div>
                      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/12 bg-[var(--public-surface)] text-primary shadow-sm backdrop-blur">
                        <Lucide.MessagesSquare size={21} aria-hidden="true" />
                      </span>
                      <p className="relative mt-3 text-sm font-semibold text-base-content/70">
                        Chưa có bình luận nào
                      </p>
                      <p className="relative mt-1 max-w-sm text-xs leading-5 text-base-content/45">
                        Hãy là người đầu tiên bổ sung thông tin hữu ích để cộng đồng cùng theo dõi phản ánh này.
                      </p>
                    </div>
                  )}
                </div>

                {hiddenCommentCount > 0 || (
                  visibleCommentCount > 3 &&
                  orderedComments.length > 3
                ) ? (
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {hiddenCommentCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCommentCount((currentCount) => (
                          currentCount + 5
                        ))}
                        className="btn btn-outline btn-sm rounded-xl px-4"
                      >
                        <Lucide.MessageSquareMore size={15} aria-hidden="true" />
                        Xem thêm {Math.min(5, hiddenCommentCount)} bình luận
                      </button>
                    ) : null}

                    {visibleCommentCount > 3 && orderedComments.length > 3 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCommentCount(3)}
                        className="btn btn-ghost btn-sm rounded-xl px-4 text-base-content/55"
                      >
                        <Lucide.ChevronUp size={15} aria-hidden="true" />
                        Thu gọn
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <aside className="grid h-full grid-rows-2 gap-4">
                <section className="overflow-hidden rounded-2xl border border-primary/15 bg-[var(--public-surface-strong)] p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Lucide.ChartNoAxesColumnIncreasing size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold">Tổng quan thảo luận</h3>
                      <p className="mt-0.5 text-xs text-base-content/45">
                        Mức độ tương tác của cộng đồng.
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[var(--public-border)] bg-[var(--public-surface)] px-3 py-3">
                      <dt className="text-[11px] text-base-content/45">
                        Bình luận
                      </dt>
                      <dd className="mt-1 text-xl font-bold">
                        {commentCount}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-[var(--public-border)] bg-[var(--public-surface)] px-3 py-3">
                      <dt className="text-[11px] text-base-content/45">
                        Lượt hỗ trợ
                      </dt>
                      <dd className="mt-1 text-xl font-bold text-error">
                        {supportCount}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 rounded-xl border border-[var(--public-border)] bg-[var(--public-surface)] px-3 py-3">
                    <p className="text-[11px] text-base-content/45">
                      Hoạt động gần nhất
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-base-content/68">
                      <Lucide.Clock3 size={13} aria-hidden="true" />
                      {formatDateTime(latestCommentAt)}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Lucide.ShieldCheck size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold">Trao đổi văn minh</h3>
                      <p className="mt-0.5 text-xs text-base-content/45">
                        Giữ cuộc thảo luận hữu ích.
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-3 text-xs leading-5 text-base-content/58">
                    <li className="flex gap-2">
                      <Lucide.Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                      Chia sẻ thông tin đúng với sự việc.
                    </li>
                    <li className="flex gap-2">
                      <Lucide.Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                      Tôn trọng người tham gia trao đổi.
                    </li>
                    <li className="flex gap-2">
                      <Lucide.Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                      Không đăng nội dung spam hoặc không liên quan.
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </section>
        </section>
        </main>
      </CommunityDetailShell>

      {activeAttachment && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100000] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black"
              role="dialog"
              aria-modal="true"
              aria-label={`Xem minh chứng ${previewIndex + 1}`}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setPreviewIndex(null);
                }
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent px-4 pb-16 pt-4 sm:px-6">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Minh chứng phản ánh
                  </p>
                  <p className="mt-1 text-xs text-white/65">
                    {previewIndex + 1} / {attachments.length}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="absolute right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/80 sm:right-6"
                aria-label="Đóng xem trước"
              >
                <Lucide.X size={21} aria-hidden="true" />
              </button>

              <div className="flex h-full w-full items-center justify-center px-4 py-4 sm:px-20 sm:py-6">
                {activeAttachmentIsVideo ? (
                  <video
                    key={activeAttachmentUrl}
                    src={activeAttachmentUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-full max-w-full object-contain"
                  >
                    Trình duyệt của bạn không hỗ trợ phát video.
                  </video>
                ) : (
                  <img
                    src={activeAttachmentUrl}
                    alt={`Minh chứng ${previewIndex + 1}`}
                    className="max-h-full max-w-full select-none object-contain"
                    draggable="false"
                  />
                )}
              </div>

              {attachments.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => movePreview(-1)}
                    className="absolute left-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/80 sm:left-6 sm:h-14 sm:w-14"
                    aria-label="Xem tệp trước"
                  >
                    <Lucide.ChevronLeft size={28} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePreview(1)}
                    className="absolute right-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/80 sm:right-6 sm:h-14 sm:w-14"
                    aria-label="Xem tệp tiếp theo"
                  >
                    <Lucide.ChevronRight size={28} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export const CommunityFeedbackDetailPage = CommunityFeedDetailPage;

export default CommunityFeedDetailPage;
