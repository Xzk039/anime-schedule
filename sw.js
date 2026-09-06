/* 国漫 · 日漫 时间表 — Service Worker(PWA 离线缓存) */
"use strict";

var CACHE_NAME = "anime-schedule-v1";
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

// 数据接口请求(api.bilibili.com / graphql.anilist.co / 翻译接口)一律走网络,不缓存,
// 保证数据实时;同源静态资源缓存优先,离线时也能打开应用外壳。
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  var isDataHost = url.hostname.indexOf("bilibili.com") >= 0 ||
                   url.hostname.indexOf("anilist.co") >= 0 ||
                   url.hostname.indexOf("mymemory.translated.net") >= 0;
  if (isDataHost) return; // 数据/翻译:网络优先,不缓存

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && resp.ok && url.origin === self.location.origin) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return resp;
      }).catch(function () {
        // 离线回退到应用外壳
        if (req.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});
