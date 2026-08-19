import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import * as signalR from '@microsoft/signalr';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { slaApi } from '@urbanmind/shared-api';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import { ManagerEmptyState, ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';
import { getStatusLabel, managementTypes, PRIORITY_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '@urbanmind/shared-types';
import { useResolvedLocationText } from '../../hooks/useResolvedLocationText';

const normalizeProviderReports = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return value && typeof value === 'object' ? [value] : [];
};

const normalizeDocuments = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.documents)) return value.documents;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const normalizeResolutions = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.resolutions)) return value.resolutions;
  if (Array.isArray(value?.data)) return value.data;
  return value ? [value] : [];
};

const getResolutionDate = (resolution) => (
  resolution?.resolvedAt ||
  resolution?.submittedAt ||
  resolution?.createdAt ||
  resolution?.updatedAt ||
  null
);

const pickLatestResolution = (items = []) => (
  [...items].sort((a, b) => (
    new Date(getResolutionDate(b) || 0) - new Date(getResolutionDate(a) || 0)
  ))[0] || null
);

const pickProviderReport = (reports = [], providerReportId) => {
  if (providerReportId !== undefined && providerReportId !== null) {
    const matchingReport = reports.find((report) => (
      Number(report?.providerReportId) === Number(providerReportId)
    ));
    if (matchingReport) return matchingReport;
  }

  return [...reports].sort((a, b) => (
    new Date(b?.reportedAt || b?.updatedAt || 0) -
    new Date(a?.reportedAt || a?.updatedAt || 0)
  ))[0] || null;
};

const isImageDocument = (document) => {
  const fileType = String(document?.fileType || '').toLowerCase();
  const fileUrl = String(document?.fileUrl || '').toLowerCase();
  return fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(fileUrl);
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



const formatSlaCountdown = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours + (days * 24)).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
};

const formatPauseDuration = (pause) => {
  const pausedAtMs = pause?.pausedAt
    ? new Date(pause.pausedAt).getTime()
    : NaN;

  const resumedAtMs = pause?.resumedAt
    ? new Date(pause.resumedAt).getTime()
    : NaN;

  if (!Number.isFinite(pausedAtMs)) {
    return '—';
  }

  // Nếu chưa resume thì lịch sử hiện tại vẫn đang tạm dừng.
  if (!Number.isFinite(resumedAtMs)) {
    return 'Đang tạm dừng';
  }

  const totalSeconds = Math.max(
    0,
    Math.round((resumedAtMs - pausedAtMs) / 1000)
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} giờ`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} phút`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} giây`);
  }

  return parts.join(' ');
};

const getSignalRAccessToken = () => {
  if (typeof window === 'undefined') return '';

  const storages = [window.localStorage, window.sessionStorage];
  const directKeys = [
    'accessToken',
    'access_token',
    'token',
    'authToken',
    'jwtToken',
  ];

  for (const storage of storages) {
    for (const key of directKeys) {
      const value = storage.getItem(key);
      if (value) return value.replace(/^Bearer\s+/i, '').trim();
    }

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;

      const raw = storage.getItem(key);
      if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) continue;

      try {
        const parsed = JSON.parse(raw);
        const candidates = [
          parsed?.accessToken,
          parsed?.access_token,
          parsed?.token,
          parsed?.authToken,
          parsed?.jwtToken,
          parsed?.state?.accessToken,
          parsed?.state?.access_token,
          parsed?.state?.token,
          parsed?.auth?.accessToken,
          parsed?.auth?.token,
          parsed?.user?.accessToken,
          parsed?.user?.token,
        ];

        const token = candidates.find(Boolean);
        if (token) return String(token).replace(/^Bearer\s+/i, '').trim();
      } catch {
        // Bỏ qua storage không phải JSON hợp lệ.
      }
    }
  }

  return '';
};

const getSlaHubUrl = () => {
  const envBaseUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    ''
  ).replace(/\/$/, '');

  return envBaseUrl
    ? `${envBaseUrl}/hubs/sla`
    : '/hubs/sla';
};

const getSlaBadgeClass = (status) => {
  const value = String(status || '').toLowerCase();
  if (value.includes('breach')) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (value.includes('met') || value.includes('completed')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value.includes('warning')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (value.includes('paused')) return 'border-slate-200 bg-slate-100 text-slate-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
};

const getSlaStatusLabel = (status) => {
  const value = String(status || '').trim().toLowerCase();

  if (value === 'running') return 'Đang chạy';
  if (value === 'paused') return 'Tạm dừng';
  if (value === 'completed') return 'Đã hoàn thành';
  if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
  if (value === 'met') return 'Đạt SLA';
  if (value === 'pending') return 'Đang theo dõi';
  if (value === 'warning') return 'Sắp đến hạn';
  if (value === 'breached') return 'Vi phạm SLA';

  return status || 'Chưa xác định';
};

const getHeaderStatusTone = (status) => {
  if ([
    managementTypes.feedbackStatus.SUBMITTED,
    managementTypes.feedbackStatus.VERIFIED,
    managementTypes.feedbackStatus.ASSIGNED,
  ].includes(status)) return 'info';

  if (status === managementTypes.feedbackStatus.AI_REVIEWED) return 'review';

  if ([
    managementTypes.feedbackStatus.IN_PROGRESS,
    managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
  ].includes(status)) return 'warning';

  if ([
    managementTypes.feedbackStatus.RESOLVED,
    managementTypes.feedbackStatus.APPROVED,
    managementTypes.feedbackStatus.CLOSED,
  ].includes(status)) return 'success';

  if (status === managementTypes.feedbackStatus.NEED_REWORK) return 'rework';
  if ([managementTypes.feedbackStatus.REJECTED, managementTypes.feedbackStatus.CANCELLED].includes(status)) return 'danger';
  return 'neutral';
};

const getFileLabel = (document, index) => {
  const fallback = `Tài liệu ${index + 1}`;
  if (document?.fileName) return document.fileName;
  if (!document?.fileUrl) return fallback;
  try {
    const pathname = new URL(document.fileUrl).pathname;
    return decodeURIComponent(pathname.split('/').pop() || fallback);
  } catch {
    return fallback;
  }
};

const MetaItem = ({ label, children, wide = false }) => (
  <div className={wide ? 'sm:col-span-2' : ''}>
    <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</dt>
    <dd className="mt-1.5 break-words text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
      {children || '—'}
    </dd>
  </div>
);

const ResolutionField = ({ label, children, wide = false }) => (
  <div className={wide ? 'sm:col-span-2' : ''}>
    <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
      {children || 'Chưa có nội dung'}
    </dd>
  </div>
);


const normalizeStatusKey = (value) => (
  String(value ?? '')
    .trim()
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
);

const STATUS_BY_KEY = new Map(
  Object.values(managementTypes.feedbackStatus)
    .filter(Boolean)
    .map((status) => [normalizeStatusKey(status), status])
);

// Hỗ trợ các cách viết khác nhau mà backend cũ có thể đã lưu.
STATUS_BY_KEY.set('aireviewed', managementTypes.feedbackStatus.AI_REVIEWED);
STATUS_BY_KEY.set('submittedforapproval', managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL);
STATUS_BY_KEY.set('needrework', managementTypes.feedbackStatus.NEED_REWORK);
STATUS_BY_KEY.set('inprogress', managementTypes.feedbackStatus.IN_PROGRESS);

const normalizeHistoryStatus = (value) => (
  STATUS_BY_KEY.get(normalizeStatusKey(value)) || null
);

const STATUS_SUBTITLES = {
  [managementTypes.feedbackStatus.SUBMITTED]: 'Phản ánh đã được tạo',
  [managementTypes.feedbackStatus.AI_REVIEWED]: 'AI đã hoàn tất phân loại sơ bộ',
  [managementTypes.feedbackStatus.VERIFIED]: 'Nhân viên đã xác minh phản ánh',
  [managementTypes.feedbackStatus.ASSIGNED]: 'Phản ánh đã được chuyển đến đơn vị xử lý',
  [managementTypes.feedbackStatus.IN_PROGRESS]: 'Đơn vị đang tiến hành xử lý',
  [managementTypes.feedbackStatus.RESOLVED]: 'Đơn vị đã gửi kết quả xử lý',
  [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 'Kết quả đang chờ người quản lý duyệt',
  [managementTypes.feedbackStatus.APPROVED]: 'Kết quả xử lý đã được duyệt',
  [managementTypes.feedbackStatus.NEED_REWORK]: 'Kết quả được yêu cầu bổ sung hoặc làm lại',
  [managementTypes.feedbackStatus.REJECTED]: 'Phản ánh đã bị từ chối',
  [managementTypes.feedbackStatus.CLOSED]: 'Phản ánh đã được đóng',
  [managementTypes.feedbackStatus.CANCELLED]: 'Phản ánh đã bị hủy',
};

const HISTORY_RULES = [
  {
    pattern: /feedback created|created feedback/i,
    status: managementTypes.feedbackStatus.SUBMITTED,
  },
  {
    pattern: /reviewed by ai|ai review|classified by ai|using qwen/i,
    status: managementTypes.feedbackStatus.AI_REVIEWED,
  },
  {
    pattern: /verified by staff|feedback verified/i,
    status: managementTypes.feedbackStatus.VERIFIED,
  },
  {
    pattern: /feedback assigned|assigned to|provider assigned/i,
    status: managementTypes.feedbackStatus.ASSIGNED,
  },
  {
    pattern: /work in progress|processing started|in progress/i,
    status: managementTypes.feedbackStatus.IN_PROGRESS,
  },
  {
    pattern: /resolution submitted|submitted for approval|waiting for manager approval/i,
    status: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
  },
  {
    pattern: /approved by manager|resolution approved/i,
    status: managementTypes.feedbackStatus.APPROVED,
  },
  {
    pattern: /need rework|rework requested|resolution needs rework/i,
    status: managementTypes.feedbackStatus.NEED_REWORK,
  },
  {
    pattern: /rejected by|feedback rejected/i,
    status: managementTypes.feedbackStatus.REJECTED,
  },
  {
    pattern: /feedback closed|closed by/i,
    status: managementTypes.feedbackStatus.CLOSED,
  },
  {
    pattern: /feedback cancelled|cancelled by|canceled by/i,
    status: managementTypes.feedbackStatus.CANCELLED,
  },
];

const translateUnmatchedHistoryNote = (rawNote, changedByUserName) => {
  if (!rawNote) return `Cập nhật bởi ${changedByUserName || 'hệ thống'}`;

  const updatedByMatch = rawNote.match(/^updated by\s+(.+)$/i);
  if (updatedByMatch) return `Cập nhật bởi ${updatedByMatch[1]}`;

  const statusChangedMatch = rawNote.match(/^status changed to\s+(.+)$/i);
  if (statusChangedMatch) {
    const changedStatus = normalizeHistoryStatus(statusChangedMatch[1]);
    return changedStatus
      ? `Chuyển trạng thái sang ${getStatusLabel(changedStatus)}`
      : 'Trạng thái phản ánh đã được cập nhật';
  }

  return rawNote;
};

const normalizeHistoryItem = (history) => {
  const rawNote = String(
    history?.note ||
    history?.description ||
    history?.reason ||
    ''
  ).trim();

  const explicitStatus = normalizeHistoryStatus(
    history?.newStatus || history?.status
  );

  const matchedRule = HISTORY_RULES.find(({ pattern }) =>
    pattern.test(rawNote)
  );

  const status = explicitStatus || matchedRule?.status || null;

  return {
    status,
    title: status
      ? getStatusLabel(status, 'Cập nhật trạng thái')
      : 'Cập nhật hệ thống',
    // Nếu backend đã trả status hợp lệ thì mô tả phải bám theo status,
    // không để một note cũ của AI ghi đè lên mốc "Đã xác minh".
    subtitle:
      (explicitStatus ? STATUS_SUBTITLES[explicitStatus] : null) ||
      STATUS_SUBTITLES[matchedRule?.status] ||
      translateUnmatchedHistoryNote(rawNote, history?.changedByUserName),
    changedAt: history?.changedAt,
  };
};


export const InteractionApprovalDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isInteractionView = location.pathname.startsWith('/manager/interactions/');
  const backPath = isInteractionView ? '/manager/interactions' : '/manager/approvals';
  const [feedback, setFeedback] = useState(null);
  const [providerReport, setProviderReport] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [resolutions, setResolutions] = useState([]);
  const [slaDetail, setSlaDetail] = useState(null);
  const [slaStatus, setSlaStatus] = useState(null);
  const [slaClock, setSlaClock] = useState({
    responseSeconds: 0,
    resolutionSeconds: 0,
    syncedAt: 0,
    status: '',
  });
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [slaTimeline, setSlaTimeline] = useState([]);
  const [slaError, setSlaError] = useState('');
  const [slaActionLoading, setSlaActionLoading] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [note, setNote] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(null);
  const [slaModal, setSlaModal] = useState(null);
  const [pauseReasonOpen, setPauseReasonOpen] = useState(false);
  const [slaModalForm, setSlaModalForm] = useState({
    reasonCode: 'WaitingCitizen',
    note: '',
  });
  const resolvedLocationText = useResolvedLocationText({
    locationText: feedback?.locationText,
    areaName: feedback?.areaName || feedback?.wardName,
    latitude: feedback?.latitude,
    longitude: feedback?.longitude,
  });

  const refreshSlaData = useCallback(async () => {
    if (!feedbackId) return;

    const [
      slaDetailResult,
      slaStatusResult,
      slaTimelineResult,
    ] = await Promise.allSettled([
      slaApi.getCurrentFeedbackSla(feedbackId),
      slaApi.getFeedbackSlaStatus(feedbackId),
      slaApi.getFeedbackSlaTimeline(feedbackId),
    ]);

    const nextDetail =
      slaDetailResult.status === 'fulfilled'
        ? slaDetailResult.value
        : null;

    const nextStatus =
      slaStatusResult.status === 'fulfilled'
        ? slaStatusResult.value
        : null;

    const nextTimeline =
      slaTimelineResult.status === 'fulfilled' &&
      Array.isArray(slaTimelineResult.value)
        ? slaTimelineResult.value
        : [];

    if (slaDetailResult.status === 'fulfilled') {
      setSlaDetail(nextDetail);
    }

    if (slaStatusResult.status === 'fulfilled') {
      setSlaStatus(nextStatus);
    }

    if (slaTimelineResult.status === 'fulfilled') {
      setSlaTimeline(nextTimeline);
    }

    setSlaError(
      slaDetailResult.status === 'rejected' &&
      slaStatusResult.status === 'rejected'
        ? 'Phản ánh này chưa có SLA hoặc không thể tải dữ liệu SLA.'
        : ''
    );
  }, [feedbackId]);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await managementFeedbackApi.getFeedbackById(feedbackId);
      setFeedback(detail);
      const [
        reportResult,
        resolutionsResult,
        slaDetailResult,
        slaStatusResult,
        slaTimelineResult,
      ] = await Promise.allSettled([
        managementFeedbackApi.getProviderReports(feedbackId),
        managementFeedbackApi.getResolutions(feedbackId),
        slaApi.getCurrentFeedbackSla(feedbackId),
        slaApi.getFeedbackSlaStatus(feedbackId),
        slaApi.getFeedbackSlaTimeline(feedbackId),
      ]);

      const reportList = reportResult.status === 'fulfilled'
        ? normalizeProviderReports(reportResult.value)
        : [];
      const resolutionList = resolutionsResult.status === 'fulfilled'
        ? normalizeResolutions(resolutionsResult.value)
        : [];

      setSlaDetail(slaDetailResult.status === 'fulfilled' ? slaDetailResult.value : null);
      setSlaStatus(slaStatusResult.status === 'fulfilled' ? slaStatusResult.value : null);
      setSlaTimeline(
        slaTimelineResult.status === 'fulfilled' && Array.isArray(slaTimelineResult.value)
          ? slaTimelineResult.value
          : []
      );
      setSlaError(
        slaDetailResult.status === 'rejected' && slaStatusResult.status === 'rejected'
          ? 'Phản ánh này chưa có SLA hoặc không thể tải dữ liệu SLA.'
          : ''
      );
      const selectedResolution = pickLatestResolution(resolutionList);
      const selectedReport = pickProviderReport(reportList, selectedResolution?.providerReportId);

      setProviderReport(selectedReport);
      setResolutions(resolutionList);

      if (selectedReport?.providerReportId) {
        try {
          const documentResult = await managementFeedbackApi.getProviderReportCompletionDocuments(
            selectedReport.providerReportId
          );
          setDocuments(normalizeDocuments(documentResult));
        } catch (documentError) {
          console.warn('Failed to load completion documents', documentError);
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load approval detail', err);
      setMessage({ type: 'error', text: err?.message || 'Không thể tải chi tiết duyệt.' });
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    if (feedbackId) loadFeedback();
  }, [feedbackId, loadFeedback]);

  useEffect(() => {
    if (!slaStatus) return;

    setSlaClock({
      responseSeconds: Math.max(
        0,
        Number(slaStatus.responseRemainingSeconds) || 0
      ),
      resolutionSeconds: Math.max(
        0,
        Number(slaStatus.resolutionRemainingSeconds) || 0
      ),
      syncedAt: Date.now(),
      status: String(slaStatus.status || ''),
    });

    setClockTick(Date.now());
  }, [
    slaStatus?.feedbackSlaId,
    slaStatus?.serverTime,
    slaStatus?.status,
    slaStatus?.responseRemainingSeconds,
    slaStatus?.resolutionRemainingSeconds,
  ]);

  useEffect(() => {
    const isRunning =
      String(slaClock.status || '').toLowerCase() === 'running';

    if (!isRunning) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [slaClock.status, slaClock.syncedAt]);

  useEffect(() => {
    if (!feedbackId) return undefined;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getSlaHubUrl(), {
        accessTokenFactory: () => getSignalRAccessToken(),
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    let disposed = false;

    connection.on('SlaUpdated', async (payload) => {
      const updatedFeedbackId = String(
        payload?.feedbackId ??
        payload?.FeedbackId ??
        ''
      );

      if (
        !updatedFeedbackId ||
        updatedFeedbackId.toLowerCase() !== String(feedbackId).toLowerCase()
      ) {
        return;
      }

      try {
        await refreshSlaData();
      } catch (error) {
        console.warn('Không thể đồng bộ lại SLA sau SignalR event.', error);
      }
    });

    const startConnection = async () => {
      try {
        await connection.start();

        if (!disposed) {
          console.info('SLA SignalR connected.');
        }
      } catch (error) {
        if (!disposed) {
          console.warn('Không thể kết nối SLA SignalR.', error);
        }
      }
    };

    startConnection();

    return () => {
      disposed = true;
      connection.off('SlaUpdated');
      connection.stop().catch(() => {});
    };
  }, [feedbackId, refreshSlaData]);

  const latestResolution = pickLatestResolution(
    resolutions.length > 0
      ? resolutions
      : feedback?.resolution
        ? [feedback.resolution]
        : []
  );

  const beforeImages = useMemo(() => {
    const attachments = Array.isArray(feedback?.attachments) ? feedback.attachments : [];
    return attachments
      .map((attachment) => typeof attachment === 'string' ? attachment : attachment?.fileUrl || attachment?.url || '')
      .filter(Boolean);
  }, [feedback]);

  const afterImages = useMemo(() => (
    documents
      .filter(isImageDocument)
      .map((document) => document?.fileUrl || '')
      .filter(Boolean)
  ), [documents]);

  const fallbackTimeline = useMemo(() => [
    { status: managementTypes.feedbackStatus.SUBMITTED, subtitle: 'Người dân đã gửi phản ánh' },
    { status: managementTypes.feedbackStatus.AI_REVIEWED, subtitle: 'AI hoàn tất phân loại sơ bộ' },
    { status: managementTypes.feedbackStatus.VERIFIED, subtitle: 'Nhân viên đã xác minh thông tin' },
    { status: managementTypes.feedbackStatus.ASSIGNED, subtitle: 'Đã chuyển tới đơn vị phối hợp' },
    { status: managementTypes.feedbackStatus.IN_PROGRESS, subtitle: 'Đơn vị đang thực hiện xử lý' },
    { status: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL, subtitle: 'Kết quả đang chờ người quản lý quyết định' },
  ], []);

  const activeTimelineIndex = useMemo(() => {
    const map = {
      [managementTypes.feedbackStatus.SUBMITTED]: 0,
      [managementTypes.feedbackStatus.AI_REVIEWED]: 1,
      [managementTypes.feedbackStatus.VERIFIED]: 2,
      [managementTypes.feedbackStatus.ASSIGNED]: 3,
      [managementTypes.feedbackStatus.IN_PROGRESS]: 4,
      [managementTypes.feedbackStatus.RESOLVED]: 5,
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 5,
      [managementTypes.feedbackStatus.APPROVED]: 5,
      [managementTypes.feedbackStatus.NEED_REWORK]: 5,
      [managementTypes.feedbackStatus.REJECTED]: 5,
      [managementTypes.feedbackStatus.CLOSED]: 5,
      [managementTypes.feedbackStatus.CANCELLED]: 5,
    };
    return map[feedback?.status] ?? 0;
  }, [feedback?.status]);

  const timelineItems = useMemo(() => {
    const histories = Array.isArray(feedback?.statusHistories)
      ? feedback.statusHistories
      : [];

    if (histories.length > 0) {
      return [...histories]
        .sort(
          (a, b) =>
            new Date(a?.changedAt || 0) -
            new Date(b?.changedAt || 0)
        )
        .map(normalizeHistoryItem);
    }

    const visibleMilestones = fallbackTimeline.slice(0, Math.max(1, activeTimelineIndex + 1));
    const lastMilestone = visibleMilestones[visibleMilestones.length - 1];

    if (feedback?.status && lastMilestone?.status !== feedback.status) {
      visibleMilestones.push({
        status: feedback.status,
        subtitle: `Hồ sơ hiện ở trạng thái ${getStatusLabel(feedback.status)}`,
      });
    }

    return visibleMilestones;
  }, [activeTimelineIndex, fallbackTimeline, feedback]);

  const runSlaAction = async (key, action, successText) => {
    if (slaActionLoading) return;
    setSlaActionLoading(key);
    try {
      await action();
      setMessage({ type: 'success', text: successText });
      await loadFeedback();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Không thể cập nhật SLA.' });
    } finally {
      setSlaActionLoading('');
    }
  };

  const openSlaModal = (type) => {
    setMessage({ type: '', text: '' });
    setPauseReasonOpen(false);
    setSlaModalForm({
      reasonCode: type === 'pause' ? 'WaitingCitizen' : 'Other',
      note: '',
    });
    setSlaModal(type);
  };

  const closeSlaModal = () => {
    if (slaActionLoading) return;
    setPauseReasonOpen(false);
    setSlaModal(null);
    setSlaModalForm({
      reasonCode: 'WaitingCitizen',
      note: '',
    });
  };

  const handlePauseSla = () => openSlaModal('pause');
  const handleResumeSla = () => openSlaModal('resume');
  const handleCancelSla = () => openSlaModal('cancel');

  const handleSubmitSlaModal = async () => {
    const noteValue = String(slaModalForm.note || '').trim();

    if (slaModal === 'pause') {
      const allowedPauseReasons = new Set([
        'WaitingCitizen',
        'ForceMajeure',
        'ExternalDependency',
        'SystemMaintenance',
        'Other',
      ]);

      if (!allowedPauseReasons.has(slaModalForm.reasonCode)) {
        setMessage({ type: 'error', text: 'Vui lòng chọn lý do tạm dừng hợp lệ.' });
        return;
      }

      await runSlaAction(
        'pause',
        () => slaApi.pauseFeedbackSla(feedbackId, {
          ReasonCode: slaModalForm.reasonCode,
          ReasonNote: noteValue || null,
        }),
        'Đã tạm dừng SLA.'
      );
      setSlaModal(null);
      return;
    }

    if (slaModal === 'resume') {
      await runSlaAction(
        'resume',
        () => slaApi.resumeFeedbackSla(feedbackId, {
          Note: noteValue || null,
        }),
        'Đã tiếp tục SLA.'
      );
      setSlaModal(null);
      return;
    }

    if (slaModal === 'cancel') {
      if (!noteValue) {
        setMessage({ type: 'error', text: 'Vui lòng nhập lý do hủy SLA.' });
        return;
      }

      await runSlaAction(
        'cancel',
        () => slaApi.cancelFeedbackSla(feedbackId, noteValue),
        'Đã hủy SLA.'
      );
      setSlaModal(null);
    }
  };

  const handleCheckSlaViolation = async () => {
    const feedbackSlaId = slaDetail?.feedbackSlaId;
    if (!feedbackSlaId) {
      setMessage({ type: 'error', text: 'Không tìm thấy Feedback SLA ID.' });
      return;
    }
    await runSlaAction('check', () => slaApi.checkSlaViolation(feedbackSlaId), 'Đã kiểm tra vi phạm SLA.');
  };

  const handleDecision = async (decision) => {
  const normalizedReworkReason = (reworkReason || note).trim();

  if (decision === 'rework' && !normalizedReworkReason) {
    setMessage({
      type: 'error',
      text: 'Vui lòng nhập lý do yêu cầu làm lại.'
    });
    setConfirmingAction(null);
    return;
  }

  setSubmitting(true);

  try {
    if (decision === 'approve') {
      /*
       * 1. Manager duyệt kết quả
       */
      await managementFeedbackApi.approveFeedback(
        feedbackId,
        note
      );

      /*
       * 2. Chỉ khi DUYỆT mới Complete SLA
       */
      await slaApi.completeFeedbackSla(
        feedbackId,
        {
          Note:
            String(note || '').trim() ||
            'Manager đã duyệt kết quả xử lý.'
        }
      );

      setMessage({
        type: 'success',
        text: 'Đã duyệt kết quả xử lý và hoàn thành SLA.'
      });
    } else {
      /*
       * Yêu cầu làm lại:
       * - KHÔNG complete SLA
       * - SLA vẫn Running
       */
      await managementFeedbackApi.requestRework(
        feedbackId,
        normalizedReworkReason
      );

      setMessage({
        type: 'success',
        text: 'Đã gửi yêu cầu làm lại. SLA tiếp tục được theo dõi.'
      });
    }

    await loadFeedback();

    navigate('/manager/approvals', {
      state: {
        refreshKey: Date.now()
      }
    });
  } catch (err) {
    console.error(
      'Failed to complete approval decision',
      err
    );

    setMessage({
      type: 'error',
      text:
        err?.message ||
        'Không thể cập nhật quyết định duyệt.'
    });
  } finally {
    setSubmitting(false);
    setConfirmingAction(null);
    setReworkReason('');
  }
};

  if (loading) {
    return (
      <article className="admin-page-shell space-y-6" aria-busy="true" aria-label="Đang tải hồ sơ duyệt">
        <header className="admin-page-hero h-40 animate-pulse" />
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
          <article className="admin-panel h-96 animate-pulse" />
          <aside className="admin-panel h-80 animate-pulse" />
        </section>
      </article>
    );
  }

  if (!feedback) {
    return (
      <article className="admin-page-shell space-y-6">
        <ManagerPageHeader
          title="Không tìm thấy hồ sơ"
          description="Hồ sơ có thể đã bị xóa hoặc tài khoản hiện tại không có quyền truy cập."
          icon={Lucide.FileQuestion}
        />
        <section className="admin-panel overflow-hidden">
          <ManagerEmptyState
            icon={Lucide.FileQuestion}
            title="Không có dữ liệu phản ánh"
            description="Quay lại danh sách và chọn một hồ sơ khác."
            action={(
              <button type="button" className="btn admin-primary-action rounded-2xl" onClick={() => navigate(backPath)}>
                Quay lại danh sách
              </button>
            )}
          />
        </section>
      </article>
    );
  }

  const isAwaitingApproval = feedback.status === managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL;
  const hasProcessingData = Boolean(latestResolution || providerReport || documents.length > 0);
  const hasImageComparison = afterImages.length > 0;
  const olderResolutions = resolutions.filter((resolution) => resolution !== latestResolution);

  const isSlaRunning =
    String(slaClock.status || '').toLowerCase() === 'running';

  const elapsedSeconds =
    isSlaRunning && slaClock.syncedAt
      ? Math.max(
          0,
          Math.floor(
            (clockTick - slaClock.syncedAt) / 1000
          )
        )
      : 0;

  const responseCountdownSeconds =
    String(slaStatus?.responseStatus || '').toLowerCase() === 'pending'
      ? Math.max(
          0,
          slaClock.responseSeconds - elapsedSeconds
        )
      : 0;

  const resolutionCountdownSeconds =
    String(slaStatus?.resolutionStatus || '').toLowerCase() === 'pending'
      ? Math.max(
          0,
          slaClock.resolutionSeconds - elapsedSeconds
        )
      : 0;

  const SLA_PAUSE_REASONS = [
    { value: 'WaitingCitizen', label: 'Chờ phản hồi từ người dân' },
    { value: 'ForceMajeure', label: 'Sự kiện bất khả kháng' },
    { value: 'ExternalDependency', label: 'Phụ thuộc đơn vị bên ngoài' },
    { value: 'SystemMaintenance', label: 'Bảo trì hệ thống' },
    { value: 'Other', label: 'Lý do khác' },
  ];

  const slaModalConfig = (() => {
    if (slaModal === 'pause') {
      return {
        title: 'Tạm dừng SLA',
        description: 'Đồng hồ SLA sẽ ngừng tính trong thời gian tạm dừng.',
        Icon: Lucide.PauseCircle,
        iconClass: 'bg-amber-50 text-amber-700',
        confirmLabel: 'Tạm dừng SLA',
        confirmClass: 'btn rounded-2xl bg-amber-600 text-white hover:bg-amber-700',
      };
    }

    if (slaModal === 'resume') {
      return {
        title: 'Tiếp tục SLA',
        description: 'SLA sẽ tiếp tục chạy và deadline được điều chỉnh theo tổng thời gian đã tạm dừng.',
        Icon: Lucide.PlayCircle,
        iconClass: 'bg-emerald-50 text-emerald-700',
        confirmLabel: 'Tiếp tục SLA',
        confirmClass: 'btn rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700',
      };
    }

    if (slaModal === 'cancel') {
      return {
        title: 'Hủy SLA',
        description: 'Thao tác này dừng SLA hiện tại. Chỉ sử dụng khi phản ánh thực sự không còn cần được theo dõi theo SLA.',
        Icon: Lucide.XCircle,
        iconClass: 'bg-rose-50 text-rose-700',
        confirmLabel: 'Xác nhận hủy SLA',
        confirmClass: 'btn rounded-2xl bg-rose-600 text-white hover:bg-rose-700',
      };
    }

    return null;
  })();

  return (
    <article className="admin-page-shell space-y-6">
      {message.type === 'success' ? (
        <aside aria-live="polite"><SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} /></aside>
      ) : null}
      {message.type === 'error' ? (
        <aside aria-live="assertive"><ErrorAlert title="Không thể hoàn tất thao tác" message={message.text} onClose={() => setMessage({ type: '', text: '' })} /></aside>
      ) : null}

      <ManagerPageHeader
        title={feedback.title || 'Chi tiết phản ánh'}
        description={`${feedback.areaName || 'Chưa xác định khu vực'} · ${feedback.categoryName || 'Chưa phân loại'}`}
        icon={Lucide.FileText}
        statusLabel="Trạng thái"
        statusValue={getStatusLabel(feedback.status)}
        statusTone={getHeaderStatusTone(feedback.status)}
        actions={(
          <button type="button" onClick={() => navigate(backPath)} className="btn admin-secondary-action rounded-2xl">
            <Lucide.ArrowLeft size={16} aria-hidden="true" />
            Quay lại
          </button>
        )}
      />


      <section className="admin-panel overflow-hidden" aria-labelledby="sla-detail-title">
        <ManagerSectionHeader
          id="sla-detail-title"
          title="SLA của phản ánh"
          description="Theo dõi chính sách, thời hạn phản hồi, thời hạn hoàn thành, cảnh báo, vi phạm và lịch sử SLA."
          icon={Lucide.TimerReset}
          actions={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSlaBadgeClass(slaStatus?.status || slaDetail?.status)}`}>
                {getSlaStatusLabel(slaStatus?.status || slaDetail?.status || 'Chưa có SLA')}
              </span>
              {String(slaStatus?.status || slaDetail?.status || '').toLowerCase() === 'paused' ? (
                <button type="button" className="btn admin-secondary-action rounded-xl" onClick={handleResumeSla} disabled={Boolean(slaActionLoading)}>
                  <Lucide.Play size={15} /> {slaActionLoading === 'resume' ? 'Đang tiếp tục...' : 'Tiếp tục SLA'}
                </button>
              ) : (
                <button type="button" className="btn admin-secondary-action rounded-xl" onClick={handlePauseSla} disabled={Boolean(slaActionLoading) || !slaDetail?.feedbackSlaId}>
                  <Lucide.Pause size={15} /> {slaActionLoading === 'pause' ? 'Đang tạm dừng...' : 'Tạm dừng SLA'}
                </button>
              )}
              <button type="button" className="btn admin-secondary-action rounded-xl" onClick={handleCheckSlaViolation} disabled={Boolean(slaActionLoading) || !slaDetail?.feedbackSlaId}>
                <Lucide.ShieldCheck size={15} /> {slaActionLoading === 'check' ? 'Đang kiểm tra...' : 'Kiểm tra vi phạm'}
              </button>
              <button type="button" className="btn rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={handleCancelSla} disabled={Boolean(slaActionLoading) || !slaDetail?.feedbackSlaId}>
                <Lucide.XCircle size={15} /> {slaActionLoading === 'cancel' ? 'Đang hủy...' : 'Hủy SLA'}
              </button>
            </div>
          )}
        />

        {slaError && !slaDetail && !slaStatus ? (
          <div className="p-5 sm:p-6">
            <ErrorAlert title="Không có dữ liệu SLA" message={slaError} onClose={() => setSlaError('')} />
          </div>
        ) : (
          <section className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Chính sách SLA</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{slaDetail?.policyName || '—'}</h3>
                <p className="mt-2 text-xs text-slate-500">{slaDetail?.priority || feedback.priority || '—'} · {slaDetail?.categoryName || feedback.categoryName || '—'}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Mã SLA</p>
                <h3 className="mt-2 font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">{slaDetail?.feedbackSlaId || '—'}</h3>
                <p className="mt-2 text-xs text-slate-500">{slaDetail?.isCurrent === false ? 'SLA lịch sử' : 'SLA hiện tại'}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Bắt đầu</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{formatDateTime(slaDetail?.startedAt || slaStatus?.startedAt)}</h3>
                <p className="mt-2 text-xs text-slate-500">{slaDetail?.startedByUserName || 'Hệ thống / không xác định'}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tổng thời gian tạm dừng</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{Number(slaDetail?.totalPausedMinutes || 0)} phút</h3>
                <p className="mt-2 text-xs text-slate-500">{Array.isArray(slaDetail?.pauseHistories) ? slaDetail.pauseHistories.length : 0} lần tạm dừng</p>
              </article>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                <header className="flex items-center justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Phản hồi đầu tiên</p><h3 className="mt-1 text-base font-semibold">Thời hạn phản hồi</h3></div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSlaBadgeClass(slaStatus?.responseStatus || slaDetail?.responseStatus)}`}>{getSlaStatusLabel(slaStatus?.responseStatus || slaDetail?.responseStatus || 'Pending')}</span>
                </header>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <MetaItem label="Hạn xử lý">{formatDateTime(slaDetail?.responseDueAt || slaStatus?.responseDueAt)}</MetaItem>
                  <MetaItem label="Thời điểm phản hồi">{formatDateTime(slaDetail?.respondedAt)}</MetaItem>
                  <MetaItem label="Còn lại">
                    <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatSlaCountdown(responseCountdownSeconds)}
                    </span>
                  </MetaItem>
                  <MetaItem label="Vi phạm">{slaStatus?.isResponseBreached || slaDetail?.isResponseBreached ? 'Có' : 'Không'}</MetaItem>
                </dl>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                <header className="flex items-center justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Hoàn thành xử lý</p><h3 className="mt-1 text-base font-semibold">Thời hạn hoàn thành</h3></div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSlaBadgeClass(slaStatus?.resolutionStatus || slaDetail?.resolutionStatus)}`}>{getSlaStatusLabel(slaStatus?.resolutionStatus || slaDetail?.resolutionStatus || 'Pending')}</span>
                </header>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <MetaItem label="Hạn xử lý">{formatDateTime(slaDetail?.resolutionDueAt || slaStatus?.resolutionDueAt)}</MetaItem>
                  <MetaItem label="Thời điểm hoàn thành">{formatDateTime(slaDetail?.resolvedAt)}</MetaItem>
                  <MetaItem label="Còn lại">
                    <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatSlaCountdown(resolutionCountdownSeconds)}
                    </span>
                  </MetaItem>
                  <MetaItem label="Vi phạm">{slaStatus?.isResolutionBreached || slaDetail?.isResolutionBreached ? 'Có' : 'Không'}</MetaItem>
                </dl>
              </article>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <article>
                <div className="flex items-center gap-2"><Lucide.History size={17} className="text-blue-600" /><h3 className="text-sm font-semibold">Lịch sử SLA</h3></div>
                {slaTimeline.length > 0 ? (
                  <div className="mt-4 max-h-[410px] overflow-y-auto pr-2 [scrollbar-gutter:stable]"><ol className="space-y-3">
                    {slaTimeline.map((event, index) => (
                      <li key={event.slaEventId || `${event.eventType}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{event.eventType || 'Sự kiện SLA'}</strong><time className="text-[11px] text-slate-400">{formatDateTime(event.createdAt)}</time></div>
                        {event.note ? <p className="mt-2 text-xs leading-5 text-slate-500">{event.note}</p> : null}
                        <p className="mt-1 text-[11px] text-slate-400">{event.triggeredByUserName || event.triggerSource || 'Hệ thống'}</p>
                      </li>
                    ))}
                  </ol></div>
                ) : <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Chưa có sự kiện SLA.</p>}
              </article>

              <article>
                <div className="flex items-center gap-2"><Lucide.PauseCircle size={17} className="text-amber-600" /><h3 className="text-sm font-semibold">Lịch sử tạm dừng</h3></div>
                {Array.isArray(slaDetail?.pauseHistories) && slaDetail.pauseHistories.length > 0 ? (
                  <div className="mt-4 max-h-[410px] overflow-y-auto pr-2 [scrollbar-gutter:stable]"><ul className="space-y-3">
                    {slaDetail.pauseHistories.map((pause, index) => (
                      <li key={pause.slaPauseHistoryId || index} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <dl className="grid gap-3 sm:grid-cols-2">
                          <MetaItem label="Thời điểm tạm dừng">{formatDateTime(pause.pausedAt)}</MetaItem>
                          <MetaItem label="Thời điểm tiếp tục">{formatDateTime(pause.resumedAt)}</MetaItem>
                          <MetaItem label="Thời gian tạm dừng">{formatPauseDuration(pause)}</MetaItem>
                          <MetaItem label="Lý do">{pause.reasonNote || pause.reasonCode || 'Không có ghi chú'}</MetaItem>
                        </dl>
                      </li>
                    ))}
                  </ul></div>
                ) : <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">SLA chưa từng được tạm dừng.</p>}
              </article>
            </div>
          </section>
        )}
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
        <article className="admin-panel overflow-hidden" aria-labelledby="feedback-overview-title">
          <ManagerSectionHeader
            id="feedback-overview-title"
            title="Nội dung phản ánh"
            description="Thông tin gốc được gom trong một khu vực để dễ đọc và đối chiếu."
            icon={Lucide.MessageSquareText}
            actions={(
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${PRIORITY_BADGE_CLASSES[feedback.priority] || PRIORITY_BADGE_CLASSES.Medium}`}>
                {feedback.priority || 'Medium'}
              </span>
            )}
          />

          <section className="space-y-6 p-5 sm:p-6">
            <blockquote className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base leading-7 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              {feedback.description || 'Không có mô tả chi tiết.'}
            </blockquote>

            {beforeImages.length > 0 ? (
              <section aria-labelledby="feedback-images-title">
                <h3 id="feedback-images-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Hình ảnh người dân gửi</h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {beforeImages.map((image, index) => (
                    <li key={`${image}-${index}`}>
                      <a href={image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                        <img src={image} alt={`Hình ảnh phản ánh ${index + 1}`} className="h-48 w-full object-cover transition hover:scale-[1.02]" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <dl className="grid gap-x-8 gap-y-5 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-800">
              <MetaItem label="Người gửi">{feedback.userName || 'Không xác định'}</MetaItem>
              <MetaItem label="Thời điểm gửi">{formatDateTime(feedback.createdAt)}</MetaItem>
              <MetaItem label="Khu vực">{feedback.areaName || 'Chưa xác định'}</MetaItem>
              <MetaItem label="Danh mục">{feedback.categoryName || 'Chưa phân loại'}</MetaItem>
              <MetaItem label="Vị trí" wide>
                <address className="not-italic">{resolvedLocationText}</address>
                {feedback.areaName ? (
                  <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{feedback.areaName}</span>
                ) : null}
              </MetaItem>
              <MetaItem label="Mã phản ánh" wide><code className="break-all text-xs text-blue-700 dark:text-blue-300">{feedback.feedbackId}</code></MetaItem>
            </dl>
          </section>
        </article>

        <aside className="space-y-6" aria-label="Tiến trình và quyết định">
          <section className="admin-panel overflow-hidden">
            <ManagerSectionHeader
              title="Tiến trình xử lý"
              description="Chỉ hiển thị các mốc đã phát sinh."
              icon={Lucide.Workflow}
            />
            <ol className="space-y-1 p-5 sm:p-6">
              {timelineItems.map((item, index) => {
                const isCurrent = index === timelineItems.length - 1;
                return (
                  <li key={`${item.status}-${item.changedAt || index}`} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < timelineItems.length - 1 ? (
                      <span className="absolute bottom-0 left-[7px] top-4 w-px bg-emerald-200 dark:bg-emerald-800" aria-hidden="true" />
                    ) : null}
                    <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${isCurrent ? 'border-blue-600 bg-blue-600' : 'border-emerald-500 bg-emerald-500'}`} aria-hidden="true" />
                    <article className={`min-w-0 flex-1 rounded-xl px-3 py-2.5 ${isCurrent ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                      {item.changedAt ? <time className="mt-1 block text-[11px] text-slate-400" dateTime={item.changedAt}>{formatDateTime(item.changedAt)}</time> : null}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>

          {isAwaitingApproval ? (
            <section className="admin-panel overflow-hidden xl:sticky xl:top-6">
              <ManagerSectionHeader
                title="Quyết định duyệt"
                description="Duyệt hoặc trả lại hồ sơ sau khi kiểm tra kết quả và bằng chứng."
                icon={Lucide.Gavel}
              />
              <form className="space-y-4 p-5 sm:p-6" onSubmit={(event) => event.preventDefault()}>
                <fieldset>
                  <legend className="sr-only">Ghi chú phê duyệt</legend>
                  <label htmlFor="approval-note" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ghi chú quyết định</label>
                  <textarea
                    id="approval-note"
                    rows="4"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Nội dung cần lưu lại cùng quyết định..."
                    className="textarea textarea-bordered mt-2 w-full rounded-2xl bg-white text-sm dark:bg-slate-900"
                  />
                </fieldset>

                <footer className="grid gap-2">
                  <button type="button" onClick={() => setConfirmingAction('approve')} disabled={submitting} className="btn admin-primary-action rounded-2xl">
                    <Lucide.CheckCircle2 size={17} aria-hidden="true" />
                    Duyệt kết quả
                  </button>
                  <button type="button" onClick={() => setConfirmingAction('rework')} disabled={submitting} className="btn admin-secondary-action rounded-2xl text-amber-700">
                    <Lucide.RotateCcw size={17} aria-hidden="true" />
                    Yêu cầu làm lại
                  </button>
                </footer>
              </form>
            </section>
          ) : null}
        </aside>
      </section>

      {hasProcessingData || isAwaitingApproval ? (
        <section className="admin-panel overflow-hidden" aria-labelledby="processing-result-title">
          <ManagerSectionHeader
            id="processing-result-title"
            title="Kết quả và đơn vị xử lý"
            description="Thông tin gần nhất phục vụ việc theo dõi hoặc ra quyết định."
            icon={Lucide.ClipboardCheck}
            actions={latestResolution ? (
              <time className="text-xs font-medium text-slate-500" dateTime={getResolutionDate(latestResolution) || undefined}>
                {formatDateTime(getResolutionDate(latestResolution))}
              </time>
            ) : null}
          />

          <section className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] sm:p-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Kết quả mới nhất</h3>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[feedback.status] || STATUS_BADGE_CLASSES.SubmittedForApproval}`}>
                  {getStatusLabel(feedback.status)}
                </span>
              </header>

              {latestResolution ? (
                <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <ResolutionField label="Tóm tắt kết quả" wide>{latestResolution.resolutionSummary}</ResolutionField>
                  <ResolutionField label="Hành động đã thực hiện">{latestResolution.actionTaken}</ResolutionField>
                  <ResolutionField label="Ghi chú kết quả">{latestResolution.resultNote}</ResolutionField>
                  <ResolutionField label="Người gửi kết quả">{latestResolution.createdByStaffUserName || 'Không xác định'}</ResolutionField>
                  <ResolutionField label="Mã báo cáo xử lý">{latestResolution.providerReportId || 'Không liên kết'}</ResolutionField>
                </dl>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  Hồ sơ chưa có bản ghi kết quả xử lý. Chưa thể phê duyệt nếu thiếu nội dung này.
                </p>
              )}
            </article>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40" aria-label="Thông tin đơn vị xử lý">
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Đơn vị phối hợp</h3>
              {providerReport ? (
                <dl className="mt-5 space-y-4">
                  <MetaItem label="Đơn vị">{providerReport.providerName || 'Chưa xác định'}</MetaItem>
                  <MetaItem label="Điều phối viên">{providerReport.coordinatorName || 'Chưa xác định'}</MetaItem>
                  <MetaItem label="Trạng thái báo cáo xử lý">{providerReport.reportStatus || 'Chưa xác định'}</MetaItem>
                  <MetaItem label="Thời điểm chuyển">{formatDateTime(providerReport.reportedAt)}</MetaItem>
                  {providerReport.reportNote ? <MetaItem label="Ghi chú phối hợp">{providerReport.reportNote}</MetaItem> : null}
                </dl>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Chưa có báo cáo xử lý được liên kết với phản ánh này.</p>
              )}
            </aside>
          </section>
        </section>
      ) : null}

      {hasImageComparison || documents.length > 0 ? (
        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]" aria-label="Bằng chứng xử lý">
          {hasImageComparison ? (
            <article className="admin-panel overflow-hidden">
              <ManagerSectionHeader
                title="Đối chiếu hình ảnh"
                description="So sánh hình ảnh ban đầu và bằng chứng sau xử lý."
                icon={Lucide.Images}
              />
              <section className="grid gap-5 p-5 md:grid-cols-2 sm:p-6">
                <figure>
                  <figcaption className="text-xs font-semibold text-slate-600 dark:text-slate-300">Trước xử lý</figcaption>
                  <section className="mt-3 grid gap-3">
                    {beforeImages.length > 0 ? beforeImages.map((image, index) => (
                      <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                        <img src={image} alt={`Tình trạng trước xử lý ${index + 1}`} className="h-52 w-full object-cover" />
                      </a>
                    )) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Không có ảnh ban đầu.</p>}
                  </section>
                </figure>

                <figure>
                  <figcaption className="text-xs font-semibold text-slate-600 dark:text-slate-300">Sau xử lý</figcaption>
                  <section className="mt-3 grid gap-3">
                    {afterImages.length > 0 ? afterImages.map((image, index) => (
                      <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800">
                        <img src={image} alt={`Kết quả sau xử lý ${index + 1}`} className="h-52 w-full object-cover" />
                      </a>
                    )) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Chưa có ảnh hoàn thành.</p>}
                  </section>
                </figure>
              </section>
            </article>
          ) : null}

          {documents.length > 0 ? (
            <article className="admin-panel overflow-hidden">
              <ManagerSectionHeader
                title="Tài liệu hoàn thành"
                description={`${documents.length} tài liệu do đơn vị xử lý gửi.`}
                icon={Lucide.Paperclip}
              />
              <ul className="divide-y divide-slate-100 p-5 sm:p-6 dark:divide-slate-800">
                {documents.map((document, index) => (
                  <li key={document.completionDocumentId || document.fileUrl || index} className="py-4 first:pt-0 last:pb-0">
                    <article>
                      <header className="flex items-start gap-3">
                        <span className="admin-mini-icon shrink-0" aria-hidden="true">
                          {isImageDocument(document) ? <Lucide.Image size={17} /> : <Lucide.FileText size={17} />}
                        </span>
                        <span className="min-w-0">
                          <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{getFileLabel(document, index)}</h3>
                          {document.description ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{document.description}</p> : null}
                        </span>
                      </header>
                      {document.fileUrl ? (
                        <footer className="mt-3 pl-11">
                          <a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">
                            <Lucide.ExternalLink size={14} aria-hidden="true" />
                            Mở tài liệu
                          </a>
                        </footer>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </section>
      ) : null}

      {olderResolutions.length > 0 ? (
        <details className="admin-panel overflow-hidden group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <span className="flex min-w-0 items-center gap-3">
              <span className="admin-mini-icon" aria-hidden="true"><Lucide.History size={17} /></span>
              <span>
                <strong className="block text-sm font-semibold text-slate-950 dark:text-white">Lịch sử kết quả trước đó</strong>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{olderResolutions.length} lần gửi cũ được giữ để truy vết.</span>
              </span>
            </span>
            <Lucide.ChevronDown size={18} className="shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ol className="space-y-3 border-t border-slate-200 p-5 sm:p-6 dark:border-slate-800">
            {olderResolutions.map((resolution, index) => (
              <li key={resolution.resolutionId || index}>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lần gửi trước</h3>
                    <time className="text-xs text-slate-500" dateTime={getResolutionDate(resolution) || undefined}>{formatDateTime(getResolutionDate(resolution))}</time>
                  </header>
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <ResolutionField label="Tóm tắt" wide>{resolution.resolutionSummary}</ResolutionField>
                    <ResolutionField label="Hành động">{resolution.actionTaken}</ResolutionField>
                    <ResolutionField label="Ghi chú">{resolution.resultNote}</ResolutionField>
                  </dl>
                </article>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {slaModal && slaModalConfig && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSlaModal();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="sla-action-dialog-title"
              className="w-full max-w-xl overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <header className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${slaModalConfig.iconClass}`} aria-hidden="true">
                  {slaModal === 'pause' ? <Lucide.PauseCircle size={21} /> : null}
                  {slaModal === 'resume' ? <Lucide.PlayCircle size={21} /> : null}
                  {slaModal === 'cancel' ? <Lucide.XCircle size={21} /> : null}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 id="sla-action-dialog-title" className="text-xl font-semibold text-slate-950 dark:text-white">
                        {slaModalConfig.title}
                      </h2>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {slaModalConfig.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeSlaModal}
                      disabled={Boolean(slaActionLoading)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
                      aria-label="Đóng"
                    >
                      <Lucide.X size={19} />
                    </button>
                  </div>
                </div>
              </header>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmitSlaModal();
                }}
              >
                <div className="space-y-5 px-6 py-5">
                  {slaModal === 'pause' ? (
                    <div className="relative">
                      <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Lý do tạm dừng <span className="text-rose-600">*</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setPauseReasonOpen((current) => !current)}
                        className={`mt-2 flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-medium transition dark:bg-slate-950 ${
                          pauseReasonOpen
                            ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40'
                            : 'border-slate-300 hover:border-slate-400 dark:border-slate-700'
                        }`}
                        aria-haspopup="listbox"
                        aria-expanded={pauseReasonOpen}
                      >
                        <span className="truncate text-slate-800 dark:text-slate-100">
                          {SLA_PAUSE_REASONS.find((reason) => reason.value === slaModalForm.reasonCode)?.label || 'Chọn lý do tạm dừng'}
                        </span>
                        <Lucide.ChevronDown
                          size={17}
                          className={`shrink-0 text-slate-400 transition-transform ${pauseReasonOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {pauseReasonOpen ? (
                        <div
                          className="absolute left-0 right-0 top-full z-[10010] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                          role="listbox"
                        >
                          {SLA_PAUSE_REASONS.map((reason) => {
                            const selected = reason.value === slaModalForm.reasonCode;
                            return (
                              <button
                                key={reason.value}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setSlaModalForm((current) => ({
                                    ...current,
                                    reasonCode: reason.value,
                                  }));
                                  setPauseReasonOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                  selected
                                    ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span>{reason.label}</span>
                                {selected ? <Lucide.Check size={16} /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {slaModal === 'cancel' ? 'Lý do hủy' : 'Ghi chú'}
                      {slaModal === 'cancel' ? <span className="text-rose-600"> *</span> : null}
                    </span>

                    <textarea
                      rows="4"
                      value={slaModalForm.note}
                      onChange={(event) => setSlaModalForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))}
                      placeholder={
                        slaModal === 'pause'
                          ? 'Nhập ghi chú chi tiết nếu cần...'
                          : slaModal === 'resume'
                            ? 'Nhập ghi chú khi tiếp tục nếu cần...'
                            : 'Nhập lý do hủy SLA...'
                      }
                      className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900/40"
                      required={slaModal === 'cancel'}
                    />
                  </label>

                  {slaModal === 'cancel' ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">
                      <Lucide.TriangleAlert size={18} className="mt-0.5 shrink-0" />
                      <p className="text-sm leading-6">
                        Sau khi xác nhận, SLA hiện tại sẽ chuyển sang trạng thái hủy.
                      </p>
                    </div>
                  ) : null}
                </div>

                <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <button
                    type="button"
                    onClick={closeSlaModal}
                    disabled={Boolean(slaActionLoading)}
                    className="btn admin-secondary-action rounded-2xl"
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    disabled={Boolean(slaActionLoading)}
                    className={slaModalConfig.confirmClass}
                  >
                    {slaActionLoading ? <span className="loading loading-spinner loading-sm" /> : null}
                    {slaModalConfig.confirmLabel}
                  </button>
                </footer>
              </form>
            </section>
          </div>,
          document.body
        )
        : null}

      {isAwaitingApproval && confirmingAction ? (
        <dialog open className="modal modal-open bg-transparent" aria-labelledby="approval-dialog-title">
          <form method="dialog" className="modal-box admin-panel max-w-lg p-6" onSubmit={(event) => event.preventDefault()}>
            <header className="flex items-start gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${confirmingAction === 'approve' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`} aria-hidden="true">
                {confirmingAction === 'approve' ? <Lucide.BadgeCheck size={20} /> : <Lucide.RotateCcw size={20} />}
              </span>
              <span>
                <h2 id="approval-dialog-title" className="text-lg font-semibold text-slate-950 dark:text-white">
                  {confirmingAction === 'approve' ? 'Xác nhận duyệt kết quả' : 'Yêu cầu nhân viên làm lại'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {confirmingAction === 'approve'
                    ? 'Sau khi duyệt, người dân có thể đánh giá kết quả và đóng phản ánh.'
                    : 'Lý do sẽ được gửi lại để nhân viên bổ sung hoặc chỉnh sửa kết quả xử lý.'}
                </p>
              </span>
            </header>

            {confirmingAction === 'rework' ? (
              <fieldset className="mt-5">
                <legend className="sr-only">Lý do yêu cầu làm lại</legend>
                <label htmlFor="rework-reason" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Lý do làm lại <span className="text-rose-600">*</span></label>
                <textarea
                  id="rework-reason"
                  rows="4"
                  value={reworkReason}
                  onChange={(event) => setReworkReason(event.target.value)}
                  placeholder="Ví dụ: thiếu ảnh hoàn thành, mô tả kết quả chưa rõ..."
                  className="textarea textarea-bordered mt-2 w-full rounded-2xl bg-white text-sm dark:bg-slate-900"
                  required
                />
              </fieldset>
            ) : null}

            <footer className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmingAction(null)} className="btn admin-secondary-action rounded-2xl" disabled={submitting}>Hủy</button>
              <button type="button" onClick={() => handleDecision(confirmingAction)} className="btn admin-primary-action rounded-2xl" disabled={submitting}>
                {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
                {confirmingAction === 'approve' ? 'Xác nhận duyệt' : 'Gửi yêu cầu làm lại'}
              </button>
            </footer>
          </form>
          <button type="button" className="modal-backdrop cursor-default" aria-label="Đóng hộp thoại" onClick={() => setConfirmingAction(null)} />
        </dialog>
      ) : null}
    </article>
  );
};