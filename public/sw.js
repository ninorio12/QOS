// Service worker minimal — rend le Data OS installable en PWA (Android exige un SW avec un
// handler 'fetch'). Passthrough natif : on n'intercepte rien (pas de cache des réponses).
// + à l'activation, on PURGE tout cache résiduel d'un éventuel ancien SW (sinon il pourrait
// servir de vieux fichiers et masquer les déploiements).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch (e) { /* noop */ }
  await self.clients.claim()
})()))
self.addEventListener('fetch', () => { /* passthrough réseau */ })
