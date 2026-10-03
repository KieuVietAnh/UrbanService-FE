import { axiosClient } from './axiosClient.js';

const BASE = '/api/admin/manager-area-assignments';

const positiveInteger = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return parsed;
};

const requiredUserId = (value, name) => {
  const normalized = String(value || '').trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
};

export const normalizeManagerAreaAssignmentFilters = (filters = {}) => {
  const normalized = {};
  const managerUserId = String(filters?.managerUserId || '').trim();
  if (managerUserId) normalized.managerUserId = managerUserId;
  if (filters?.areaId !== undefined && filters?.areaId !== null && filters?.areaId !== '') {
    normalized.areaId = positiveInteger(filters.areaId, 'areaId');
  }
  if (typeof filters?.isActive === 'boolean') normalized.isActive = filters.isActive;
  return normalized;
};

export const normalizeManagerAreaAssignmentCollection = (response = []) => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const normalizeManagerAreaAssignmentCreatePayload = (payload = {}) => ({
  managerUserId: requiredUserId(payload?.managerUserId, 'managerUserId'),
  areaId: positiveInteger(payload?.areaId, 'areaId'),
});

export const normalizeManagerAreaAssignmentUpdatePayload = (payload = {}) => ({
  areaId: positiveInteger(payload?.areaId, 'areaId'),
});

export const managerAreaAssignmentApi = Object.freeze({
  async getAll(filters = {}, options = {}) {
    const response = await axiosClient.get(BASE, {
      params: normalizeManagerAreaAssignmentFilters(filters),
      signal: options?.signal,
    });
    return normalizeManagerAreaAssignmentCollection(response);
  },

  async getById(assignmentId, options = {}) {
    const response = await axiosClient.get(`${BASE}/${positiveInteger(assignmentId, 'assignmentId')}`, {
      signal: options?.signal,
    });
    return response?.data ?? response;
  },

  async create(payload, options = {}) {
    const response = await axiosClient.post(
      BASE,
      normalizeManagerAreaAssignmentCreatePayload(payload),
      { signal: options?.signal },
    );
    return response?.data ?? response;
  },

  async update(assignmentId, payload, options = {}) {
    const response = await axiosClient.put(
      `${BASE}/${positiveInteger(assignmentId, 'assignmentId')}`,
      normalizeManagerAreaAssignmentUpdatePayload(payload),
      { signal: options?.signal },
    );
    return response?.data ?? response;
  },

  async setActive(assignmentId, isActive, options = {}) {
    const response = await axiosClient.patch(
      `${BASE}/${positiveInteger(assignmentId, 'assignmentId')}/active`,
      { isActive: Boolean(isActive) },
      { signal: options?.signal },
    );
    return response?.data ?? response;
  },
});
