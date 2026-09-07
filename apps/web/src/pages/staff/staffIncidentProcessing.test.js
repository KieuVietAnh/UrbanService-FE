import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canManageIncidentExecution,
  canStartIncidentProcessing,
  getIncidentNextActionCopy,
  getIncidentProcessingSteps,
  getProviderStatusIntent,
  getProviderStatusLabel,
  getStartProcessingDeniedMessage,
  isIncidentAssignedToCurrentStaff,
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

test('requires authoritative current Staff ownership for execution actions', () => {
  const currentUser = { userId: 'STAFF-1' };

  assert.equal(isIncidentAssignedToCurrentStaff(
    { assignedStaffUserId: 'staff-1' },
    currentUser,
  ), true);
  assert.equal(canStartIncidentProcessing(
    { assignedStaffUserId: 'staff-1', status: 'Assigned' },
    currentUser,
  ), true);
  assert.equal(canStartIncidentProcessing(
    { assignedStaffUserId: 'staff-1', status: 'InProgress' },
    currentUser,
  ), false);
  assert.equal(canManageIncidentExecution(
    { assignedStaffUserId: 'staff-1', status: 'NeedRework' },
    currentUser,
  ), true);
  assert.equal(canManageIncidentExecution(
    { assignedStaffUserId: 'staff-2', status: 'Assigned' },
    currentUser,
  ), false);
});

test('explains a forbidden start request from the latest authoritative Incident state', () => {
  const user = { userId: 'staff-1' };
  assert.match(getStartProcessingDeniedMessage(null, user), /Không thể tải lại/);
  assert.match(getStartProcessingDeniedMessage(
    { assignedStaffUserId: 'staff-2', status: 'Assigned' }, user,
  ), /không còn được phân công/);
  assert.match(getStartProcessingDeniedMessage(
    { assignedStaffUserId: 'staff-1', status: 'InProgress' }, user,
  ), /không còn là Đã phân công/);
  assert.match(getStartProcessingDeniedMessage(
    { assignedStaffUserId: 'staff-1', status: 'Assigned' }, user,
  ), /policy/);
});

test('maps only returned Provider statuses to Vietnamese text and semantic intent', () => {
  assert.equal(getProviderStatusLabel('InProgress'), 'Đang thực hiện');
  assert.equal(getProviderStatusLabel('Done'), 'Hoàn thành');
  assert.equal(getProviderStatusLabel('Unexpected'), 'Chưa xác định');
  assert.equal(getProviderStatusIntent('Done'), 'success');
  assert.equal(getProviderStatusIntent('Failed'), 'danger');
});
