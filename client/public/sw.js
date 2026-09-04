const CACHE_NAME = "black-gold-spices-v3";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/product-images/hero-spices.svg"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(()=>{}))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Network-first for application/API pages so the customer sees the manager's latest changes.
  if (event.request.mode === "navigate" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/trpc/")) {
    event.respondWith(fetch(event.request).then(response => response).catch(() => caches.match("/").then(r => r || new Response("Offline", {status: 503}))));
    return;
  }
  // Cache-first for static assets, with background refresh.
  event.respondWith(caches.match(event.request).then(cached => {
    const network = fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => cached);
    return cached || network;
  }));
});
