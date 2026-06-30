import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAiReviewedPayload, normalizeStaffFeedbackUpdatePayload } from './managementFeedbackApi.js';

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
