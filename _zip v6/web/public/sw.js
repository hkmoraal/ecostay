// Minimale, veilige service worker voor "toevoegen aan beginscherm".
// Bewust NETWORK-FIRST: de verse versie wint altijd; de cache is alleen een
// vangnet als er geen internet is. Zo zie je nooit per ongeluk een oude versie.

const CACHE = 'ecostay-v1';

// Activeer nieuwe versies meteen (geen wachtende oude service worker).
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Alleen GET-verzoeken; laat API-calls en andere methodes met rust.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // API-verzoeken nooit cachen — die moeten altijd live zijn.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Verse response opslaan als vangnet (alleen gelukte, same-origin).
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        // Geen internet? Val terug op de cache; anders de startpagina.
        caches.match(request).then((cached) => cached || caches.match('/'))
      )
  );
});
