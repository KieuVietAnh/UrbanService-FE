import { managementTypes } from './managementTypes.js';

export const TICKET_STATUS_STEPS = [
  { title: 'Đã gửi', sub: managementTypes.feedbackStatus.SUBMITTED },
  { title: 'Kiểm duyệt', sub: managementTypes.feedbackStatus.AI_REVIEWED },
  { title: 'Điều phối', sub: managementTypes.feedbackStatus.ASSIGNED },
  { title: 'Đang xử lý', sub: managementTypes.feedbackStatus.IN_PROGRESS },
  { title: 'Đã xử lý', sub: managementTypes.feedbackStatus.RESOLVED },
  { title: 'Đã đóng', sub: managementTypes.feedbackStatus.CLOSED }
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
      return 0;
    case managementTypes.feedbackStatus.AI_REVIEWED:
      return 1;
    case managementTypes.feedbackStatus.ASSIGNED:
      return 2;
    case managementTypes.feedbackStatus.IN_PROGRESS:
      return 3;
    case managementTypes.feedbackStatus.RESOLVED:
      return 4;
    case managementTypes.feedbackStatus.CLOSED:
      return 5;
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
  Closed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  default: 'bg-slate-100 text-slate-600 border-slate-300'
};
