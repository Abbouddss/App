const CACHE_NAME = "ascension-v2"; // bump this string any time you want to force everyone onto fresh files
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // Page loads (clicking the link, typing the URL, refreshing) always go
  // to the network first, so people get whatever is actually live on
  // GitHub right now. Only if there's no connection do we fall back to
  // whatever was last cached, so the app still opens offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(r => r || caches.match("./index.html"))
        )
    );
    return;
  }

  // Everything else (icons, css, js, manifest) stays cache-first for
  // speed, but still gets stored the first time it's fetched so new
  // assets show up without needing a manual cache bump.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return (
        cachedResponse ||
        fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
      );
    })
  );
});
