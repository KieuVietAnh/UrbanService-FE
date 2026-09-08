import { APP_ROLES, getInternalRole } from '@urbanmind/shared-types';

const SERVICE_USER_TICKET_ROUTE = '/tickets';
export const NOTIFICATION_FALLBACK_ROUTE = '/notifications';

const ENTITY_TYPES = Object.freeze({
  INCIDENT: new Set(['incident']),
  FEEDBACK: new Set(['feedback', 'report', 'ticket']),
  PROVIDER_REPORT: new Set(['providerreport']),
});
const STAFF_INCIDENT_TABS = new Set(['reports', 'timeline', 'processing', 'resolution']);

const normalizeEntityType = (value) => String(value ?? '')
  .trim()
  .replace(/[^a-z0-9]/gi, '')
  .toLowerCase();

const normalizeIdentifier = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  try {
    const decoded = decodeURIComponent(raw);
    return /^[a-z0-9_-]+$/i.test(decoded) ? decoded : '';
  } catch {
    return '';
  }
};

const readNestedValue = (notification, fieldNames) => {
  const sources = [notification, notification?.data, notification?.metadata, notification?.payload];

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const fieldName of fieldNames) {
      const value = normalizeIdentifier(source[fieldName]);
      if (value) return value;
    }
  }

  return '';
};

const parseInternalTarget = (value) => {
  if (typeof value !== 'string') return null;
  const target = value.trim();
  if (!target.startsWith('/') || target.startsWith('//')) return null;

  try {
    return new URL(target, 'https://urbanmind.local');
  } catch {
    return null;
  }
};

const readRouteId = (targetUrl, patterns) => {
  const target = parseInternalTarget(targetUrl);
  if (!target) return '';

  for (const pattern of patterns) {
    const match = target.pathname.match(pattern);
    const identifier = normalizeIdentifier(match?.[1]);
    if (identifier) return identifier;
  }

  return '';
};

const readEntityTargetId = (notification, acceptedTypes) => {
  const pairs = [
    [notification?.targetType, notification?.targetId],
    [notification?.entityType, notification?.entityId],
    [notification?.relatedType, notification?.relatedId],
    [notification?.data?.targetType, notification?.data?.targetId],
    [notification?.data?.entityType, notification?.data?.entityId],
    [notification?.data?.relatedType, notification?.data?.relatedId],
    [notification?.metadata?.targetType, notification?.metadata?.targetId],
    [notification?.metadata?.entityType, notification?.metadata?.entityId],
    [notification?.metadata?.relatedType, notification?.metadata?.relatedId],
    [notification?.payload?.targetType, notification?.payload?.targetId],
    [notification?.payload?.entityType, notification?.payload?.entityId],
    [notification?.payload?.relatedType, notification?.payload?.relatedId],
  ];

  for (const [type, value] of pairs) {
    if (!acceptedTypes.has(normalizeEntityType(type))) continue;
    const identifier = normalizeIdentifier(value);
    if (identifier) return identifier;
  }

  return '';
};

export const getNotificationIncidentId = (notification) => (
  readNestedValue(notification, ['incidentId'])
  || readEntityTargetId(notification, ENTITY_TYPES.INCIDENT)
  || readRouteId(notification?.targetUrl, [
    /^\/staff\/incidents\/([^/]+)\/?$/i,
  ])
);

export const getNotificationFeedbackId = (notification) => (
  readNestedValue(notification, ['feedbackId', 'ticketId', 'reportId', 'relatedFeedbackId'])
  || readEntityTargetId(notification, ENTITY_TYPES.FEEDBACK)
  || readRouteId(notification?.targetUrl, [
    /^\/tickets\/([^/]+)(?:\/(?:rework|result))?\/?$/i,
    /^\/staff\/feedbacks\/([^/]+)\/?$/i,
  ])
);

export const getNotificationProviderReportId = (notification) => (
  readNestedValue(notification, ['providerReportId'])
  || readEntityTargetId(notification, ENTITY_TYPES.PROVIDER_REPORT)
  || readRouteId(notification?.targetUrl, [/^\/staff\/provider-reports\/([^/]+)\/?$/i])
);

const getNotificationKind = (notification) => {
  const text = `${notification?.title || ''} ${notification?.message || ''} ${notification?.type || ''}`.toLowerCase();

  if (text.includes('rework') || text.includes('làm lại') || text.includes('bổ sung') || text.includes('request info') || text.includes('yêu cầu thêm')) {
    return 'rework';
  }

  if (text.includes('resolution') || text.includes('result') || text.includes('resolved') || text.includes('hoàn tất') || text.includes('approved') || text.includes('phê duyệt') || text.includes('kết quả')) {
    return 'resolution';
  }

  return 'detail';
};

const buildStaffIncidentRoute = (notification, incidentId) => {
  const encodedId = encodeURIComponent(incidentId);
  const route = `/staff/incidents/${encodedId}`;
  const target = parseInternalTarget(notification?.targetUrl);
  const targetIncidentId = readRouteId(notification?.targetUrl, [/^\/staff\/incidents\/([^/]+)\/?$/i]);
  const tab = target?.searchParams.get('tab');

  if (targetIncidentId === incidentId && STAFF_INCIDENT_TABS.has(tab)) {
    return `${route}?tab=${encodeURIComponent(tab)}`;
  }

  return route;
};

export const getServiceUserNotificationRoute = (notification) => {
  const feedbackId = getNotificationFeedbackId(notification);

  if (feedbackId) {
    const encodedId = encodeURIComponent(feedbackId);
    const kind = getNotificationKind(notification);

    if (kind === 'rework') return `${SERVICE_USER_TICKET_ROUTE}/${encodedId}/rework`;
    if (kind === 'resolution') return `${SERVICE_USER_TICKET_ROUTE}/${encodedId}/result`;
    return `${SERVICE_USER_TICKET_ROUTE}/${encodedId}`;
  }

  const target = parseInternalTarget(notification?.targetUrl);
  if (target?.pathname.startsWith('/tickets/')) {
    return `${target.pathname}${target.search}${target.hash}`;
  }

  return SERVICE_USER_TICKET_ROUTE;
};

export const getNotificationDestinationEntity = (notification, currentRole) => {
  const role = getInternalRole(currentRole);
  if (role !== APP_ROLES.SYSTEM_STAFF) return 'feedback';
  if (getNotificationIncidentId(notification)) return 'incident';
  if (getNotificationFeedbackId(notification)) return 'feedback';
  if (getNotificationProviderReportId(notification)) return 'fallback';
  return 'fallback';
};

export const resolveNotificationDestination = (notification, currentRole) => {
  const role = getInternalRole(currentRole);

  if (role !== APP_ROLES.SYSTEM_STAFF) {
    return getServiceUserNotificationRoute(notification);
  }

  const incidentId = getNotificationIncidentId(notification);
  if (incidentId) return buildStaffIncidentRoute(notification, incidentId);

  const feedbackId = getNotificationFeedbackId(notification);
  if (feedbackId) return `/staff/feedbacks/${encodeURIComponent(feedbackId)}`;

  if (import.meta.env?.DEV) {
    console.warn('Không thể xác định trang đích của thông báo SYSTEMSTAFF.', {
      notificationId: notification?.notificationId,
      type: notification?.type,
      targetType: notification?.targetType,
    });
  }

  return NOTIFICATION_FALLBACK_ROUTE;
};
