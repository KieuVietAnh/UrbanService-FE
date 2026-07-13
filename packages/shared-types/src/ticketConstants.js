import { managementTypes } from './managementTypes.js';

export const TICKET_STATUS_STEPS = [
  { title: 'Đã gửi', sub: managementTypes.feedbackStatus.SUBMITTED },
  { title: 'Đã xác minh', sub: managementTypes.feedbackStatus.VERIFIED },
  { title: 'Đã phân công', sub: managementTypes.feedbackStatus.ASSIGNED },
  { title: 'Đang xử lý', sub: managementTypes.feedbackStatus.IN_PROGRESS },
  { title: 'Chờ duyệt', sub: managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL },
  { title: 'Đã duyệt', sub: managementTypes.feedbackStatus.APPROVED },
  { title: 'Đã đóng', sub: managementTypes.feedbackStatus.CLOSED },
];

export const getStatusLabel = (status, fallback = 'Không xác định') => {
  const labels = {
    [managementTypes.feedbackStatus.SUBMITTED]: 'Đã gửi',
    [managementTypes.feedbackStatus.AI_REVIEWED]: 'Đang xem xét',
    [managementTypes.feedbackStatus.VERIFIED]: 'Đã xác minh',
    [managementTypes.feedbackStatus.ASSIGNED]: 'Đã phân công',
    [managementTypes.feedbackStatus.IN_PROGRESS]: 'Đang xử lý',
    [managementTypes.feedbackStatus.RESOLVED]: 'Đã xử lý',
    [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 'Chờ nghiệm thu',
    [managementTypes.feedbackStatus.APPROVED]: 'Đã duyệt',
    [managementTypes.feedbackStatus.NEED_REWORK]: 'Cần làm lại',
    [managementTypes.feedbackStatus.REJECTED]: 'Bị từ chối',
    [managementTypes.feedbackStatus.CLOSED]: 'Đã đóng',
  };

  return labels[status] || fallback;
};

export const getStatusStep = (status) => {
  switch (status) {
    case managementTypes.feedbackStatus.SUBMITTED:
    case managementTypes.feedbackStatus.AI_REVIEWED:
      return 0;
    case managementTypes.feedbackStatus.VERIFIED:
      return 1;
    case managementTypes.feedbackStatus.ASSIGNED:
      return 2;
    case managementTypes.feedbackStatus.IN_PROGRESS:
    case managementTypes.feedbackStatus.NEED_REWORK:
      return 3;
    case managementTypes.feedbackStatus.RESOLVED:
    case managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL:
      return 4;
    case managementTypes.feedbackStatus.APPROVED:
      return 5;
    case managementTypes.feedbackStatus.CLOSED:
      return 6;
    default:
      return 0;
  }
};

export const PRIORITY_BADGE_CLASSES = {
  Critical: 'bg-red-50 text-red-600 border-red-200',
  High: 'bg-amber-50 text-amber-600 border-amber-200',
  Medium: 'bg-blue-50 text-blue-600 border-blue-200',
  Low: 'bg-slate-100 text-slate-600 border-slate-300'
};

export const STATUS_BADGE_CLASSES = {
  Resolved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  SubmittedForApproval: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NeedRework: 'bg-orange-50 text-orange-700 border-orange-200',
  Closed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  default: 'bg-slate-100 text-slate-600 border-slate-300'
};
