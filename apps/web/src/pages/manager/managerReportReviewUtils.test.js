import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findReviewReport,
  formatConfidence,
  formatReportCode,
  getAiCategoryId,
  getRelatedIncidentId,
  getReviewPriority,
  isAiReviewedStatus,
} from './managerReportReviewUtils.js';

test('formats report codes without exposing a full UUID', () => {
  assert.equal(formatReportCode('12345678-abcd-ef00-1234-567890abcdef'), 'PA-12345678');
});

test('normalizes AI urgency for editable Manager priority', () => {
  assert.equal(getReviewPriority({ analysisResult: { urgencyLevel: 'Urgent' } }), 'Critical');
  assert.equal(getReviewPriority({ priority: 'High' }), 'High');
});

test('formats confidence from fractional and percentage values', () => {
  assert.equal(formatConfidence(0.923), '92%');
  assert.equal(formatConfidence(87), '87%');
  assert.equal(formatConfidence(null), 'Chưa có dữ liệu');
});

test('reads only explicit AI category and Incident relationship fields', () => {
  const report = {
    incidentId: 'incident-1',
    parentTicketId: 'legacy-parent',
    analysisResult: { detectedCategoryId: 7 },
  };

  assert.equal(getAiCategoryId(report), 7);
  assert.equal(getRelatedIncidentId(report), 'incident-1');
  assert.equal(getRelatedIncidentId({ parentTicketId: 'legacy-parent' }), '');
});

test('finds the exact report and recognizes AI reviewed status variants', () => {
  assert.equal(findReviewReport([{ feedbackId: 'FB-1' }], 'fb-1')?.feedbackId, 'FB-1');
  assert.equal(isAiReviewedStatus('AI Reviewed'), true);
  assert.equal(isAiReviewedStatus('AiReviewed'), true);
  assert.equal(isAiReviewedStatus('Verified'), false);
});
