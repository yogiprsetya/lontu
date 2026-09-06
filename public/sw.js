/* Lontu offline service worker: cache latest authenticated reads for offline viewing.
 * Versioned cache name invalidates stale data on deploy. Offline writes stay out
 * of scope: mutating requests are never cached and fail clearly in the UI.
 */

const OFFLINE_CACHE_VERSION = 'lontu-offline-v1';
const STATIC_CACHE = `${OFFLINE_CACHE_VERSION}-static`;
const API_CACHE = `${OFFLINE_CACHE_VERSION}-api`;

const CACHEABLE_API_PATHS = ['/api/expenses', '/api/categories', '/api/budgets', '/api/recurring'];

const isCacheableApiRequest = (url, method = 'GET') => {
  if (method !== 'GET') {
    return false;
  }

  if (url.includes('/api/auth')) {
    return false;
  }

  return CACHEABLE_API_PATHS.some((path) => url.includes(path));
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key.startsWith('lontu-offline-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_OFFLINE_CACHE') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();

        await Promise.all(keys.filter((key) => key.startsWith('lontu-offline-')).map((key) => caches.delete(key)));
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (isCacheableApiRequest(url.pathname + url.search, request.method)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);

        try {
          const response = await fetch(request);

          if (response.ok) {
            cache.put(request, response.clone());
          }

          return response;
        } catch {
          const cached = await cache.match(request);

          if (cached) {
            return cached;
          }

          return new Response(JSON.stringify({ error: { message: 'You are offline' } }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );

    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(STATIC_CACHE);

          cache.put(request, response.clone());

          return response;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(request);

          return cached ?? Response.error();
        }
      })()
    );
  }
});
