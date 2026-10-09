/* App SCC · service worker: recibe los avisos de Firebase con la app cerrada y abre el lead al tocarlos. */
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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

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
