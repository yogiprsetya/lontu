export const OFFLINE_CACHE_VERSION = 'lontu-offline-v1';

export const OFFLINE_STORAGE_KEY = `lontu:${OFFLINE_CACHE_VERSION}:swr-cache`;

export const OFFLINE_ERROR_MESSAGE = 'You are offline. Connect to the internet to save changes.';

const CACHEABLE_API_PATHS = ['/api/expenses', '/api/categories', '/api/budgets', '/api/recurring'];

export const isMutationMethod = (method?: string | null): boolean => {
  if (!method) {
    return false;
  }

  const normalized = method.toUpperCase();

  return normalized === 'POST' || normalized === 'PATCH' || normalized === 'PUT' || normalized === 'DELETE';
};

export const isCacheableApiRequest = (url: string, method = 'GET'): boolean => {
  if (method.toUpperCase() !== 'GET') {
    return false;
  }

  if (url.includes('/api/auth')) {
    return false;
  }

  return CACHEABLE_API_PATHS.some((path) => url.includes(path));
};

export const clearOfflineCache = async (): Promise<void> => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (private mode, quota, SSR).
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();

      await Promise.all(keys.filter((key) => key.includes('lontu-offline')).map((key) => caches.delete(key)));
    }
  } catch {
    // Ignore cache errors outside the browser.
  }

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_OFFLINE_CACHE' });
    }
  } catch {
    // Ignore messaging errors.
  }
};
