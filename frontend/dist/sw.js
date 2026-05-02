const CACHE_NAME = 'expense-tracker-v1';
const RUNTIME_CACHE = 'expense-tracker-runtime-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.add('/index.html').catch((err) => {
        console.warn('Failed to cache index.html:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all caches except current ones
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          message: 'Service Worker updated, refresh page for latest version'
        });
      });
    })
  );
  self.clients.claim();
});

// Fetch event: network-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API calls: network-first with cache fallback
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return (
              cachedResponse ||
              new Response('Offline - API unavailable', { status: 503 })
            );
          });
        })
    );
    return;
  }

  // HTML files: network-first (always fetch latest)
  if (request.destination === 'document' || request.destination === '') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Other assets (JS, CSS, images): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const clonedResponse = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, clonedResponse);
        });
        return response;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Handle background sync for offline expense submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(syncExpenses());
  }
});

async function syncExpenses() {
  try {
    const pendingExpenses = JSON.parse(
      localStorage.getItem('pendingExpenses') || '[]'
    );

    for (const expense of pendingExpenses) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(expense),
        });

        if (response.ok) {
          const updatedPending = pendingExpenses.filter(
            (e) => e.id !== expense.id
          );
          localStorage.setItem(
            'pendingExpenses',
            JSON.stringify(updatedPending)
          );
        }
      } catch (error) {
        console.error('Failed to sync expense:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
