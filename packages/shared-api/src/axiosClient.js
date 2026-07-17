import axios from 'axios';

let apiBaseUrl = '';
let unauthorizedHandler = null;
let refreshPromise = null;
let unauthorizedPromise = null;

const AUTH_TOKEN_KEY = 'urbanmind_auth_token';
const LEGACY_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'urbanmind_refresh_token';
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';

const AUTH_REQUEST_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google-login',
  '/api/auth/refresh-token',
];

const getPayload = (value) => value?.data ?? value;

const extractAccessToken = (value) => {
  const payload = getPayload(value);
  return (
    value?.token ||
    value?.accessToken ||
    value?.authToken ||
    payload?.token ||
    payload?.accessToken ||
    payload?.authToken ||
    payload?.data?.token ||
    payload?.data?.accessToken ||
    payload?.data?.authToken ||
    null
  );
};

const extractRefreshToken = (value) => {
  const payload = getPayload(value);
  return (
    value?.refreshToken ||
    payload?.refreshToken ||
    payload?.data?.refreshToken ||
    null
  );
};

const buildRefreshUrl = () => {
  const normalizedBaseUrl = String(apiBaseUrl || '').replace(/\/$/, '');
  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/api/auth/refresh-token`
    : '/api/auth/refresh-token';
};

const shouldExpireSession = (error) => {
  const status = error?.response?.status;
  return (
    error?.code === 'REFRESH_TOKEN_MISSING' ||
    error?.code === 'INVALID_REFRESH_RESPONSE' ||
    status === 400 ||
    status === 401 ||
    status === 403
  );
};

const createApiError = (error, fallbackMessage) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message =
    data?.msg ||
    data?.message ||
    data?.error ||
    fallbackMessage ||
    (status === 401 ? 'Phiên đăng nhập đã hết hạn.' : error?.message) ||
    'Unknown API error';

  const apiError = new Error(message);
  apiError.status = status;
  apiError.code = error?.code;
  apiError.response = error?.response;
  apiError.cause = error;
  return apiError;
};

/**
 * Set the base URL for API requests.
 * Call this once during app initialization with the appropriate environment variable.
 */
export const setApiBaseUrl = (baseUrl) => {
  apiBaseUrl = baseUrl || '';
  axiosClient.defaults.baseURL = apiBaseUrl;
};

// Default token storage using localStorage (works for web).
let getToken = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  }
  return null;
};

let setToken = (token) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  }
};

let removeToken = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
};

let getRefreshToken = () => {
  if (typeof localStorage !== 'undefined') {
    return (
      localStorage.getItem(REFRESH_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY)
    );
  }
  return null;
};

let setRefreshToken = (token) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_REFRESH_TOKEN_KEY, token);
  }
};

let removeRefreshToken = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  }
};

/**
 * Allows the consuming app to override access-token storage.
 * Existing consumers can continue passing the original three functions.
 */
export const setTokenStorage = (getTokenFn, setTokenFn, removeTokenFn) => {
  if (typeof getTokenFn === 'function') getToken = getTokenFn;
  if (typeof setTokenFn === 'function') setToken = setTokenFn;
  if (typeof removeTokenFn === 'function') removeToken = removeTokenFn;
};

/**
 * Allows React Native or another consumer to override refresh-token storage.
 */
export const setRefreshTokenStorage = (
  getRefreshTokenFn,
  setRefreshTokenFn,
  removeRefreshTokenFn,
) => {
  if (typeof getRefreshTokenFn === 'function') getRefreshToken = getRefreshTokenFn;
  if (typeof setRefreshTokenFn === 'function') setRefreshToken = setRefreshTokenFn;
  if (typeof removeRefreshTokenFn === 'function') {
    removeRefreshToken = removeRefreshTokenFn;
  }
};

export const setAuthToken = async (token) => {
  await setToken(token);
};

export const removeAuthToken = async () => {
  await removeToken();
};

export const setAuthRefreshToken = async (token) => {
  await setRefreshToken(token);
};

export const removeAuthRefreshToken = async () => {
  await removeRefreshToken();
};

export const clearAuthTokens = async () => {
  await Promise.all([removeToken(), removeRefreshToken()]);
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
};

/**
 * Refreshes the access token once and shares that promise between concurrent 401 responses.
 * The backend rotates refresh tokens, so the returned refresh token is persisted immediately.
 */
export const refreshAuthSession = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const currentRefreshToken = await getRefreshToken();
    if (!currentRefreshToken) {
      const missingTokenError = new Error('Không tìm thấy refresh token.');
      missingTokenError.code = 'REFRESH_TOKEN_MISSING';
      throw missingTokenError;
    }

    const response = await axios.post(
      buildRefreshUrl(),
      { refreshToken: currentRefreshToken },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const accessToken = extractAccessToken(response);
    const rotatedRefreshToken = extractRefreshToken(response);

    if (!accessToken) {
      const invalidResponseError = new Error(
        'Máy chủ không trả về access token mới.',
      );
      invalidResponseError.code = 'INVALID_REFRESH_RESPONSE';
      throw invalidResponseError;
    }

    await setToken(accessToken);

    if (rotatedRefreshToken) {
      await setRefreshToken(rotatedRefreshToken);
    }

    return {
      accessToken,
      refreshToken: rotatedRefreshToken || currentRefreshToken,
      data: response?.data,
    };
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const notifyUnauthorized = async (error) => {
  if (unauthorizedPromise) return unauthorizedPromise;

  unauthorizedPromise = (async () => {
    await clearAuthTokens();
    await unauthorizedHandler?.(error);
  })().finally(() => {
    setTimeout(() => {
      unauthorizedPromise = null;
    }, 500);
  });

  return unauthorizedPromise;
};

export const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (config.headers) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || '');
    const isAuthRequest = AUTH_REQUEST_PATHS.some((path) => requestUrl.includes(path));

    if (status === 401 && !isAuthRequest && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { accessToken } = await refreshAuthSession();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        if (shouldExpireSession(refreshError)) {
          await notifyUnauthorized(refreshError);
          return Promise.reject(
            createApiError(refreshError, 'Phiên đăng nhập đã hết hạn.'),
          );
        }

        return Promise.reject(
          createApiError(
            refreshError,
            'Không thể gia hạn phiên đăng nhập. Vui lòng kiểm tra kết nối và thử lại.',
          ),
        );
      }
    }

    if (status === 401 && !isAuthRequest && originalRequest?._retry) {
      await notifyUnauthorized(error);
    }

    return Promise.reject(createApiError(error));
  },
);
