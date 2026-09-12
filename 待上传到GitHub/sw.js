/* 国漫 · 日漫 时间表 — Service Worker(PWA 离线缓存)
   策略:
   - HTML/导航请求:网络优先(保证更新能立刻生效),离线时回退缓存
   - 图标 / manifest 等静态资源:缓存优先
   - 数据接口(Bilibili / AniList / 翻译):完全走网络,不缓存
   每次发布新版请提高 CACHE_NAME 版本号,以便清理旧缓存。
*/
"use strict";

var CACHE_NAME = "anime-schedule-v3";
var CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS).catch(function () { /* 个别失败不阻塞安装 */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  var isDataHost = url.hostname.indexOf("bilibili.com") >= 0 ||
                   url.hostname.indexOf("anilist.co") >= 0 ||
                   url.hostname.indexOf("mymemory.translated.net") >= 0;
  if (isDataHost) return; // 数据/翻译:交给网络,不缓存

  var isDoc = req.mode === "navigate" ||
              url.pathname === "/" ||
              /\/index\.html$/.test(url.pathname);

  if (isDoc) {
    // 网络优先:保证用户总能拿到最新页面;失败时用缓存(离线可用)
    event.respondWith(
      fetch(req).then(function (resp) {
        if (resp && resp.ok && url.origin === self.location.origin) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // 静态资源:缓存优先
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && resp.ok && url.origin === self.location.origin) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return resp;
      }).catch(function () { return Response.error(); });
    })
  );
});
