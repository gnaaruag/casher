// Offline-first service worker for Casher.
// On install it fetches the app shell, finds every /_next/static asset the
// page references (JS, CSS, fonts), and caches them with the static files,
// so the very first visit is enough to run fully offline.
const VERSION = "casher-v2";
const CORE = [
  "/",
  "/manifest.json",
  "/android/launchericon-48x48.png",
  "/android/launchericon-72x72.png",
  "/android/launchericon-96x96.png",
  "/android/launchericon-144x144.png",
  "/android/launchericon-192x192.png",
  "/android/launchericon-512x512.png",
  "/ios/120.png",
  "/ios/152.png",
  "/ios/167.png",
  "/ios/180.png",
  "/favicon.ico",
];

const ASSET_RE = /\/_next\/static\/[^"'\\\s)<>]+/g;

async function precache() {
  const cache = await caches.open(VERSION);
  const res = await fetch("/", { cache: "reload" });
  if (!res.ok) throw new Error("shell fetch failed");
  const html = await res.clone().text();
  await cache.put("/", res);

  const urls = new Set(html.match(ASSET_RE) || []);
  for (const u of CORE) if (u !== "/") urls.add(u);

  const queue = [...urls];
  const seen = new Set(queue);
  while (queue.length) {
    const url = queue.shift();
    const r = await fetch(url);
    if (!r.ok) throw new Error("asset fetch failed: " + url);
    await cache.put(url, r.clone());
    // CSS may reference fonts/other assets
    if (url.endsWith(".css")) {
      const css = await r.text();
      const base = new URL(url, self.location.origin);
      for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        if (m[1].startsWith("data:")) continue;
        const abs = new URL(m[1], base);
        if (abs.origin !== self.location.origin) continue;
        const p = abs.pathname + abs.search;
        if (!seen.has(p)) {
          seen.add(p);
          queue.push(p);
        }
      }
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: serve the cached shell, refresh it in the background.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const cached = await cache.match("/");
        const update = fetch("/")
          .then((r) => {
            if (r && r.ok) cache.put("/", r.clone());
            return r;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(update);
          return cached;
        }
        return (await update) || Response.error();
      })(),
    );
    return;
  }

  // Everything else: cache first, fall back to network and remember it.
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req, { ignoreSearch: false });
      if (cached) return cached;
      try {
        const r = await fetch(req);
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      } catch (e) {
        const loose = await cache.match(url.pathname);
        return loose || Response.error();
      }
    })(),
  );
});
