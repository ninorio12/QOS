// Service worker minimal — rend le Data OS installable en PWA (Android exige un SW avec
// un handler 'fetch'). Passthrough natif : on n'intercepte rien (pas de cache des réponses
// authentifiées Clerk/Convex), la simple présence du handler suffit au critère d'installabilité.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* passthrough réseau */ })
