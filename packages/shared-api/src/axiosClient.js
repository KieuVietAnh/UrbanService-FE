import axios from 'axios';

let apiBaseUrl = '';

/**
 * Set the base URL for API requests.
 * Call this once during app initialization with the appropriate environment variable.
 */
export const setApiBaseUrl = (baseUrl) => {
  apiBaseUrl = baseUrl || '';
  axiosClient.defaults.baseURL = apiBaseUrl;
};

const AUTH_TOKEN_KEY = 'urbanmind_auth_token';

// Default token storage using localStorage (works for web)
let getToken = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token');
  }
  return null;
};

let setToken = (token) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

let removeToken = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

/**
 * Allows the consuming app to override the token storage mechanism.
 * Useful for React Native where AsyncStorage should be used instead of localStorage.
 */
export const setTokenStorage = (getTokenFn, setTokenFn, removeTokenFn) => {
  if (typeof getTokenFn === 'function') {
    getToken = getTokenFn;
  }
  if (typeof setTokenFn === 'function') {
    setToken = setTokenFn;
  }
  if (typeof removeTokenFn === 'function') {
    removeToken = removeTokenFn;
  }
};

export const setAuthToken = async (token) => {
  await setToken(token);
};

export const removeAuthToken = async () => {
  await removeToken();
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
  (error) => {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error?.response?.data;
    const message =
      data?.msg ||
      data?.message ||
      data?.error ||
      error?.message ||
      'Unknown API error';
    return Promise.reject(new Error(message));
  }
);