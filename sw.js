/**
 * sw.js  v2  —  Habit Tracker Service Worker
 * ─────────────────────────────────────────────
 * Handles: offline cache, push notifications,
 *          notification actions (snooze/open/dismiss)
 */
const CACHE   = 'ht-v2';
const OFFLINE = [
  './', './index.html', './analytics.html',
  './auth.html', './profile.html', './notifications.html',
  './theme.js',  './pwa.js', './manifest.json',
];

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE).catch(() => {})));
});

// ── Activate: clear old caches ─────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for app shell, network for Firebase ─
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('fonts.googleapis.com')) return; // pass through

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ── Push notifications ─────────────────────────────────────
self.addEventListener('push', e => {
  let d = { title:'⏰ Habit Reminder', body:'Time to check your habits!', tag:'habit' };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body:     d.body,
      tag:      d.tag,
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: d.url || '/index.html' },
      actions: [
        { action:'open',   title:'✅ Open' },
        { action:'snooze', title:'⏰ +30min' },
        { action:'dismiss',title:'✕ Dismiss' },
      ],
    })
  );
});

// ── Notification click ─────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  if (e.action === 'snooze') {
    e.waitUntil(new Promise(res => {
      setTimeout(() => {
        self.registration.showNotification('⏰ Snoozed Reminder', {
          body: e.notification.body, tag: 'habit-snooze',
          data: e.notification.data,
        });
        res();
      }, 30 * 60 * 1000);
    }));
    return;
  }
  const url = e.notification.data?.url || '/index.html';
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(ws => {
      for (const w of ws) {
        if (w.url.includes('index.html') && 'focus' in w) return w.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── Message: fire scheduled test notification ──────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_TEST') {
    const delay = (e.data.delaySeconds || 5) * 1000;
    setTimeout(() => {
      self.registration.showNotification(e.data.title || '🔥 Habit Reminder', {
        body:    e.data.body || 'Time to check in!',
        tag:     'habit-test',
        vibrate: [200, 100, 200],
      });
    }, delay);
  }
});
