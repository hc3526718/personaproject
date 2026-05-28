/* global window, document, caches, fetch */
(function () {
  var VIDEO_SRC = "/VideoP.mp4";
  var CACHE_NAME = "ga-transition-video-v1";
  var SESSION_READY_KEY = "ga-transition-video-ready";
  var FADE_MS = 400;

  var cachedObjectUrl = null;
  var preloadPromise = null;
  var warmVideoEl = null;

  function markSessionReady() {
    try {
      sessionStorage.setItem(SESSION_READY_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function isSessionReady() {
    try {
      return sessionStorage.getItem(SESSION_READY_KEY) === "1";
    } catch {
      return false;
    }
  }

  function blobToObjectUrl(blob) {
    cachedObjectUrl = URL.createObjectURL(blob);
    markSessionReady();
    return cachedObjectUrl;
  }

  function preloadTransitionVideo() {
    if (cachedObjectUrl) return Promise.resolve(cachedObjectUrl);
    if (preloadPromise) return preloadPromise;

    preloadPromise = (function () {
      if (typeof caches !== "undefined") {
        return caches
          .open(CACHE_NAME)
          .then(function (cache) {
            return cache.match(VIDEO_SRC).then(function (hit) {
              if (hit) return hit.blob();
              return fetch(VIDEO_SRC).then(function (res) {
                if (!res.ok) throw new Error("video fetch failed");
                var clone = res.clone();
                return cache.put(VIDEO_SRC, clone).then(function () {
                  return res.blob();
                });
              });
            });
          })
          .then(blobToObjectUrl)
          .catch(function () {
            return VIDEO_SRC;
          });
      }

      return fetch(VIDEO_SRC)
        .then(function (res) {
          if (!res.ok) throw new Error("video fetch failed");
          return res.blob();
        })
        .then(blobToObjectUrl)
        .catch(function () {
          return VIDEO_SRC;
        });
    })();

    return preloadPromise;
  }

  function warmHiddenVideo() {
    if (warmVideoEl) return;
    warmVideoEl = document.createElement("video");
    warmVideoEl.muted = true;
    warmVideoEl.playsInline = true;
    warmVideoEl.preload = "auto";
    warmVideoEl.setAttribute("playsinline", "");
    warmVideoEl.style.cssText =
      "position:absolute;width:0;height:0;opacity:0;pointer-events:none";
    document.documentElement.appendChild(warmVideoEl);

    preloadTransitionVideo().then(function (url) {
      warmVideoEl.src = url;
      warmVideoEl.load();
    });
  }

  function ensureOverlay() {
    if (document.getElementById("ga-transition")) return;

    var root = document.createElement("div");
    root.id = "ga-transition";
    root.setAttribute("aria-hidden", "true");

    var frame = document.createElement("div");
    frame.className = "ga-frame";

    var video = document.createElement("video");
    video.className = "ga-video";
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");

    frame.appendChild(video);
    root.appendChild(frame);
    document.body.appendChild(root);
  }

  function getOverlayVideo() {
    var root = document.getElementById("ga-transition");
    if (!root) return null;
    return root.querySelector("video");
  }

  function isSameOriginLink(a) {
    try {
      var url = new URL(a.href, window.location.href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function isAppLink(a) {
    var href = (a.getAttribute("href") || "").trim();
    if (!href) return false;
    if (href.startsWith("#")) return false;
    if (/^mailto:/i.test(href) || /^tel:/i.test(href)) return false;
    if (href.includes("/app/")) return false;
    return isSameOriginLink(a);
  }

  function showOverlay() {
    ensureOverlay();
    var el = document.getElementById("ga-transition");
    var video = getOverlayVideo();
    if (!el) return;

    el.classList.remove("ga-fade-out");
    el.classList.add("ga-on");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    if (!video) return;

    preloadTransitionVideo().then(function (url) {
      video.src = url;
      video.currentTime = 0;
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    });
  }

  function hideOverlay() {
    var el = document.getElementById("ga-transition");
    if (!el || !el.classList.contains("ga-on")) return;

    el.classList.add("ga-fade-out");
    window.setTimeout(function () {
      el.classList.remove("ga-on", "ga-fade-out");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      var video = getOverlayVideo();
      if (video) video.pause();
    }, FADE_MS);
  }

  function navWithTransition(url) {
    showOverlay();
    window.setTimeout(function () {
      window.location.href = url;
    }, 360);
  }

  function injectPreloadLink() {
    if (document.querySelector('link[data-ga-video-preload="1"]')) return;
    var link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.type = "video/mp4";
    link.href = VIDEO_SRC;
    link.setAttribute("data-ga-video-preload", "1");
    document.head.appendChild(link);
  }

  window.addEventListener("pageshow", function () {
    hideOverlay();
  });

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target) return;
    var a = target.closest ? target.closest("a") : null;
    if (!a) return;
    if (a.target && a.target !== "_self") return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isAppLink(a)) return;

    var href = a.href;
    try {
      var u = new URL(href, window.location.href);
      var cur = new URL(window.location.href);
      var samePath = u.pathname === cur.pathname && u.search === cur.search;
      if (samePath && u.hash) return;
    } catch {
      /* ignore */
    }

    e.preventDefault();
    navWithTransition(href);
  });

  injectPreloadLink();
  warmHiddenVideo();
  if (!isSessionReady()) {
    preloadTransitionVideo();
  } else {
    preloadTransitionVideo();
  }
})();
