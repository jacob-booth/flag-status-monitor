/**
 * Service Worker for U.S. Flag Status Monitor
 * @fileoverview Offline support via runtime caching. Deliberately avoids a
 *   hardcoded install-time precache list — Vite's production build emits
 *   content-hashed filenames, so a static list would either go stale or
 *   fail the install step the moment a hash changes. Instead, every asset
 *   is cached the first time it is requested ("cache as you go").
 */

const VERSION = 'v4';
const STATIC_CACHE = `flag-status-static-${VERSION}`;
const API_CACHE = `flag-status-api-${VERSION}`;
const API_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith('flag-status-') && name !== STATIC_CACHE && name !== API_CACHE
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
  } else if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirstWithExpiry(request, API_CACHE, API_CACHE_MAX_AGE));
  } else if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
  // Cross-origin requests (e.g. HalfStaff.org) are left to the network.
});

/** Always check for the latest app shell; use the cached page only offline. */
async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match('./index.html')) ||
      new Response('Offline and the app shell is not cached.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      })
    );
  }
}

/** Cache-first for same-origin static assets (HTML/CSS/JS/icons). */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (networkError) {
    if (request.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    throw networkError;
  }
}

/** Network-first for the JSON API data, with a time-boxed cache fallback when offline. */
async function networkFirstWithExpiry(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const stamped = new Response(await response.clone().blob(), {
        status: response.status,
        headers
      });
      cache.put(request, stamped);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get('sw-cached-at') || 0);
      if (Date.now() - cachedAt < maxAge) return cached;
    }

    return new Response(
      JSON.stringify({ error: true, message: 'Offline and no cached data is available.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
