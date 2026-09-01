export type StaffSlaReportInput = {
  id: string;
  title?: string;
  status?: string;
  linkStatus?: string;
};

export type StaffSlaReportTarget = {
  feedbackId: string;
  title: string;
  feedbackStatus: string;
  linkStatus: string;
};

export type StaffSlaMetric = {
  status: string;
  dueAt: string;
  remainingSeconds: number | null;
  progressPercent: number | null;
  warning: boolean;
  breached: boolean;
};

export type StaffFeedbackSlaStatus = {
  feedbackId: string;
  feedbackSlaId: number | null;
  status: string;
  serverTime: string;
  startedAt: string;
  response: StaffSlaMetric;
  resolution: StaffSlaMetric;
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};

const asText = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

const normalizedKey = (value: unknown) =>
  asText(value).replace(/[\s_-]/g, '').toLowerCase();

const finiteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const remainingSeconds = (seconds: unknown, minutes: unknown) => {
  const direct = finiteNumber(seconds);
  if (direct !== null) return Math.trunc(direct);
  const fallback = finiteNumber(minutes);
  return fallback === null ? null : Math.trunc(fallback * 60);
};

const progressPercent = (value: unknown) => {
  const number = finiteNumber(value);
  return number === null ? null : Math.min(100, Math.max(0, number));
};

const inactiveLinkStatuses = new Set(['unlinked', 'inactive', 'removed', 'rejected']);

/**
 * IncidentDetailDto.reports is a list of feedback links. Keep each feedback as
 * its own SLA target and omit only links the backend explicitly marks inactive.
 */
export function normalizeReportSlaTargets(
  reports: readonly StaffSlaReportInput[],
): StaffSlaReportTarget[] {
  const seen = new Set<string>();
  const targets: StaffSlaReportTarget[] = [];

  for (const report of reports) {
    const feedbackId = asText(report.id);
    const identity = feedbackId.toLowerCase();
    const linkStatus = asText(report.linkStatus);
    if (!feedbackId || seen.has(identity) || inactiveLinkStatuses.has(normalizedKey(linkStatus))) {
      continue;
    }

    seen.add(identity);
    targets.push({
      feedbackId,
      title: asText(report.title) || 'Report chưa có tiêu đề',
      feedbackStatus: asText(report.status),
      linkStatus,
    });
  }

  return targets;
}

/** Normalize the exact SlaStatusDto fields returned by GET .../status. */
export function normalizeFeedbackSlaStatus(
  value: unknown,
  expectedFeedbackId: string,
): StaffFeedbackSlaStatus | null {
  if (value === null || value === undefined || value === '') return null;
  const wrapped = asRecord(value);
  const sourceValue = wrapped.data ?? wrapped.result ?? value;
  if (sourceValue === null || sourceValue === undefined || sourceValue === '') return null;
  const source = asRecord(sourceValue);
  if (Object.keys(source).length === 0) {
    throw new Error('Máy chủ trả về trạng thái SLA không hợp lệ.');
  }

  const feedbackId = asText(source.feedbackId) || expectedFeedbackId.trim();
  if (!feedbackId || feedbackId.toLowerCase() !== expectedFeedbackId.trim().toLowerCase()) {
    throw new Error('Trạng thái SLA không thuộc Report đang xem.');
  }

  const feedbackSlaId = finiteNumber(source.feedbackSlaId);
  return {
    feedbackId,
    feedbackSlaId: feedbackSlaId === null ? null : Math.trunc(feedbackSlaId),
    status: asText(source.status),
    serverTime: asText(source.serverTime),
    startedAt: asText(source.startedAt),
    response: {
      status: asText(source.responseStatus),
      dueAt: asText(source.responseDueAt),
      remainingSeconds: remainingSeconds(
        source.responseRemainingSeconds,
        source.responseRemainingMinutes,
      ),
      progressPercent: progressPercent(source.responseProgressPercent),
      warning: source.isResponseWarning === true,
      breached: source.isResponseBreached === true,
    },
    resolution: {
      status: asText(source.resolutionStatus),
      dueAt: asText(source.resolutionDueAt),
      remainingSeconds: remainingSeconds(
        source.resolutionRemainingSeconds,
        source.resolutionRemainingMinutes,
      ),
      progressPercent: progressPercent(source.resolutionProgressPercent),
      warning: source.isResolutionWarning === true,
      breached: source.isResolutionBreached === true,
    },
  };
}

const durationParts = (seconds: number) => {
  const totalMinutes = Math.floor(Math.abs(seconds) / 60);
  if (totalMinutes < 1) return 'dưới 1 phút';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days} ngày` : '',
    hours ? `${hours} giờ` : '',
    minutes ? `${minutes} phút` : '',
  ].filter(Boolean).join(' ');
};

/** Uses backend-calculated remaining seconds; it never derives SLA from Incident dueDate. */
export function formatSlaRemaining(seconds: number | null, breached: boolean) {
  if (seconds === null) return 'Chưa có dữ liệu thời gian';
  const overdue = breached || seconds < 0;
  return `${overdue ? 'Quá hạn' : 'Còn'} ${durationParts(seconds)}`;
}

export function slaStatusLabel(value: string) {
  const labels: Record<string, string> = {
    active: 'Đang theo dõi',
    running: 'Đang theo dõi',
    pending: 'Chờ xử lý',
    paused: 'Tạm dừng',
    completed: 'Hoàn thành',
    resolved: 'Đã hoàn thành',
    met: 'Đúng hạn',
    warning: 'Sắp đến hạn',
    breached: 'Đã vi phạm',
    violated: 'Đã vi phạm',
    cancelled: 'Đã hủy',
  };
  return labels[normalizedKey(value)] || value || 'Chưa có trạng thái';
}

export function isSlaNotFoundError(error: unknown) {
  const source = asRecord(error);
  return Number(asRecord(source.response).status ?? source.status) === 404;
}
