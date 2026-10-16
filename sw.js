// Offline වැඩ කරන්න app එකේ files cache කරනවා.
// Cache එකෙන් ඉක්මනට දීලා, පස්සෙන් අලුත් version එක download කරගන්නවා (stale-while-revalidate).
const CACHE = 'sandadiya-v1';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/main.js', 'js/render.js', 'js/markup.js', 'js/state.js', 'js/idb.js',
  'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/AbhayaLibre-Regular.ttf', 'fonts/AbhayaLibre-Bold.ttf', 'fonts/AbhayaLibre-ExtraBold.ttf',
  'fonts/NotoSansSinhala.ttf', 'fonts/NotoSerifSinhala.ttf', 'fonts/GemunuLibre.ttf', 'fonts/Yaldevi.ttf',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
