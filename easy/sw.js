/* 이지숏폼 최소 서비스워커
   · PWA 설치 가능 조건(fetch 핸들러) 충족 + 오프라인 진입 폴백
   · 앱은 ?v= 캐시버스팅을 쓰므로 네트워크 우선(스테일 방지) */
const CACHE = "easyshorts-shell-v1";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    // 페이지 진입: 네트워크 우선, 실패하면(오프라인) 캐시된 셸
    e.respondWith(fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("./"))));
    return;
  }
  // 나머지: 네트워크 우선, 실패 시 캐시(있으면)
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
