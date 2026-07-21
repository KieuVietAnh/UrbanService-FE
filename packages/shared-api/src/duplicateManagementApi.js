import { axiosClient } from './axiosClient.js';

const getDuplicateBasePath = () => '/api/staff/feedback-duplicates';

const normalizeDuplicateItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const normalizeDuplicatePagination = (payload = {}) => {
  const page = Number(payload?.page ?? payload?.pageNumber ?? payload?.currentPage ?? 1) || 1;
  const pageSize = Number(payload?.pageSize ?? payload?.pageSize ?? payload?.itemsPerPage ?? 10) || 10;
  const totalCount = Number(payload?.totalCount ?? payload?.total ?? payload?.count ?? 0) || 0;
  const totalPages = Number(payload?.totalPages ?? payload?.pageCount ?? 0) || 0;

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
  };
};

export const duplicateManagementApi = {
  async getDuplicateSummary() {
    const response = await axiosClient.get(`${getDuplicateBasePath()}/summary`);
    const payload = response?.data ?? response?.item ?? response?.result ?? response ?? {};
    const summary = payload?.summary ?? payload?.data ?? payload?.result ?? payload ?? {};

    return {
      pending: Number(summary?.pending ?? summary?.pendingCount ?? summary?.pendingTotal ?? summary?.pendingItems ?? 0) || 0,
      confirmed: Number(summary?.confirmed ?? summary?.confirmedCount ?? summary?.confirmedTotal ?? 0) || 0,
      rejected: Number(summary?.rejected ?? summary?.rejectedCount ?? summary?.rejectedTotal ?? 0) || 0,
      total: Number(summary?.total ?? summary?.totalCount ?? summary?.totalItems ?? 0) || 0,
    };
  },

  async getDuplicateCandidates(params = {}) {
    const response = await axiosClient.get(getDuplicateBasePath(), {
      params,
    });

    const payload = response?.data ?? response?.item ?? response?.result ?? response ?? {};

    return {
      items: normalizeDuplicateItems(payload),
      pagination: normalizeDuplicatePagination(payload),
    };
  },

  async getDuplicateById(duplicateCandidateId) {
    const response = await axiosClient.get(`${getDuplicateBasePath()}/${duplicateCandidateId}`);
    const payload = response?.data ?? response?.item ?? response?.result ?? response ?? {};

    return payload;
  },

  async confirmDuplicateCandidate(duplicateCandidateId) {
    const response = await axiosClient.post(`${getDuplicateBasePath()}/${duplicateCandidateId}/confirm`);
    const payload = response?.data ?? response?.item ?? response?.result ?? response ?? {};

    return payload;
  },

  async rejectDuplicateCandidate(duplicateCandidateId, reason) {
    const response = await axiosClient.post(`${getDuplicateBasePath()}/${duplicateCandidateId}/reject`, {
      reason,
      rejectionReason: reason,
    });
    const payload = response?.data ?? response?.item ?? response?.result ?? response ?? {};

    return payload;
  },
};
