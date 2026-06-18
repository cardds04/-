// 최소 서비스워커 — 설치형 웹앱(PWA) 자격 충족용.
// 앱이 자주 배포되므로 캐시는 두지 않는다(항상 최신 화면). 네트워크 통과만.
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
self.addEventListener("fetch", function (event) {
  // 네트워크 우선(캐시 미사용). 핸들러 존재 자체가 설치 자격 요건.
  event.respondWith(
    fetch(event.request).catch(function () {
      return new Response("오프라인 상태입니다. 네트워크 연결 후 다시 시도해주세요.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    })
  );
});
