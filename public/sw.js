/* RAIZIA: incrementar VERSION al cambiar la página sin conexión o los iconos. */
const VERSION = "raizia-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_CACHE = `${VERSION}-offline`;
const OFFLINE_URL = "/sin-conexion";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"];

function publicResponse(response) {
  return response.ok && !response.redirected && response.type !== "opaque"
    && !/private|no-store/i.test(response.headers.get("cache-control") || "")
    && !response.headers.has("set-cookie")
    && !/(?:cookie|authorization|\*)/i.test(response.headers.get("vary") || "");
}

function strategy(request) {
  const url = new URL(request.url);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return "ignore"; }
  if (request.method !== "GET" || url.origin !== self.location.origin
    || /^\/api(?:\/|$)/i.test(path) || /^\/admin/i.test(path)
    || request.headers.has("authorization") || request.headers.has("range")) return "ignore";
  if (path.startsWith("/_next/static/") && !url.search) return "static";
  if (request.mode === "navigate") return "navigation";
  if (PRECACHE.includes(path) && !url.search) return "precache";
  return "ignore";
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    for (const path of PRECACHE) {
      // Sin cookies: solo la página pública de ayuda y sus iconos.
      const response = await fetch(path, { cache: "reload", credentials: "omit" });
      if (!publicResponse(response)) throw new Error("offline-precache-unavailable");
      await cache.put(path, response);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("raizia-") && name !== STATIC_CACHE && name !== OFFLINE_CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function cachedAsset(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (publicResponse(response)) {
    try { await cache.put(request, response.clone()); } catch { /* caché llena: usar la red */ }
  }
  return response;
}

async function navigation(request) {
  // Nunca se guarda una navegación: puede contener información de la persona.
  try { return await fetch(request); }
  catch {
    const cache = await caches.open(OFFLINE_CACHE);
    return await cache.match(OFFLINE_URL) || new Response("No hay internet. El asistente necesita conexión.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", event => {
  const action = strategy(event.request);
  if (action === "static") event.respondWith(cachedAsset(event.request, STATIC_CACHE));
  else if (action === "precache") event.respondWith(cachedAsset(event.request, OFFLINE_CACHE));
  else if (action === "navigation") event.respondWith(navigation(event.request));
});
