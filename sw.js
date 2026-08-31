/* Life Orbits service worker — offline app shell.
 * Strategy: network-first for page navigations (so deployed updates arrive
 * promptly), cache-first for everything else. Bump CACHE on breaking changes.
 */
const CACHE = 'life-orbits-v1'
const ASSETS = ['./', './index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  // Navigations: try the network (fresh deploys), fall back to cached shell
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html'))
    )
    return
  }

  // Everything else (fonts, etc.): cache-first, populate on the fly
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, copy))
        }
        return res
      })
    )
  )
})
