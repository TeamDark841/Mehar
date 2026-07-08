/* ============================================================
   EarnPkr Service Worker
   - Precaches the app shell (html/js/manifest/icons) so the app
     installs and opens instantly, even offline.
   - HTML pages: network-first (so users always get the latest
     logic/UI first), falling back to cache when offline.
   - JS/icons/manifest: cache-first, refreshed in the background.
   - Supabase (API/auth) and Cloudinary (uploads) requests are
     NEVER cached — those must always hit the network live,
     since balances/tasks/withdrawals must never be served stale.
   ============================================================ */

const CACHE_VERSION = "earnpkr-v3";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const SHELL_ASSETS = [
  "./index.html",
  "./auth.html",
  "./app.html",
  "./admin.html",
  "./shared.js",
  "./parallax.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

// Hosts that must always be fetched live — never cached.
const NEVER_CACHE_HOSTS = [
  "supabase.co",
  "cloudinary.com",
  "tawk.to"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isNeverCache(url) {
  return NEVER_CACHE_HOSTS.some((h) => url.includes(h));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never touch POST/RPC calls

  const url = req.url;
  if (isNeverCache(url)) return; // let it hit the network directly

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Network-first for pages, so logic/UI updates show immediately.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for static assets (js/icons/manifest), refresh in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
