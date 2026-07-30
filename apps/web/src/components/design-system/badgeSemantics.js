const STATUS_INTENTS = {
  Submitted: 'info',
  'AI Reviewed': 'info',
  Verified: 'info',
  Assigned: 'warning',
  InProgress: 'warning',
  Resolved: 'success',
  SubmittedForApproval: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  NeedRework: 'warning',
  Closed: 'success',
  Cancelled: 'neutral',
};

const PRIORITY_INTENTS = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
};

const SEVERITY_INTENTS = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
};

const ACTION_INTENTS = {
  delete: 'danger',
  remove: 'danger',
  create: 'success',
  add: 'success',
  update: 'warning',
  change: 'warning',
  edit: 'warning',
  login: 'info',
  auth: 'info',
};

const normalizeValue = (value) => `${value ?? ''}`.trim();

export function getBadgeIntent(value, kind = 'status') {
  const normalizedValue = normalizeValue(value);
  const loweredValue = normalizedValue.toLowerCase();

  if (kind === 'priority') {
    return PRIORITY_INTENTS[normalizedValue] || 'neutral';
  }

  if (kind === 'severity') {
    return SEVERITY_INTENTS[normalizedValue] || 'neutral';
  }

  if (kind === 'action') {
    for (const [token, intent] of Object.entries(ACTION_INTENTS)) {
      if (loweredValue.includes(token)) return intent;
    }
    return 'neutral';
  }

  return STATUS_INTENTS[normalizedValue] || 'neutral';
}
