const CACHE_KEY = 'urbanmind:coordinator-directory:v1';

const EMPTY_CACHE = {
  items: [],
  search: '',
  areaId: '',
  categoryId: '',
  includeInactive: false,
  scrollY: 0,
  hasLoaded: false,
  updatedAt: 0,
};

let memoryCache = { ...EMPTY_CACHE };

const canUseSessionStorage = () => typeof window !== 'undefined' && Boolean(window.sessionStorage);

const readSessionCache = () => {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getCoordinatorDirectoryCache = () => {
  const stored = readSessionCache();
  if (stored && typeof stored === 'object') {
    memoryCache = { ...EMPTY_CACHE, ...stored };
  }
  return { ...memoryCache, items: Array.isArray(memoryCache.items) ? memoryCache.items : [] };
};

export const setCoordinatorDirectoryCache = (patch) => {
  memoryCache = {
    ...memoryCache,
    ...patch,
    items: Array.isArray(patch?.items) ? patch.items : memoryCache.items,
  };
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    } catch {
      // Ignore storage quota/privacy mode failures; memory cache still works.
    }
  }
  return memoryCache;
};

export const clearCoordinatorDirectoryCache = () => {
  memoryCache = { ...EMPTY_CACHE };
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
};
