import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { axiosClient, slaApi } from '@urbanmind/shared-api';
import {
  formatSlaRemaining,
  normalizeFeedbackSlaStatus,
  normalizeReportSlaTargets,
} from '../src/features/staff/staff-sla-models.ts';

const resolver = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './staff-sla-models' && context.parentURL?.includes('/features/staff/')) {
    return nextResolve(specifier + '.ts', context);
  }
  return nextResolve(specifier, context);
} });
const { staffSlaApi, staffSlaKeys } = await import('../src/features/staff/staff-sla-api.ts');
resolver.deregister();

test('SLA targets remain feedback-scoped and omit only explicit inactive links', () => {
  assert.deepEqual(normalizeReportSlaTargets([
    { id: 'feedback-1', title: 'Cây đổ', status: 'Verified', linkStatus: 'Confirmed' },
    { id: 'feedback-1', title: 'Duplicate entry' },
    { id: 'feedback-2', title: '', linkStatus: '' },
    { id: 'feedback-3', title: 'Đã gỡ', linkStatus: 'Unlinked' },
    { id: '', title: 'Missing identity' },
  ]), [
    { feedbackId: 'feedback-1', title: 'Cây đổ', feedbackStatus: 'Verified', linkStatus: 'Confirmed' },
    { feedbackId: 'feedback-2', title: 'Report chưa có tiêu đề', feedbackStatus: '', linkStatus: '' },
  ]);
});

test('normalizes backend SLA status without deriving an Incident SLA or client-side countdown', () => {
  const status = normalizeFeedbackSlaStatus({
    feedbackId: 'feedback-1', feedbackSlaId: 15, status: 'Running', serverTime: '2026-09-01T08:00:00Z',
    responseStatus: 'Met', responseDueAt: '2026-09-01T06:00:00Z', responseRemainingMinutes: 0,
    responseRemainingSeconds: 0, responseProgressPercent: 100, isResponseWarning: false, isResponseBreached: false,
    resolutionStatus: 'Warning', resolutionDueAt: '2026-09-01T10:00:00Z', resolutionRemainingMinutes: 120,
    resolutionProgressPercent: 80.4, isResolutionWarning: true, isResolutionBreached: false,
  }, 'feedback-1');
  assert.equal(status.feedbackId, 'feedback-1');
  assert.equal(status.response.remainingSeconds, 0, 'exact seconds win over the minutes fallback');
  assert.equal(status.resolution.remainingSeconds, 7200);
  assert.equal(status.resolution.progressPercent, 80.4);
  assert.equal(status.resolution.warning, true);
  assert.equal(formatSlaRemaining(-3660, false), 'Quá hạn 1 giờ 1 phút');
  assert.equal(formatSlaRemaining(30, false), 'Còn dưới 1 phút');
  assert.throws(() => normalizeFeedbackSlaStatus({ feedbackId: 'another-feedback', status: 'Running' }, 'feedback-1'), /không thuộc Report/);
  assert.throws(() => normalizeFeedbackSlaStatus({}, 'feedback-1'), /không hợp lệ/);
});

test('SLA API forwards React Query cancellation and preserves authenticated shared client behavior', async () => {
  const signal = new AbortController().signal;
  const get = mock.method(axiosClient, 'get', async () => ({
    feedbackId: 'feedback%2F1', status: 'Running', resolutionRemainingSeconds: 90,
  }));
  try {
    const result = await slaApi.getFeedbackSlaStatus('feedback%2F1', { signal });
    assert.equal(result.feedbackId, 'feedback%2F1');
    assert.deepEqual(get.mock.calls[0].arguments, ['/api/slas/feedback/feedback%2F1/status', { signal }]);
  } finally { get.mock.restore(); }
});

test('mobile SLA queries are scoped by Staff, Incident and Report', async () => {
  const signal = new AbortController().signal;
  const getStatus = mock.method(slaApi, 'getFeedbackSlaStatus', async () => ({
    feedbackId: 'feedback-1', status: 'Running', responseRemainingSeconds: 60,
  }));
  try {
    const result = await staffSlaApi.reportStatus(' feedback-1 ', signal);
    assert.equal(result.feedbackId, 'feedback-1');
    assert.deepEqual(getStatus.mock.calls[0].arguments, ['feedback-1', { signal }]);
    assert.notDeepEqual(staffSlaKeys.report('staff-1', 'incident-1', 'feedback-1'), staffSlaKeys.report('staff-2', 'incident-1', 'feedback-1'));
    assert.notDeepEqual(staffSlaKeys.report('staff-1', 'incident-1', 'feedback-1'), staffSlaKeys.report('staff-1', 'incident-2', 'feedback-1'));
    assert.notDeepEqual(staffSlaKeys.report('staff-1', 'incident-1', 'feedback-1'), staffSlaKeys.report('staff-1', 'incident-1', 'feedback-2'));
  } finally { getStatus.mock.restore(); }
});

test('only a real 404 becomes an empty SLA; other failures remain visible', async () => {
  const getStatus = mock.method(slaApi, 'getFeedbackSlaStatus', async () => {
    const error = new Error('Missing');
    error.status = 404;
    throw error;
  });
  try {
    assert.equal(await staffSlaApi.reportStatus('feedback-1'), null);
    getStatus.mock.mockImplementation(async () => {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    });
    await assert.rejects(staffSlaApi.reportStatus('feedback-1'), /Forbidden/);
    await assert.rejects(staffSlaApi.reportStatus('   '), /Thiếu mã Report/);
  } finally { getStatus.mock.restore(); }
});
