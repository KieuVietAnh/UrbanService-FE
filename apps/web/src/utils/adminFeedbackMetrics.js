import { managementTypes } from '@urbanmind/shared-types';

const normalizeStatus = (value) => String(value ?? '')
  .replace(/[-_\s]/g, '')
  .toLowerCase();

export const ADMIN_FEEDBACK_METRIC_KEYS = ['total', 'pending', 'inProgress', 'completed'];

const STATUS_GROUPS = {
  pending: new Set([
    managementTypes.feedbackStatus.SUBMITTED,
    managementTypes.feedbackStatus.AI_REVIEWED,
    'AiReviewed',
    managementTypes.feedbackStatus.VERIFIED,
  ].map(normalizeStatus)),
  inProgress: new Set([
    managementTypes.feedbackStatus.ASSIGNED,
    managementTypes.feedbackStatus.IN_PROGRESS,
    managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL,
    managementTypes.feedbackStatus.NEED_REWORK,
  ].map(normalizeStatus)),
  completed: new Set([
    managementTypes.feedbackStatus.RESOLVED,
    managementTypes.feedbackStatus.APPROVED,
    managementTypes.feedbackStatus.REJECTED,
    managementTypes.feedbackStatus.CLOSED,
    managementTypes.feedbackStatus.CANCELLED,
  ].map(normalizeStatus)),
};

export const ADMIN_FEEDBACK_METRICS = [
  {
    key: 'total',
    label: 'Tổng phản ánh',
    helper: 'Toàn bộ phản ánh trong hệ thống',
    icon: 'Inbox',
    tone: 'blue',
  },
  {
    key: 'pending',
    label: 'Chờ xử lý',
    helper: 'Mới gửi, AI đã duyệt hoặc đã xác minh',
    icon: 'Clock3',
    tone: 'amber',
  },
  {
    key: 'inProgress',
    label: 'Đang xử lý',
    helper: 'Đã phân công hoặc đang thực hiện',
    icon: 'Wrench',
    tone: 'slate',
  },
  {
    key: 'completed',
    label: 'Hoàn tất',
    helper: 'Đã xử lý, duyệt, đóng hoặc kết thúc',
    icon: 'CheckCircle2',
    tone: 'emerald',
  },
];

export const calculateAdminFeedbackSummary = (feedbacks = [], explicitTotal) => {
  const items = Array.isArray(feedbacks) ? feedbacks : [];
  const summary = {
    total: Number.isFinite(Number(explicitTotal)) ? Number(explicitTotal) : items.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
  };

  items.forEach((feedback) => {
    const normalized = normalizeStatus(feedback?.status);
    if (STATUS_GROUPS.pending.has(normalized)) summary.pending += 1;
    else if (STATUS_GROUPS.inProgress.has(normalized)) summary.inProgress += 1;
    else if (STATUS_GROUPS.completed.has(normalized)) summary.completed += 1;
  });

  return summary;
};


export const normalizeAdminFeedbackMetric = (value) => (
  ADMIN_FEEDBACK_METRIC_KEYS.includes(String(value || ''))
    ? String(value)
    : 'total'
);

export const feedbackMatchesAdminMetric = (feedback, metricKey = 'total') => {
  const normalizedMetric = normalizeAdminFeedbackMetric(metricKey);
  if (normalizedMetric === 'total') return true;
  return STATUS_GROUPS[normalizedMetric]?.has(normalizeStatus(feedback?.status)) || false;
};

export const filterAdminFeedbacksByMetric = (feedbacks = [], metricKey = 'total') => (
  (Array.isArray(feedbacks) ? feedbacks : []).filter((feedback) => (
    feedbackMatchesAdminMetric(feedback, metricKey)
  ))
);
