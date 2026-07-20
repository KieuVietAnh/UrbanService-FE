import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAiReviewedPayload,
  normalizeStaffFeedbackUpdatePayload,
  normalizeFeedbackListParams,
  normalizeCommentPayload,
  normalizeProviderReportStatus,
  normalizeProviderContactLogPayload,
  canTransitionProviderReportStatus,
  resolveProviderReportById,
} from './managementFeedbackApi.js';

test('normalizeAiReviewedPayload maps ai-reviewed payloads to queue-ready items', () => {
  const normalized = normalizeAiReviewedPayload({
    items: [
      {
        feedback: {
          feedbackId: 'fb-1',
          title: 'Hố ga',
          description: 'Nước tràn ra đường',
          categoryId: 3,
          priority: 'High',
          reporterName: 'An',
          locationText: 'Quận 1',
        },
        analysisResult: {
          confidenceScore: 0.94,
          sentiment: 'Negative',
          summary: 'Sự cố hạ tầng đường',
          detectedCategoryName: 'Hạ tầng',
        },
      },
    ],
  });

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].feedbackId, 'fb-1');
  assert.equal(normalized[0].summary, 'Sự cố hạ tầng đường');
  assert.equal(normalized[0].confidenceScore, 0.94);
  assert.equal(normalized[0].detectedCategoryName, 'Hạ tầng');
});

test('normalizeStaffFeedbackUpdatePayload converts edit values to backend-safe types', () => {
  const normalized = normalizeStaffFeedbackUpdatePayload({
    categoryId: '12',
    title: '  ',
    description: 'A',
    locationText: '',
    latitude: '10.5',
    longitude: '',
    priority: 'High',
    dueDate: '',
    status: 'InProgress',
    statusNote: ' ',
  });

  assert.deepEqual(normalized, {
    categoryId: 12,
    description: 'A',
    latitude: 10.5,
    priority: 'High',
    status: 'InProgress',
  });
});

test('normalizeFeedbackListParams maps UI pagination to swagger query parameters', () => {
  const normalized = normalizeFeedbackListParams({
    pageIndex: 2,
    pageSize: 20,
    status: 'SubmittedForApproval',
    search: 'water',
    categoryId: 4,
  });

  assert.deepEqual(normalized, {
    PageNumber: 3,
    PageSize: 20,
    Status: 'SubmittedForApproval',
    Search: 'water',
    CategoryId: 4,
  });
});

test('normalizeCommentPayload keeps only the swagger-accepted content field', () => {
  const normalized = normalizeCommentPayload({
    userId: 'u-1',
    userName: 'Ada',
    userRole: 'service-user',
    content: 'hello',
    message: 'ignored',
    rating: 5,
  });

  assert.deepEqual(normalized, { content: 'hello' });
});

test('provider report status helpers enforce the Reported → Contacted → Accepted → InProgress → Done workflow', () => {
  assert.equal(normalizeProviderReportStatus('reported'), 'Reported');
  assert.equal(normalizeProviderReportStatus('contacted'), 'Contacted');
  assert.equal(normalizeProviderReportStatus('accepted'), 'Accepted');
  assert.equal(normalizeProviderReportStatus('in_progress'), 'InProgress');
  assert.equal(normalizeProviderReportStatus('done'), 'Done');
  assert.equal(normalizeProviderReportStatus('completed'), 'Done');
  assert.equal(normalizeProviderReportStatus('failed'), 'Failed');
  assert.equal(normalizeProviderReportStatus('cancelled'), 'Cancelled');

  assert.equal(canTransitionProviderReportStatus('Reported', 'Contacted'), true);
  assert.equal(canTransitionProviderReportStatus('Contacted', 'Accepted'), true);
  assert.equal(canTransitionProviderReportStatus('Accepted', 'InProgress'), true);
  assert.equal(canTransitionProviderReportStatus('InProgress', 'Done'), true);
  assert.equal(canTransitionProviderReportStatus('InProgress', 'Failed'), true);
  assert.equal(canTransitionProviderReportStatus('Reported', 'InProgress'), false);
  assert.equal(canTransitionProviderReportStatus('Done', 'InProgress'), false);
});

test('normalizeProviderContactLogPayload converts local datetime values and trims empty fields', () => {
  const normalized = normalizeProviderContactLogPayload({
    contactMethod: '  Phone  ',
    contactResult: '  Reached  ',
    contactNote: '   ',
    contactedAt: '2026-07-20T16:30',
  });

  assert.equal(normalized.contactMethod, 'Phone');
  assert.equal(normalized.contactResult, 'Reached');
  assert.equal(normalized.contactNote, null);
  assert.equal(normalized.contactedAt, new Date('2026-07-20T16:30').toISOString());
});

test('resolveProviderReportById finds the matching report from feedback-level payloads', () => {
  const payload = {
    items: [
      { providerReportId: 7, feedbackId: 'fb-1', reportStatus: 'Assigned' },
      { providerReportId: 8, feedbackId: 'fb-1', reportStatus: 'InProgress' },
    ],
  };

  assert.equal(resolveProviderReportById(payload, 8)?.providerReportId, 8);
  assert.equal(resolveProviderReportById(payload, '7')?.reportStatus, 'Assigned');
  assert.equal(resolveProviderReportById([], 8), null);
});
