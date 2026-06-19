/**
 * Alice mieux 着物レンタル LP Service Worker
 * - 静的アセットを stale-while-revalidate でキャッシュ
 * - オフラインでも 一度見たページは表示可能
 * - 動画は容量大なので除外
 */
const CACHE_NAME = 'alice-mieux-v1';
const STATIC_ASSETS = [
  '/skeleton-demos/alice-mieux-kimono/',
  '/skeleton-demos/alice-mieux-kimono/index.html',
  '/skeleton-demos/alice-mieux-kimono/seijin.html',
  '/skeleton-demos/alice-mieux-kimono/404.html',
  '/skeleton-demos/alice-mieux-kimono/assets/alice/concept-main.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  /* 動画 (mp4) はキャッシュしない (容量) */
  if(url.pathname.endsWith('.mp4')) return;
  /* admin はキャッシュしない (リアルタイム性重視) */
  if(url.pathname.includes('admin.html')) return;
  /* GET のみ */
  if(e.request.method !== 'GET') return;
  /* クロスオリジン (Google Fonts等) はネット優先 */
  if(url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        /* 成功時のみキャッシュ更新 */
        if(resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
