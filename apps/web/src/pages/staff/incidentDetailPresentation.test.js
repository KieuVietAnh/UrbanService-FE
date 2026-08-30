import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatConfidence,
  formatReportCode,
  getIncidentEventMetadata,
  getIncidentEventTitle,
  getReportLinkMethodLabel,
  parseIncidentEventPayload,
} from './incidentDetailPresentation.js';

test('Report presentation keeps the real identifier and confidence readable', () => {
  assert.equal(formatReportCode('12345678-abcd-0000-0000-000000000000'), 'UM-12345678');
  assert.equal(formatConfidence(0.923), '92,3%');
  assert.equal(formatConfidence(84), '84%');
});

test('membership wording explains the relationship without describing a deletion', () => {
  assert.equal(getReportLinkMethodLabel('AiManagerConfirmed'), 'AI đề xuất, Manager xác nhận');
  assert.equal(getReportLinkMethodLabel('Manual'), 'Ghép thủ công');
  assert.equal(getReportLinkMethodLabel('InitialCreated'), 'Report khởi tạo sự vụ');
});

test('timeline presentation maps returned event characteristics conservatively', () => {
  assert.equal(getIncidentEventTitle('IncidentReportLinked'), 'Phản ánh được liên kết');
  assert.equal(getIncidentEventTitle('IncidentAssigned'), 'Sự vụ được phân công');
  assert.equal(getIncidentEventTitle('UnrecognizedEvent'), 'Hoạt động sự vụ');
});

test('timeline payload parser exposes only supported metadata', () => {
  const payloadJson = JSON.stringify({
    oldStatus: 'Assigned',
    newStatus: 'InProgress',
    assignedStaffName: 'Nguyễn Văn A',
    internalObject: { secret: true },
  });

  assert.deepEqual(parseIncidentEventPayload(payloadJson), JSON.parse(payloadJson));
  assert.deepEqual(getIncidentEventMetadata({ payloadJson }), [
    { label: 'Trạng thái trước', value: 'Đã phân công' },
    { label: 'Trạng thái sau', value: 'Đang xử lý' },
    { label: 'Staff phụ trách', value: 'Nguyễn Văn A' },
  ]);
});
