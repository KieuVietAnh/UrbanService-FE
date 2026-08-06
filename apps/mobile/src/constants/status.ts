// Ticket status constants — derived from web's managementTypes
export const TICKET_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  AWAITING_REVIEW: 'AWAITING_REVIEW',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  NEED_REWORK: 'NEED_REWORK',
  VERIFIED: 'VERIFIED',
} as const;

export type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS];

export const STATUS_CONFIG: Record<string, {
  label: string;
  twBg: string;
  twText: string;
  twDot: string;
}> = {
  [TICKET_STATUS.PENDING]: {
    label: 'Chờ xử lý',
    twBg: 'bg-amber-light',
    twText: 'text-amber-dark',
    twDot: 'bg-amber',
  },
  [TICKET_STATUS.PROCESSING]: {
    label: 'Đang xử lý',
    twBg: 'bg-primary-soft',
    twText: 'text-primary',
    twDot: 'bg-primary',
  },
  [TICKET_STATUS.AWAITING_REVIEW]: {
    label: 'Đang xem xét',
    twBg: 'bg-purple-light',
    twText: 'text-purple-dark',
    twDot: 'bg-purple',
  },
  [TICKET_STATUS.VERIFIED]: {
    label: 'Đã xác nhận',
    twBg: 'bg-emerald-light',
    twText: 'text-emerald-dark',
    twDot: 'bg-emerald',
  },
  [TICKET_STATUS.RESOLVED]: {
    label: 'Đã xử lý',
    twBg: 'bg-emerald-light',
    twText: 'text-emerald-dark',
    twDot: 'bg-emerald',
  },
  [TICKET_STATUS.CLOSED]: {
    label: 'Đã đóng',
    twBg: 'bg-border-light',
    twText: 'text-text-muted',
    twDot: 'bg-text-light',
  },
  [TICKET_STATUS.REJECTED]: {
    label: 'Từ chối',
    twBg: 'bg-red-light',
    twText: 'text-red-dark',
    twDot: 'bg-red',
  },
  [TICKET_STATUS.NEED_REWORK]: {
    label: 'Yêu cầu làm lại',
    twBg: 'bg-red-light',
    twText: 'text-red-dark',
    twDot: 'bg-red',
  },
};

export const FEEDBACK_CATEGORIES = [
  { id: 'lighting', label: 'Chiếu sáng công cộng', subtitle: 'Đèn đường tắt, hư hỏng...', icon: 'sun' },
  { id: 'sanitation', label: 'Vệ sinh môi trường', subtitle: 'Rác thải, ô nhiễm...', icon: 'trash-2' },
  { id: 'drainage', label: 'Thoát nước', subtitle: 'Ngập úng, nắp cống...', icon: 'droplet' },
  { id: 'road', label: 'Đường sá hư hỏng', subtitle: 'Ổ gà, sụt lún mặt đường...', icon: 'tool' },
  { id: 'security', label: 'An ninh trật tự', subtitle: 'Tụ tập, tiếng ồn...', icon: 'shield' },
  { id: 'other', label: 'Khác', subtitle: 'Các vấn đề hạ tầng khác...', icon: 'more-horizontal' },
] as const;
