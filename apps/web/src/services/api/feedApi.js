const getBaseUrl = () => {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
  return raw.replace(/\/$/, '');
};

const getAuthToken = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('urbanmind_auth_token') || localStorage.getItem('token');
};

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

export const getCommunityFeed = async (params = {}) => {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/user/feedbacks/feed`;
  const url = new URL(endpoint);
  Object.entries(normalizeFeedParams(params)).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const token = getAuthToken();
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  console.debug('getCommunityFeed request', { url: url.toString(), params, headers: Object.keys(headers) });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  console.debug('getCommunityFeed response', {
    url: url.toString(),
    status: response.status,
    statusText: response.statusText,
    contentType,
  });

  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  console.debug('getCommunityFeed payload', payload);

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
    if (Array.isArray(value)) {
      return {
        items: value,
        pageNumber: 1,
        pageSize: value.length,
        totalItems: value.length,
        totalPages: 1,
      };
    }
    if (!value || typeof value !== 'object') {
      return {
        items: [],
        pageNumber: 1,
        pageSize: 0,
        totalItems: 0,
        totalPages: 1,
      };
    }

    const items = Array.isArray(value.items)
      ? value.items
      : Array.isArray(value.data)
        ? value.data
        : Array.isArray(value.content)
          ? value.content
          : Array.isArray(value.feedbacks)
            ? value.feedbacks
            : Array.isArray(value.results)
              ? value.results
              : [];

    const pageNumber = Number(value.pageNumber ?? value.page ?? 1);
    const totalPages = Number(value.totalPages ?? value.total ?? 1);
    const pageSize = Number(value.pageSize ?? items.length);
    const totalItems = Number(value.totalItems ?? value.totalItems ?? items.length);

    return {
      items,
      pageNumber: Number.isFinite(pageNumber) ? pageNumber : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : items.length,
      totalItems: Number.isFinite(totalItems) ? totalItems : items.length,
      totalPages: Number.isFinite(totalPages) ? totalPages : 1,
    };
  };

  return normalizeFeedPayload(payload);
};

export const getCommunityFeedDetail = async (feedbackId) => {
  if (!feedbackId) {
    throw new Error('Feedback ID is required.');
  }

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

  if (payload?.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload;
};
