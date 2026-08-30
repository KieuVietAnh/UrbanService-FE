import { axiosClient } from './axiosClient.js';

const INCIDENT_LIST_ENDPOINT = '/api/management/incidents';
const INCIDENT_DETAIL_ENDPOINT = '/api/management/incidents/{incidentId}';
const INCIDENT_TIMELINE_ENDPOINT = '/api/management/incidents/{incidentId}/timeline';

const buildIncidentDetailEndpoint = (incidentId) => {
  const normalizedIncidentId = String(incidentId ?? '').trim();

  if (!normalizedIncidentId) {
    throw new TypeError('incidentId is required');
  }

  return `/api/management/incidents/${encodeURIComponent(normalizedIncidentId)}`;
};

const readParam = (params, pascalName, camelName) => (
  params?.[pascalName] ?? params?.[camelName]
);

const assignPositiveInteger = (target, key, value) => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) target[key] = parsed;
};

const assignOptionalInteger = (target, key, value) => {
  if (value === undefined || value === null || value === '') return;
  const parsed = Number(value);
  if (Number.isInteger(parsed)) target[key] = parsed;
};

const assignOptionalString = (target, key, value) => {
  const normalized = String(value ?? '').trim();
  if (normalized) target[key] = normalized;
};

export const normalizeIncidentListParams = (params = {}) => {
  const normalized = {};

  assignPositiveInteger(normalized, 'PageNumber', readParam(params, 'PageNumber', 'pageNumber'));
  assignPositiveInteger(normalized, 'PageSize', readParam(params, 'PageSize', 'pageSize'));
  assignOptionalInteger(normalized, 'AreaId', readParam(params, 'AreaId', 'areaId'));
  assignOptionalInteger(normalized, 'CategoryId', readParam(params, 'CategoryId', 'categoryId'));
  assignOptionalString(normalized, 'Status', readParam(params, 'Status', 'status'));
  assignOptionalString(normalized, 'Priority', readParam(params, 'Priority', 'priority'));
  assignOptionalString(normalized, 'Severity', readParam(params, 'Severity', 'severity'));
  assignOptionalString(normalized, 'Search', readParam(params, 'Search', 'search'));
  assignOptionalString(
    normalized,
    'AssignedStaffUserId',
    readParam(params, 'AssignedStaffUserId', 'assignedStaffUserId'),
  );

  const includeMerged = readParam(params, 'IncludeMerged', 'includeMerged');
  if (typeof includeMerged === 'boolean') normalized.IncludeMerged = includeMerged;

  return normalized;
};

export const normalizeIncidentListResponse = (response = {}) => {
  const payload = response?.data ?? response ?? {};

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pageNumber: Number(payload?.pageNumber) || 1,
    pageSize: Number(payload?.pageSize) || 0,
    totalItems: Number(payload?.totalItems) || 0,
    totalPages: Number(payload?.totalPages) || 0,
    hasPreviousPage: Boolean(payload?.hasPreviousPage),
    hasNextPage: Boolean(payload?.hasNextPage),
  };
};

export const normalizeIncidentDetailResponse = (response = null) => {
  const payload = response?.data ?? response;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return payload;
};

export const normalizeIncidentTimelineParams = (params = {}) => {
  const normalized = {};

  assignPositiveInteger(normalized, 'pageNumber', readParam(params, 'PageNumber', 'pageNumber'));
  assignPositiveInteger(normalized, 'pageSize', readParam(params, 'PageSize', 'pageSize'));

  return normalized;
};

export const normalizeIncidentTimelineResponse = (response = {}) => {
  const payload = response?.data ?? response ?? {};

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pageNumber: Number(payload?.pageNumber) || 1,
    pageSize: Number(payload?.pageSize) || 0,
    totalItems: Number(payload?.totalItems) || 0,
    totalPages: Number(payload?.totalPages) || 0,
    hasPreviousPage: Boolean(payload?.hasPreviousPage),
    hasNextPage: Boolean(payload?.hasNextPage),
  };
};

export const INCIDENT_MANAGEMENT_CAPABILITIES = Object.freeze({
  list: Object.freeze({
    available: true,
    endpoint: INCIDENT_LIST_ENDPOINT,
    supportedFilters: Object.freeze([
      'pageNumber',
      'pageSize',
      'areaId',
      'categoryId',
      'status',
      'priority',
      'severity',
      'search',
      'includeMerged',
      'assignedStaffUserId',
    ]),
    assignedToCurrentStaff: true,
  }),
  detail: Object.freeze({
    available: true,
    endpoint: INCIDENT_DETAIL_ENDPOINT,
    assignedStaff: true,
    incidentLevelSla: false,
    reportsEmbedded: true,
  }),
  timeline: Object.freeze({
    available: true,
    endpoint: INCIDENT_TIMELINE_ENDPOINT,
    paginated: true,
    defaultPageSize: 20,
  }),
});

export const incidentManagementApi = Object.freeze({
  capabilities: INCIDENT_MANAGEMENT_CAPABILITIES,

  async getIncidents(params = {}, options = {}) {
    const response = await axiosClient.get(INCIDENT_LIST_ENDPOINT, {
      params: normalizeIncidentListParams(params),
      signal: options?.signal,
    });

    return normalizeIncidentListResponse(response);
  },

  async getIncidentById(incidentId, options = {}) {
    const response = await axiosClient.get(buildIncidentDetailEndpoint(incidentId), {
      signal: options?.signal,
    });

    return normalizeIncidentDetailResponse(response);
  },

  async getIncidentTimeline(incidentId, params = {}, options = {}) {
    const detailEndpoint = buildIncidentDetailEndpoint(incidentId);
    const response = await axiosClient.get(`${detailEndpoint}/timeline`, {
      params: normalizeIncidentTimelineParams(params),
      signal: options?.signal,
    });

    return normalizeIncidentTimelineResponse(response);
  },
});
