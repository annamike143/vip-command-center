// --- Service Worker for VIP Command Center ---
const CACHE_NAME = 'vip-command-center-v1';
const STATIC_CACHE = 'admin-static-v1';
const DYNAMIC_CACHE = 'admin-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
];

// Cache strategies for admin panel
const CACHE_STRATEGIES = {
  static: ['/_next/static/', '/static/', '/icons/'],
  dynamic: ['/api/', '/admin/'],
  networkFirst: ['/api/analytics', '/api/errors', '/api/admin'],
  cacheFirst: ['/images/', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  staleWhileRevalidate: ['/', '/dashboard', '/admin']
};

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Admin SW: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('Admin SW: Failed to cache static files', error);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Admin SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  self.clients.claim();
});

// Fetch event with admin-specific handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(handleAdminRequest(request));
});

async function handleAdminRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // For admin panel, prioritize fresh data
    if (pathname.includes('/api/') || pathname.includes('/admin/')) {
      return await networkFirstAdmin(request);
    }

    // Cache static assets
    if (shouldUseCacheFirst(pathname)) {
      return await cacheFirst(request);
    }

    // Default: Network first for admin reliability
    return await networkFirstAdmin(request);

  } catch (error) {
    console.error('Admin SW: Request failed', error);
    return await getAdminOfflineFallback(request);
  }
}

// Network First for Admin (prioritizes fresh data)
async function networkFirstAdmin(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      // Only cache successful responses
      if (networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    // For admin panel, only return cached data for non-critical requests
    if (!request.url.includes('/api/')) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    return await getAdminOfflineFallback(request);
  }
}

// Cache First for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return await getAdminOfflineFallback(request);
  }
}

// Strategy determination
function shouldUseCacheFirst(pathname) {
  return CACHE_STRATEGIES.cacheFirst.some(pattern => pathname.includes(pattern));
}

// Admin-specific offline fallback
async function getAdminOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (request.destination === 'document') {
    const offlinePage = await caches.match('/offline');
    return offlinePage || new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Admin Offline</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Admin Panel Offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="location.reload()">Retry</button>
        </body>
      </html>
    `, { 
      status: 503, 
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return new Response('Admin service unavailable', { 
    status: 503, 
    statusText: 'Service Unavailable' 
  });
}

// Background sync for admin actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'admin-background-sync') {
    event.waitUntil(handleAdminBackgroundSync());
  }
});

async function handleAdminBackgroundSync() {
  try {
    // Handle offline admin analytics
    const offlineEvents = await getOfflineAdminAnalytics();
    if (offlineEvents.length > 0) {
      for (const event of offlineEvents) {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
      }
      await clearOfflineAdminAnalytics();
    }
  } catch (error) {
    console.error('Admin background sync failed:', error);
  }
}

async function getOfflineAdminAnalytics() {
  try {
    const cache = await caches.open('admin-offline-data');
    const response = await cache.match('/offline-admin-analytics');
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to get offline admin analytics:', error);
  }
  return [];
}

async function clearOfflineAdminAnalytics() {
  try {
    const cache = await caches.open('admin-offline-data');
    await cache.delete('/offline-admin-analytics');
  } catch (error) {
    console.error('Failed to clear offline admin analytics:', error);
  }
}

// Admin notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/admin-icon-192x192.png',
      badge: '/admin-icon-72x72.png',
      data: data.data,
      requireInteraction: true,
      tag: 'admin-notification',
      actions: [
        {
          action: 'view',
          title: 'View in Admin',
          icon: '/icon-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icon-close.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Admin notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/admin')
    );
  }
});

console.log('Service Worker: VIP Command Center SW loaded');
