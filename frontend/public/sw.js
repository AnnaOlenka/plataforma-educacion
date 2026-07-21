// Service Worker mínimo: cachea el app-shell para que la SPA cargue offline.
// La descarga de contenido de lecciones se maneja aparte (ver src/utils/offlineLecciones.js).
const SHELL_CACHE = 'edupath-shell-v1'
const SHELL_URLS = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (request.mode !== 'navigate') return

  event.respondWith(
    fetch(request).catch(() => caches.match('/index.html'))
  )
})
