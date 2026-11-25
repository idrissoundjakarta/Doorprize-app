/* Service worker Doorprize: menyimpan semua file aplikasi supaya jalan tanpa internet.
   Dibuat otomatis oleh scripts/gen-sw.mjs setelah build. */
const VERSION = "__VERSION__";
const FILES = __FILES__;
const CACHE = "doorprize-" + VERSION;
const scopeUrl = (p) => new URL(p, self.registration.scope).toString();

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(scopeUrl(f), { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      // Versi lama dihapus hanya kalau tidak ada jendela lain yang terbuka,
      // supaya show yang sedang berjalan tetap bisa memuat file versinya sendiri.
      const open = await self.clients.matchAll({ includeUncontrolled: true });
      if (open.length <= 1) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith("doorprize-") && k !== CACHE).map((k) => caches.delete(k)));
      }
    })(),
  );
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Halaman: coba internet sebentar (versi terbaru), kalau tidak ada/lambat pakai salinan.
    e.respondWith(
      (async () => {
        try {
          const net = await Promise.race([fetch(req), timeout(2500)]);
          if (net.ok) {
            const copy = net.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return net;
        } catch {
          return (await caches.match(req, { ignoreSearch: true })) || (await caches.match(scopeUrl("./")));
        }
      })(),
    );
    return;
  }

  // File lain (kode, font, gambar): pakai salinan dulu, internet hanya kalau belum ada.
  e.respondWith(
    (async () => {
      const hit = await caches.match(req, { ignoreSearch: req.url.includes("/fonts/") });
      if (hit) return hit;
      const net = await fetch(req);
      if (net.ok) {
        const copy = net.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return net;
    })(),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "version") e.source?.postMessage({ t: "sw-version", version: VERSION, files: FILES.length });
});
