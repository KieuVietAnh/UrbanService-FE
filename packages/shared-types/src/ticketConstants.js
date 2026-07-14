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
    [managementTypes.feedbackStatus.CANCELLED]: 'Đã hủy',
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
  [managementTypes.feedbackStatus.SUBMITTED]: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/30',
  [managementTypes.feedbackStatus.AI_REVIEWED]: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-400/30',
  [managementTypes.feedbackStatus.VERIFIED]: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-400/30',
  [managementTypes.feedbackStatus.ASSIGNED]: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-400/30',
  [managementTypes.feedbackStatus.IN_PROGRESS]: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/30',
  [managementTypes.feedbackStatus.RESOLVED]: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-400/30',
  [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-400/30',
  [managementTypes.feedbackStatus.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/30',
  [managementTypes.feedbackStatus.NEED_REWORK]: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-400/30',
  [managementTypes.feedbackStatus.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-400/30',
  [managementTypes.feedbackStatus.CLOSED]: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-400/30',
  [managementTypes.feedbackStatus.CANCELLED]: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-400/30',
  default: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-400/30'
};
