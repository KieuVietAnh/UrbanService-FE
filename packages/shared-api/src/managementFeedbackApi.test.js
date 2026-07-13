import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAiReviewedPayload,
  normalizeStaffFeedbackUpdatePayload,
  normalizeFeedbackListParams,
  normalizeCommentPayload,
  normalizeProviderReportStatus,
  canTransitionProviderReportStatus,
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

test('provider report status helpers enforce the Assigned → InProgress → Completed workflow', () => {
  assert.equal(normalizeProviderReportStatus('in_progress'), 'InProgress');
  assert.equal(normalizeProviderReportStatus('completed'), 'Completed');
  assert.equal(canTransitionProviderReportStatus('Assigned', 'InProgress'), true);
  assert.equal(canTransitionProviderReportStatus('Assigned', 'Completed'), false);
  assert.equal(canTransitionProviderReportStatus('InProgress', 'Completed'), true);
  assert.equal(canTransitionProviderReportStatus('Completed', 'Assigned'), false);
});
