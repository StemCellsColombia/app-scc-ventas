/* App SCC · service worker: recibe los avisos de Firebase con la app cerrada, abre el lead al tocarlos
   y (desde el 14-oct) guarda la app en el celular para que abra rápido y siempre en su última versión.
   Reglas de caché:
   - La página (index.html) va SIEMPRE primero a la red; la copia guardada solo se usa sin internet.
     Así un celular nunca queda atrapado en una versión vieja.
   - Íconos y manifest: copia guardada al instante y se refresca por detrás.
   - Nada de otros dominios (Firebase, Apps Script, Google Fonts) pasa por aquí.
   Para forzar que todos los celulares tomen una versión nueva: subir VERSION. */
var VERSION = 'scc-app-2026-10-14a';
var BASICOS = ['./', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png', 'icono-maskable-512.png', 'apple-touch-icon.png', 'insignia-96.png'];

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCmFFYhNoPDI2YSrafSf_yTWcRQDJlfPYY',
  authDomain: 'app-scc-ventas.firebaseapp.com',
  projectId: 'app-scc-ventas',
  storageBucket: 'app-scc-ventas.firebasestorage.app',
  messagingSenderId: '513850572751',
  appId: '1:513850572751:web:f182d9fabe85355cafdcba'
});
const messaging = firebase.messaging();
// Los avisos traen "notification": Firebase los muestra solo. Aquí no se duplica nada.
messaging.onBackgroundMessage(() => {});

self.addEventListener('install', (event) => {
  // allSettled: si un archivo falla (404, red), la instalación NO se cae; solo queda sin esa copia.
  event.waitUntil(caches.open(VERSION)
    .then((c) => Promise.allSettled(BASICOS.map((u) => c.add(new Request(u, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.indexOf('scc-app-') === 0 && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  // La página: red primero (sin caché HTTP); sin red, la última copia buena.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok) { const c = await caches.open(VERSION); c.put('./', res.clone()); }
        return res;
      } catch (e) {
        const guardada = await caches.match('./', { cacheName: VERSION }) || await caches.match('./');
        return guardada || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0F2A47;color:#fff;font:18px system-ui;text-align:center;padding:24px">Sin internet. Abre la App SCC de nuevo cuando tengas señal.</body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // Íconos y manifest: al instante desde la copia, y se refresca por detrás.
  if (/\.(png|webmanifest)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const c = await caches.open(VERSION);
      const guardada = await c.match(req);
      const red = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => guardada);
      return guardada || red;
    })());
  }
});

self.addEventListener('notificationclick', (event) => {
  const link = (event.notification.data && (event.notification.data.link || (event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.link))) || './';
  event.notification.close();
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.indexOf(self.registration.scope) === 0) { await c.focus(); c.postMessage({ tipo: 'abrir', link }); return; }
    }
    await clients.openWindow(link);
  })());
});
