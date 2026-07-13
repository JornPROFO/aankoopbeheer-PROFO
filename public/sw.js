const CACHE_NAME = 'profo-aankoopbeheer-v2';
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/assets/profo-logo.png',
  '/assets/icons/aankoopbeheer-icon-192.png',
  '/assets/icons/aankoopbeheer-icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }

        return response;
      });
    }),
  );
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {
      title: 'PROFO Aankoopbeheer',
      body: event.data?.text() ?? 'Er is een nieuwe melding in Aankoopbeheer.',
    };
  }

  const title = payload.title || 'PROFO Aankoopbeheer';
  const options = {
    body: payload.body || 'Er is een nieuwe melding in Aankoopbeheer.',
    icon: '/assets/icons/aankoopbeheer-icon-192.png',
    badge: '/assets/icons/aankoopbeheer-icon-192.png',
    tag: payload.tag || `aankoop-melding-${payload.notificationId ?? Date.now()}`,
    renotify: true,
    data: {
      url: payload.url || '/#start',
      notificationId: payload.notificationId ?? null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/#start', self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existingClient = clientList.find((client) => client.url.startsWith(self.location.origin));

        if (existingClient) {
          existingClient.navigate(targetUrl);
          return existingClient.focus();
        }

        return clients.openWindow(targetUrl);
      }),
  );
});
