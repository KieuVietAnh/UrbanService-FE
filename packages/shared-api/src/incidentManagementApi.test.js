import test from 'node:test';
import assert from 'node:assert/strict';

import { mock } from 'node:test';

import { axiosClient } from './axiosClient.js';
import {
  INCIDENT_MANAGEMENT_CAPABILITIES,
  incidentManagementApi,
  normalizeIncidentDetailResponse,
  normalizeIncidentListParams,
  normalizeIncidentListResponse,
  normalizeIncidentTimelineParams,
  normalizeIncidentTimelineResponse,
} from './incidentManagementApi.js';

test('incident list capability follows the checked-in ManagementIncidents contract', () => {
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.list.available, true);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.list.endpoint, '/api/management/incidents');
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.list.assignedToCurrentStaff, true);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.list.supportedFilters.includes('severity'), true);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.list.supportedFilters.includes('assignedStaffUserId'), true);
  assert.equal(incidentManagementApi.capabilities, INCIDENT_MANAGEMENT_CAPABILITIES);
  assert.equal(typeof incidentManagementApi.getIncidents, 'function');
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.detail.available, true);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.detail.endpoint, '/api/management/incidents/{incidentId}');
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.detail.assignedStaff, true);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.detail.incidentLevelSla, false);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.detail.reportsEmbedded, true);
  assert.equal(typeof incidentManagementApi.getIncidentById, 'function');
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.timeline.available, true);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.timeline.paginated, true);
  assert.equal(INCIDENT_MANAGEMENT_CAPABILITIES.timeline.defaultPageSize, 20);
  assert.equal(typeof incidentManagementApi.getIncidentTimeline, 'function');
});

test('normalizeIncidentListParams maps only supported Swagger query parameters', () => {
  assert.deepEqual(normalizeIncidentListParams({
    pageNumber: 2,
    pageSize: 20,
    areaId: '4',
    categoryId: 7,
    status: ' InProgress ',
    priority: 'High',
    severity: 'Major',
    search: ' ngập nước ',
    includeMerged: false,
    assignedStaffUserId: ' staff-1 ',
    unsupported: 'ignored',
  }), {
    PageNumber: 2,
    PageSize: 20,
    AreaId: 4,
    CategoryId: 7,
    Status: 'InProgress',
    Priority: 'High',
    Severity: 'Major',
    Search: 'ngập nước',
    IncludeMerged: false,
    AssignedStaffUserId: 'staff-1',
  });
});

test('normalizeIncidentListResponse preserves the documented paged DTO', () => {
  const item = { incidentId: 'incident-1', title: 'Ngập nước', reportCount: 3 };

  assert.deepEqual(normalizeIncidentListResponse({
    items: [item],
    pageNumber: 2,
    pageSize: 10,
    totalItems: 12,
    totalPages: 2,
    hasPreviousPage: true,
    hasNextPage: false,
  }), {
    items: [item],
    pageNumber: 2,
    pageSize: 10,
    totalItems: 12,
    totalPages: 2,
    hasPreviousPage: true,
    hasNextPage: false,
  });
});

test('getIncidents calls the real management endpoint with Staff scope', async () => {
  const getMock = mock.method(axiosClient, 'get', async () => ({
    items: [],
    pageNumber: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  }));

  try {
    await incidentManagementApi.getIncidents({
      pageNumber: 1,
      pageSize: 10,
      assignedStaffUserId: 'staff-1',
      includeMerged: false,
    });

    assert.equal(getMock.mock.callCount(), 1);
    assert.equal(getMock.mock.calls[0].arguments[0], '/api/management/incidents');
    assert.deepEqual(getMock.mock.calls[0].arguments[1].params, {
      PageNumber: 1,
      PageSize: 10,
      AssignedStaffUserId: 'staff-1',
      IncludeMerged: false,
    });
  } finally {
    getMock.mock.restore();
  }
});

test('normalizeIncidentDetailResponse keeps the documented Incident detail DTO', () => {
  const incident = {
    incidentId: 'incident-1',
    title: 'Ngập nước tại đường Nguyễn Huệ',
    assignedStaffName: 'Nguyễn Văn A',
    reportCount: 3,
    reports: [{ feedbackId: 'feedback-1' }],
    events: [],
  };

  assert.equal(normalizeIncidentDetailResponse(incident), incident);
  assert.equal(normalizeIncidentDetailResponse({ data: incident }), incident);
  assert.equal(normalizeIncidentDetailResponse(null), null);
  assert.equal(normalizeIncidentDetailResponse([]), null);
});

test('getIncidentById calls the real management detail endpoint', async () => {
  const signal = new AbortController().signal;
  const incident = { incidentId: 'incident-1', title: 'Ngập nước' };
  const getMock = mock.method(axiosClient, 'get', async () => incident);

  try {
    const result = await incidentManagementApi.getIncidentById('incident-1', { signal });

    assert.equal(result, incident);
    assert.equal(getMock.mock.callCount(), 1);
    assert.equal(getMock.mock.calls[0].arguments[0], '/api/management/incidents/incident-1');
    assert.equal(getMock.mock.calls[0].arguments[1].signal, signal);
  } finally {
    getMock.mock.restore();
  }
});

test('getIncidentById rejects an empty Incident identifier before making a request', async () => {
  const getMock = mock.method(axiosClient, 'get', async () => null);

  try {
    await assert.rejects(
      incidentManagementApi.getIncidentById('  '),
      { name: 'TypeError', message: 'incidentId is required' },
    );
    assert.equal(getMock.mock.callCount(), 0);
  } finally {
    getMock.mock.restore();
  }
});

test('normalizeIncidentTimelineParams follows the documented pagination query', () => {
  assert.deepEqual(normalizeIncidentTimelineParams({ pageNumber: 2, pageSize: 20 }), {
    pageNumber: 2,
    pageSize: 20,
  });
  assert.deepEqual(normalizeIncidentTimelineParams({ pageNumber: 0, pageSize: 'invalid' }), {});
});

test('normalizeIncidentTimelineResponse preserves the paged event DTO', () => {
  const event = { incidentEventId: 1, eventType: 'IncidentCreated' };

  assert.deepEqual(normalizeIncidentTimelineResponse({
    items: [event],
    pageNumber: 2,
    pageSize: 20,
    totalItems: 21,
    totalPages: 2,
    hasPreviousPage: true,
    hasNextPage: false,
  }), {
    items: [event],
    pageNumber: 2,
    pageSize: 20,
    totalItems: 21,
    totalPages: 2,
    hasPreviousPage: true,
    hasNextPage: false,
  });
});

test('getIncidentTimeline calls the paginated management timeline endpoint', async () => {
  const resultDto = {
    items: [],
    pageNumber: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
  const getMock = mock.method(axiosClient, 'get', async () => resultDto);

  try {
    const result = await incidentManagementApi.getIncidentTimeline(
      'incident-1',
      { pageNumber: 1, pageSize: 20 },
    );

    assert.deepEqual(result, resultDto);
    assert.equal(getMock.mock.callCount(), 1);
    assert.equal(getMock.mock.calls[0].arguments[0], '/api/management/incidents/incident-1/timeline');
    assert.deepEqual(getMock.mock.calls[0].arguments[1].params, {
      pageNumber: 1,
      pageSize: 20,
    });
  } finally {
    getMock.mock.restore();
  }
});
