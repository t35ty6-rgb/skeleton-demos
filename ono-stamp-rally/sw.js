/**
 * Fukutetsu Rally · Service Worker
 * - アプリシェル (HTML/CSS/JS/画像) は cache-first、更新は バックグラウンド
 * - 動的リソース (Firebase/LINE) は network-first
 * - オフライン時は cached index.html でナビゲート成立
 */
"use strict";
const CACHE = "fukutetsu-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./photos/00_bg_ono_castle.webp",
  "./photos/00_bg_ono_castle.webp",
  "./photos/00_hero_illustration.webp",
  "./photos/01_echizen_washi.webp",
  "./photos/02_sundome_fukui.webp",
  "./photos/03_takefu_chuo_park.webp",
  "./photos/04_nishiyama_park.webp",
  "./photos/05_megane_museum.webp",
  "./photos/06_fukui_castle.webp",
  "./photos/07_yokokan_garden.webp",
  "./photos/08_asuwa_shrine.webp",
  "./photos/09_fukui_dinosaur.webp",
  "./photos/10_tawaramachi.webp",
  "./photos/icon-192.png",
  "./photos/icon-512.png",
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(e => {
      console.warn("[sw] some assets failed to precache:", e);
    }))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // Firestore / LINE / Firebase / Google Fonts: network-first with cache fallback
  if (!sameOrigin){
    event.respondWith(
      fetch(req).then(res => {
        // opportunistically cache successful GET
        if (res.ok && (url.hostname.includes("gstatic.com") || url.hostname.includes("fonts.googleapis"))){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Same-origin: cache-first for assets, network-first for navigations
  if (req.mode === "navigate"){
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", clone)).catch(()=>{});
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached){
        // stale-while-revalidate
        fetch(req).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(req, res)).catch(()=>{});
        }).catch(()=>{});
        return cached;
      }
      return fetch(req).then(res => {
        if (res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
        }
        return res;
      }).catch(() => new Response("offline", { status: 503 }));
    })
  );
});

// message from client (e.g. skip waiting)
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
