const SERVICE_USER_TICKET_ROUTE = '/tickets';

const cleanPath = (value) => {
  if (typeof value !== 'string') return '';

  try {
    const url = new URL(value, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value.trim();
  }
};

const readFeedbackIdFromTarget = (targetUrl) => {
  const path = cleanPath(targetUrl);
  if (!path) return '';

  const patterns = [
    /\/(?:tickets|feedbacks)\/([^/?#]+)(?:\/|$)/i,
    /\/(?:ticket|feedback)\/([^/?#]+)(?:\/|$)/i,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match?.[1] && !['create', 'archive', 'assign'].includes(match[1].toLowerCase())) {
      return decodeURIComponent(match[1]);
    }
  }

  return '';
};

export const getNotificationFeedbackId = (notification) => (
  notification?.feedbackId
  || notification?.ticketId
  || notification?.relatedFeedbackId
  || notification?.entityId
  || notification?.data?.feedbackId
  || notification?.data?.ticketId
  || notification?.metadata?.feedbackId
  || readFeedbackIdFromTarget(notification?.targetUrl)
  || ''
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

export const getServiceUserNotificationRoute = (notification) => {
  const feedbackId = getNotificationFeedbackId(notification);

  if (feedbackId) {
    const encodedId = encodeURIComponent(feedbackId);
    const kind = getNotificationKind(notification);

    if (kind === 'rework') return `${SERVICE_USER_TICKET_ROUTE}/${encodedId}/rework`;
    if (kind === 'resolution') return `${SERVICE_USER_TICKET_ROUTE}/${encodedId}/result`;
    return `${SERVICE_USER_TICKET_ROUTE}/${encodedId}`;
  }

  const targetPath = cleanPath(notification?.targetUrl);
  if (targetPath.startsWith('/tickets/')) return targetPath;

  return SERVICE_USER_TICKET_ROUTE;
};
