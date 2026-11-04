const CACHE="okuno-stamp-2026-11-04-4";
const FILES=["./","index.html","stamp.png","maru.png","lib/pdf.min.js","lib/pdf.worker.min.js","lib/pdf-lib.min.js","manifest.webmanifest","icon-192.png","icon-512.png","icon-180.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url); if(e.request.method!=="GET"||u.origin!==location.origin) return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c));} return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html"))));});
