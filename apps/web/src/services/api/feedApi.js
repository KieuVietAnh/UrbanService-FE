const getBaseUrl = () => {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
  return raw.replace(/\/$/, '');
};

const getAuthToken = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('urbanmind_auth_token') || localStorage.getItem('token');
};

const COMMUNITY_PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000;
const COMMUNITY_FEED_PAGE_CACHE_TTL_MS = 60 * 1000;
const COMMUNITY_DETAIL_CACHE_TTL_MS = 60 * 1000;
const communityPreviewCache = new Map();
const communityPreviewRequests = new Map();
const communityFeedPageCache = new Map();
const communityFeedPageRequests = new Map();
const communityDetailCache = new Map();
const communityDetailRequests = new Map();

const getPreviewCacheKey = (feedbackId) => String(feedbackId || '');

const normalizeCommunityPreview = (detail = {}) => ({
  attachments: Array.isArray(detail?.attachments)
    ? detail.attachments
    : [],
  description: detail?.description || '',
  imageUrl: detail?.imageUrl || '',
  coverImageUrl: detail?.coverImageUrl || '',
  thumbnailUrl: detail?.thumbnailUrl || '',
  mediaUrl: detail?.mediaUrl || '',
  attachmentUrl: detail?.attachmentUrl || '',
});

const normalizeFeedParams = (params = {}) => {
  const normalized = {};
  const pageNumber = Number(params?.PageNumber ?? params?.pageNumber ?? params?.page ?? 1);
  const pageSize = Number(params?.PageSize ?? params?.pageSize ?? 10);
  const status = params?.Status ?? params?.status ?? params?.tab;
  const categoryId = params?.CategoryId ?? params?.categoryId;
  const search = params?.Search ?? params?.search;

  if (Number.isFinite(pageNumber) && pageNumber > 0) {
    normalized.PageNumber = pageNumber;
  }

  if (Number.isFinite(pageSize) && pageSize > 0) {
    normalized.PageSize = pageSize;
  }

  if (typeof status === 'string' && status.trim()) {
    const trimmed = status.trim();
    const lowered = trimmed.toLowerCase();
    if (lowered === 'resolved') {
      normalized.Status = 'Resolved';
    } else if (!['latest', 'trending', 'nearby'].includes(lowered)) {
      normalized.Status = trimmed;
    }
  }

  if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
    normalized.CategoryId = categoryId;
  }

  if (typeof search === 'string' && search.trim()) {
    normalized.Search = search.trim();
  }

  return normalized;
};

export const getCommunityFeed = async (
  params = {},
  { force = false } = {}
) => {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/user/feedbacks/feed`;
  const url = new URL(endpoint);
  Object.entries(normalizeFeedParams(params)).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const cacheKey = url.toString();
  const cached = communityFeedPageCache.get(cacheKey);

  if (
    !force &&
    cached &&
    Date.now() - cached.updatedAt < COMMUNITY_FEED_PAGE_CACHE_TTL_MS
  ) {
    return cached.payload;
  }

  if (!force && communityFeedPageRequests.has(cacheKey)) {
    return communityFeedPageRequests.get(cacheKey);
  }

  const request = (async () => {
    const token = getAuthToken();
    const headers = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Bảng tin phản hồi quá lâu. Vui lòng thử lại.', { cause: error });
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = response.status === 401
        ? 'Unauthorized. Please log in.'
        : response.status === 403
          ? 'Forbidden. You do not have permission to view this feed.'
          : `Request failed with status ${response.status} ${response.statusText}`;
      throw new Error(`${message} ${typeof payload === 'string' ? payload.slice(0, 300) : JSON.stringify(payload)}`);
    }

    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const normalizeFeedPayload = (value) => {
      const unwrappedValue = (
        value?.data &&
        !Array.isArray(value.data) &&
        typeof value.data === 'object'
      )
        ? value.data
        : value;

      if (Array.isArray(unwrappedValue)) {
        return {
          items: unwrappedValue,
          pageNumber: 1,
          pageSize: unwrappedValue.length,
          totalItems: unwrappedValue.length,
          totalPages: 1,
        };
      }

      if (!unwrappedValue || typeof unwrappedValue !== 'object') {
        return {
          items: [],
          pageNumber: 1,
          pageSize: 0,
          totalItems: 0,
          totalPages: 1,
        };
      }

      const items = Array.isArray(unwrappedValue.items)
        ? unwrappedValue.items
        : Array.isArray(unwrappedValue.data)
          ? unwrappedValue.data
          : Array.isArray(unwrappedValue.content)
            ? unwrappedValue.content
            : Array.isArray(unwrappedValue.feedbacks)
              ? unwrappedValue.feedbacks
              : Array.isArray(unwrappedValue.results)
                ? unwrappedValue.results
                : [];

      const pageNumber = Number(
        unwrappedValue.pageNumber ??
        unwrappedValue.page ??
        1
      );
      const pageSize = Number(
        unwrappedValue.pageSize ??
        unwrappedValue.size ??
        items.length
      );
      const totalItems = Number(
        unwrappedValue.totalItems ??
        unwrappedValue.totalCount ??
        unwrappedValue.count ??
        items.length
      );
      const totalPages = Number(
        unwrappedValue.totalPages ??
        unwrappedValue.pageCount ??
        (pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1)
      );

      return {
        items,
        pageNumber: Number.isFinite(pageNumber) ? pageNumber : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : items.length,
        totalItems: Number.isFinite(totalItems) ? totalItems : items.length,
        totalPages: Number.isFinite(totalPages) && totalPages > 0
          ? totalPages
          : 1,
      };
    };

    const normalizedPayload = normalizeFeedPayload(payload);
    communityFeedPageCache.set(cacheKey, {
      payload: normalizedPayload,
      updatedAt: Date.now(),
    });

    return normalizedPayload;
  })().finally(() => {
    communityFeedPageRequests.delete(cacheKey);
  });

  communityFeedPageRequests.set(cacheKey, request);
  return request;
};

export const getCommunityFeedDetail = async (
  feedbackId,
  { signal, force = false } = {}
) => {
  if (!feedbackId) {
    throw new Error('Feedback ID is required.');
  }

  const cacheKey = getPreviewCacheKey(feedbackId);
  const cachedDetail = communityDetailCache.get(cacheKey);

  if (
    !force &&
    cachedDetail &&
    Date.now() - cachedDetail.updatedAt < COMMUNITY_DETAIL_CACHE_TTL_MS
  ) {
    return cachedDetail.detail;
  }

  if (!force && !signal && communityDetailRequests.has(cacheKey)) {
    return communityDetailRequests.get(cacheKey);
  }

  const request = (async () => {
    const baseUrl = getBaseUrl();
    const endpoint = `${baseUrl}/api/user/feedbacks/feed/${encodeURIComponent(feedbackId)}`;
    const token = getAuthToken();
    const headers = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers,
      signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = response.status === 401
        ? 'Unauthorized. Please log in.'
        : response.status === 403
          ? 'Forbidden. You do not have permission to view this feedback.'
          : `Request failed with status ${response.status} ${response.statusText}`;
      throw new Error(`${message} ${typeof payload === 'string' ? payload.slice(0, 300) : JSON.stringify(payload)}`);
    }

    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const detail = (payload?.data && typeof payload.data === 'object')
      ? payload.data
      : payload;

    const preview = normalizeCommunityPreview(detail);
    communityPreviewCache.set(cacheKey, {
      preview,
      updatedAt: Date.now(),
    });
    communityDetailCache.set(cacheKey, {
      detail,
      updatedAt: Date.now(),
    });

    return detail;
  })().finally(() => {
    if (!signal) {
      communityDetailRequests.delete(cacheKey);
    }
  });

  if (!signal) {
    communityDetailRequests.set(cacheKey, request);
  }

  return request;
};

export const getCommunityFeedPreview = async (
  feedbackId,
  { force = false } = {}
) => {
  if (!feedbackId) {
    throw new Error('Feedback ID is required.');
  }

  const cacheKey = getPreviewCacheKey(feedbackId);
  const cached = communityPreviewCache.get(cacheKey);

  if (
    !force &&
    cached &&
    Date.now() - cached.updatedAt < COMMUNITY_PREVIEW_CACHE_TTL_MS
  ) {
    return cached.preview;
  }

  if (!force && communityPreviewRequests.has(cacheKey)) {
    return communityPreviewRequests.get(cacheKey);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, 12000);

  const request = getCommunityFeedDetail(feedbackId, {
    signal: controller.signal,
  })
    .then((detail) => {
      const preview = normalizeCommunityPreview(detail);
      communityPreviewCache.set(cacheKey, {
        preview,
        updatedAt: Date.now(),
      });
      return preview;
    })
    .finally(() => {
      globalThis.clearTimeout(timeoutId);
      communityPreviewRequests.delete(cacheKey);
    });

  communityPreviewRequests.set(cacheKey, request);
  return request;
};

export const clearCommunityFeedPreviewCache = (feedbackId) => {
  if (feedbackId) {
    communityPreviewCache.delete(getPreviewCacheKey(feedbackId));
    communityPreviewRequests.delete(getPreviewCacheKey(feedbackId));
    communityDetailCache.delete(getPreviewCacheKey(feedbackId));
    communityDetailRequests.delete(getPreviewCacheKey(feedbackId));
    return;
  }

  communityPreviewCache.clear();
  communityPreviewRequests.clear();
  communityDetailCache.clear();
  communityDetailRequests.clear();
};

export const clearCommunityFeedPageCache = () => {
  communityFeedPageCache.clear();
  communityFeedPageRequests.clear();
};

