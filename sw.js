/* Paisa Planner service worker: offline app shell + cached fonts and Excel library. */
const VERSION = 'paisa-v21';
const SHELL = ['./', './index.html', './manifest.webmanifest', './config.js', './privacy.html', './terms.html', './fonts/manrope-latin.woff2', './fonts/manrope-latin-ext.woff2', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];
// Supabase API, auth and realtime traffic is never cached: it always goes to the network.

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App pages: serve the cached shell instantly, refresh it in the background.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match('./index.html');
      const fresh = fetch(req).then(r => { if (r.ok) cache.put('./index.html', r.clone()); return r; }).catch(() => null);
      return cached || (await fresh) || new Response('Offline', { status: 503 });
    })());
    return;
  }

  // Same-origin files and allowed CDNs: stale-while-revalidate.
  if (url.origin === self.location.origin || RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const fresh = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => null);
      return cached || (await fresh) || new Response('', { status: 504 });
    })());
  }
});

// Scheduled reminders sent by the send-reminders function arrive here, even when the app is closed.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Paisa Planner', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Paisa Planner', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    tag: d.tag || 'paisa', renotify: true, data: { url: d.url || './#home' }
  }));
});

// Tapping a reminder opens (or focuses) the app on the Bills screen.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './#bills', self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.focus(); if ('navigate' in c) c.navigate(target); return; } }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
