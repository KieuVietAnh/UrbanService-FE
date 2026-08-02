import { managementFeedbackApi, toolsApi } from '@urbanmind/shared-api';

const DETAIL_TTL = 60 * 1000;
const CATEGORY_TTL = 5 * 60 * 1000;

const detailCache = new Map();
const detailRequests = new Map();
let categoryCache = null;
let categoryRequest = null;

const isFresh = (entry, ttl) => (
  Boolean(entry) && Date.now() - Number(entry.savedAt || 0) < ttl
);

export const peekAdminFeedbackDetail = (feedbackId) => {
  if (!feedbackId) return null;
  const entry = detailCache.get(String(feedbackId));
  return isFresh(entry, DETAIL_TTL) ? entry.value : null;
};

export const loadAdminFeedbackDetail = async (feedbackId, { force = false } = {}) => {
  if (!feedbackId) return null;
  const key = String(feedbackId);
  const cached = detailCache.get(key);

  if (!force && isFresh(cached, DETAIL_TTL)) {
    return cached.value;
  }

  if (!force && detailRequests.has(key)) {
    return detailRequests.get(key);
  }

  const request = managementFeedbackApi
    .getFeedbackById(feedbackId)
    .then((response) => {
      detailCache.set(key, { value: response, savedAt: Date.now() });
      return response;
    })
    .finally(() => {
      detailRequests.delete(key);
    });

  detailRequests.set(key, request);
  return request;
};

export const prefetchAdminFeedbackDetail = (feedbackId) => {
  if (!feedbackId || peekAdminFeedbackDetail(feedbackId)) return;
  void loadAdminFeedbackDetail(feedbackId).catch(() => {
    // Prefetch thất bại không được làm gián đoạn thao tác mở chi tiết.
  });
};

export const getAdminFeedbackCategories = async () => {
  if (isFresh(categoryCache, CATEGORY_TTL)) {
    return categoryCache.value;
  }

  if (categoryRequest) return categoryRequest;

  categoryRequest = toolsApi
    .getCategories()
    .then((response) => {
      const value = Array.isArray(response) ? response : [];
      categoryCache = { value, savedAt: Date.now() };
      return value;
    })
    .finally(() => {
      categoryRequest = null;
    });

  return categoryRequest;
};
