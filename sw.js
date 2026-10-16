// Offline වැඩ කරන්න app එකේ files cache කරනවා.
// Internet තියෙනවා නම් අලුත්ම එක ගන්නවා (updates ඉක්මනට එන්න), නැත්නම් / හෙමින් නම් cache එකෙන්.
const CACHE = 'sandadiya-v5';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/main.js', 'js/render.js', 'js/markup.js', 'js/state.js', 'js/idb.js',
  'js/video.js', 'js/particles.js', 'js/audio.js', 'js/stickers.js', 'js/vendor/mp4-muxer.mjs',
  'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/AbhayaLibre-Regular.ttf', 'fonts/AbhayaLibre-Bold.ttf', 'fonts/AbhayaLibre-ExtraBold.ttf',
  'fonts/NotoSansSinhala.ttf', 'fonts/NotoSerifSinhala.ttf', 'fonts/GemunuLibre.ttf', 'fonts/Yaldevi.ttf',
  'fonts/Maname.ttf',
  'fonts/StickNoBills.ttf',
  'fonts/AtlasChirani.ttf',
  'fonts/Kaputa.ttf',
  'fonts/HindColombo-Regular.otf',
  'fonts/HindColombo-SemiBold.otf',
  'fonts/HindColombo-Bold.otf',
  'fonts/GreatVibes.ttf',
  'fonts/DancingScript.ttf',
  'fonts/Pacifico.ttf',
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
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
      const res = await Promise.race([fetch(e.request, { cache: 'no-cache' }), timeout]);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch {
      return (await cache.match(e.request, { ignoreSearch: true })) || Response.error();
    }
  })());
});
