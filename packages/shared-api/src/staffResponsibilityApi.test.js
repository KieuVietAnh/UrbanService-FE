import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { axiosClient } from './axiosClient.js';
import {
  normalizeManagedStaffAccountPayload,
  staffResponsibilityApi,
} from './staffResponsibilityApi.js';

test('normalizes a Manager-created Staff account payload', () => {
  assert.deepEqual(normalizeManagedStaffAccountPayload({
    fullName: ' New Staff ',
    email: ' STAFF@Urban.Test ',
    password: 'password-123',
    phoneNumber: ' 0901 234 567 ',
    address: ' Ward office ',
    areaId: '4',
    categoryId: '7',
    isPrimary: true,
  }), {
    fullName: 'New Staff',
    email: 'staff@urban.test',
    password: 'password-123',
    phoneNumber: '0901 234 567',
    address: 'Ward office',
    areaId: 4,
    categoryId: 7,
    isPrimary: true,
  });
});

test('uses the Manager managed-area and Staff-account routes', async () => {
  const getRequest = mock.method(axiosClient, 'get', async () => []);
  const postRequest = mock.method(axiosClient, 'post', async () => ({}));

  try {
    await staffResponsibilityApi.getManagedAreas();
    await staffResponsibilityApi.createStaffAccount({
      fullName: 'New Staff',
      email: 'staff@urban.test',
      password: 'password-123',
      areaId: '2',
      categoryId: '',
      isPrimary: false,
    });

    assert.deepEqual(getRequest.mock.calls[0].arguments, [
      '/api/management/staff-responsibilities/managed-areas',
      { signal: undefined },
    ]);
    assert.deepEqual(postRequest.mock.calls[0].arguments, [
      '/api/management/staff-responsibilities/staff-accounts',
      {
        fullName: 'New Staff',
        email: 'staff@urban.test',
        password: 'password-123',
        areaId: 2,
        categoryId: null,
        isPrimary: false,
      },
      { signal: undefined },
    ]);
  } finally {
    getRequest.mock.restore();
    postRequest.mock.restore();
  }
});
