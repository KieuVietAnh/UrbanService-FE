import { axiosClient } from './axiosClient.js';

const unwrap = (response) => response?.data ?? response;

const normalizeLimit = (value, fallback = 10, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(parsed)));
};

const normalizeMonths = (value, fallback = 12) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(24, Math.max(1, Math.trunc(parsed)));
};

export const feedbackDashboardApi = {
  async getOverview() {
    return unwrap(await axiosClient.get('/api/feedbacks/dashboard/overview'));
  },

  async getStatusDistribution() {
    const payload = unwrap(await axiosClient.get('/api/feedbacks/dashboard/status-distribution'));
    return Array.isArray(payload) ? payload : [];
  },

  async getPriorityDistribution() {
    const payload = unwrap(await axiosClient.get('/api/feedbacks/dashboard/priority-distribution'));
    return Array.isArray(payload) ? payload : [];
  },

  async getCategoryDistribution() {
    const payload = unwrap(await axiosClient.get('/api/feedbacks/dashboard/category-distribution'));
    return Array.isArray(payload) ? payload : [];
  },

  async getAreaDistribution() {
    const payload = unwrap(await axiosClient.get('/api/feedbacks/dashboard/area-distribution'));
    return Array.isArray(payload) ? payload : [];
  },

  async getMonthlyTrend(months = 12) {
    const payload = unwrap(await axiosClient.get('/api/feedbacks/dashboard/monthly-trend', {
      params: { months: normalizeMonths(months) },
    }));
    return Array.isArray(payload) ? payload : [];
  },

  async getUrgentOpen(limit = 10) {
    const payload = unwrap(await axiosClient.get('/api/feedbacks/dashboard/urgent-open', {
      params: { limit: normalizeLimit(limit) },
    }));
    return Array.isArray(payload) ? payload : [];
  },

  async getRecent(limit = 10) {
    const payload = unwrap(await axiosClient.get('/api/feedbacks/dashboard/recent', {
      params: { limit: normalizeLimit(limit) },
    }));
    return Array.isArray(payload) ? payload : [];
  },
};
