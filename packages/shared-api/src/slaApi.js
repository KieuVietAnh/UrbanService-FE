import { axiosClient } from './axiosClient.js';
import { toolsApi } from './toolsApi.js';

const unwrap = (response) => response?.data ?? response;
const unwrapApiData = (response) => {
  const payload = unwrap(response);
  return payload?.data ?? payload;
};

const toQueryParams = (params = {}) => {
  const next = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') next[key] = value;
  });
  return next;
};

export const slaApi = {
  async getPolicies(params = {}) {
    const response = await axiosClient.get('/api/sla-policies', {
      params: toQueryParams({
        Search: params.search,
        AreaId: params.areaId,
        CategoryId: params.categoryId,
        Priority: params.priority,
        IsActive: params.isActive,
        IsCurrentlyEffective: params.isCurrentlyEffective,
        PageNumber: params.pageNumber ?? 1,
        PageSize: params.pageSize ?? 10,
      }),
    });
    return unwrapApiData(response) || { items: [], pageNumber: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
  },

  async getPolicy(policyId) {
    const response = await axiosClient.get(`/api/sla-policies/${policyId}`);
    return unwrapApiData(response);
  },

  async createPolicy(payload) {
    const response = await axiosClient.post('/api/sla-policies', payload);
    return unwrapApiData(response);
  },

  async updatePolicy(policyId, payload) {
    const response = await axiosClient.put(`/api/sla-policies/${policyId}`, payload);
    return unwrapApiData(response);
  },

  async setPolicyActive(policyId, isActive) {
    const response = await axiosClient.patch(`/api/sla-policies/${policyId}/active`, { isActive });
    return unwrapApiData(response);
  },

  async deletePolicy(policyId) {
    const response = await axiosClient.delete(`/api/sla-policies/${policyId}`);
    return unwrapApiData(response);
  },

  async getDashboardOverview() {
    const response = await axiosClient.get('/api/slas/dashboard/overview');
    return unwrapApiData(response);
  },

  async getDashboardCompliance() {
    const response = await axiosClient.get('/api/slas/dashboard/compliance');
    return unwrapApiData(response);
  },

  async getDashboardPerformance() {
    const response = await axiosClient.get('/api/slas/dashboard/performance');
    return unwrapApiData(response);
  },

  async getDashboardViolationsChart() {
    const response = await axiosClient.get('/api/slas/dashboard/violations/chart');
    return unwrapApiData(response);
  },

  async getDashboardNearingBreach(limit = 10) {
    const response = await axiosClient.get('/api/slas/dashboard/nearing-breach', {
      params: toQueryParams({ limit }),
    });
    return unwrapApiData(response);
  },

  async getDashboardRecentBreach(limit = 10) {
    const response = await axiosClient.get('/api/slas/dashboard/recent-breach', {
      params: toQueryParams({ limit }),
    });
    return unwrapApiData(response);
  },

  async getAreas() {
    return toolsApi.getAreas({ includeInactive: false });
  },

  async getCategories() {
    return toolsApi.getCategories();
  },
};
