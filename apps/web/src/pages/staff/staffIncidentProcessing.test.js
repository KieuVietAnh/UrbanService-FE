import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getIncidentNextActionCopy,
  getIncidentProcessingSteps,
  isAssignedToAnotherStaff,
} from './staffIncidentProcessing.js';

test('maps real Incident statuses to operational stages without inventing percentages', () => {
  assert.deepEqual(
    getIncidentProcessingSteps('Assigned').map((step) => step.state),
    ['current', 'pending', 'pending', 'pending'],
  );
  assert.deepEqual(
    getIncidentProcessingSteps('InProgress').map((step) => step.state),
    ['complete', 'current', 'pending', 'pending'],
  );
  assert.deepEqual(
    getIncidentProcessingSteps('SubmittedForApproval').map((step) => step.state),
    ['complete', 'complete', 'current', 'pending'],
  );
  assert.deepEqual(
    getIncidentProcessingSteps('Closed').map((step) => step.state),
    ['complete', 'complete', 'complete', 'complete'],
  );
});

test('keeps NeedRework in the Staff processing stage', () => {
  assert.deepEqual(
    getIncidentProcessingSteps('NeedRework').map((step) => step.state),
    ['complete', 'current', 'pending', 'pending'],
  );
  assert.match(getIncidentNextActionCopy('NeedRework'), /Manager/);
});

test('only identifies a different assignee when both authoritative identifiers exist', () => {
  assert.equal(isAssignedToAnotherStaff(
    { assignedStaffUserId: 'staff-2' },
    { userId: 'staff-1' },
  ), true);
  assert.equal(isAssignedToAnotherStaff(
    { assignedStaffUserId: 'staff-1' },
    { userId: 'staff-1' },
  ), false);
  assert.equal(isAssignedToAnotherStaff(
    { assignedStaffUserId: 'staff-2' },
    {},
  ), false);
});
