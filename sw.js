/**
 * Service Worker for U.S. Flag Status Monitor
 * @fileoverview Provides offline functionality, caching, and background sync
 */

const CACHE_NAME = 'flag-status-v1.0.0';
const STATIC_CACHE_NAME = 'flag-status-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'flag-status-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/css/styles.css',
  '/src/js/main.js',
  '/src/js/FlagStatusApp.js',
  '/src/js/components/FlagDisplay.js',
  '/src/js/components/NotificationManager.js',
  '/src/js/utils/api.js',
  '/src/js/utils/storage.js',
  '/src/js/utils/constants.js',
  '/manifest.json',
  '/src/icons/icon-192x192.png',
  '/src/icons/icon-512x512.png'
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
  '/api/status',
  '/api/history'
];

// Maximum age for cached responses (24 hours)
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('flag-status-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch event - handle network requests with caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

/**
 * Background sync for flag status updates
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'flag-status-sync') {
    event.waitUntil(syncFlagStatus());
  }
});

/**
 * Push notification handler
 */
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Flag status has been updated',
      icon: '/src/icons/icon-192x192.png',
      badge: '/src/icons/icon-96x96.png',
      tag: 'flag-status-update',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Status',
          icon: '/src/icons/icon-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      data: {
        url: '/',
        timestamp: Date.now()
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'U.S. Flag Status Update',
        options
      )
    );
  }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === self.location.origin + '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if no existing window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
      case 'SYNC_FLAG_STATUS':
        event.waitUntil(syncFlagStatus());
        break;
    }
  }
});

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.startsWith('/src/') ||
         url.pathname === '/manifest.json';
}

/**
 * Check if request is for an API endpoint
 */
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
         API_ENDPOINTS.some(endpoint => url.pathname === endpoint);
}

/**
 * Handle static asset requests (cache-first strategy)
 */
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] Fetching and caching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling static asset:', error);
    
    // Return offline fallback for HTML requests
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

/**
 * Handle API requests (network-first with cache fallback)
 */
async function handleAPIRequest(request) {
  try {
    console.log('[SW] Fetching API:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const responseToCache = networkResponse.clone();
      
      // Add timestamp to cached response
      const responseWithTimestamp = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const age = Date.now() - parseInt(cachedAt || '0');
      
      if (age < CACHE_MAX_AGE) {
        console.log('[SW] Serving cached API response:', request.url);
        return cachedResponse;
      } else {
        console.log('[SW] Cached response too old, removing:', request.url);
        cache.delete(request);
      }
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Unable to fetch data while offline',
        cached: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
          'sw-offline': 'true'
        }
      }
    );
  }
}

/**
 * Handle dynamic requests (network-first with cache fallback)
 */
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      return staticCache.match('/index.html');
    }
    
    throw error;
  }
}

/**
 * Sync flag status in background
 */
async function syncFlagStatus() {
  try {
    console.log('[SW] Syncing flag status...');
    
    const response = await fetch('/api/status');
    if (response.ok) {
      const data = await response.json();
      
      // Store in cache
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put('/api/status', response.clone());
      
      // Notify all clients of update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'FLAG_STATUS_UPDATE',
          data: data
        });
      });
      
      console.log('[SW] Flag status synced successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to sync flag status:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName.startsWith('flag-status-')) {
        console.log('[SW] Clearing cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

/**
 * Utility function to check if response is fresh
 */
function isResponseFresh(response, maxAge = CACHE_MAX_AGE) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;
  
  const age = Date.now() - parseInt(cachedAt);
  return age < maxAge;
}

/**
 * Utility function to create offline response
 */
function createOfflineResponse(message = 'You are currently offline') {
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: message,
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'sw-offline': 'true'
      }
    }
  );
}

console.log('[SW] Service worker loaded successfully'); 