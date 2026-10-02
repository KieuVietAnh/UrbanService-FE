import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { axiosClient } from './axiosClient.js';
import {
  managerAreaAssignmentApi,
  normalizeManagerAreaAssignmentCreatePayload,
  normalizeManagerAreaAssignmentFilters,
} from './managerAreaAssignmentApi.js';

test('normalizes manager-area filters and create payload', () => {
  assert.deepEqual(normalizeManagerAreaAssignmentFilters({
    managerUserId: ' manager-1 ',
    areaId: '4',
    isActive: false,
  }), {
    managerUserId: 'manager-1',
    areaId: 4,
    isActive: false,
  });

  assert.deepEqual(normalizeManagerAreaAssignmentCreatePayload({
    managerUserId: ' manager-1 ',
    areaId: '7',
  }), {
    managerUserId: 'manager-1',
    areaId: 7,
  });
});

test('manager area API uses the admin assignment routes', async () => {
  const getRequest = mock.method(axiosClient, 'get', async () => []);
  const postRequest = mock.method(axiosClient, 'post', async () => ({}));
  const putRequest = mock.method(axiosClient, 'put', async () => ({}));
  const patchRequest = mock.method(axiosClient, 'patch', async () => ({}));

  try {
    await managerAreaAssignmentApi.getAll({ areaId: '2', isActive: true });
    await managerAreaAssignmentApi.create({ managerUserId: 'manager-2', areaId: '2' });
    await managerAreaAssignmentApi.update('8', { areaId: '3' });
    await managerAreaAssignmentApi.setActive('8', false);

    assert.deepEqual(getRequest.mock.calls[0].arguments, [
      '/api/admin/manager-area-assignments',
      { params: { areaId: 2, isActive: true }, signal: undefined },
    ]);
    assert.deepEqual(postRequest.mock.calls[0].arguments, [
      '/api/admin/manager-area-assignments',
      { managerUserId: 'manager-2', areaId: 2 },
      { signal: undefined },
    ]);
    assert.deepEqual(putRequest.mock.calls[0].arguments, [
      '/api/admin/manager-area-assignments/8',
      { areaId: 3 },
      { signal: undefined },
    ]);
    assert.deepEqual(patchRequest.mock.calls[0].arguments, [
      '/api/admin/manager-area-assignments/8/active',
      { isActive: false },
      { signal: undefined },
    ]);
  } finally {
    getRequest.mock.restore();
    postRequest.mock.restore();
    putRequest.mock.restore();
    patchRequest.mock.restore();
  }
});
