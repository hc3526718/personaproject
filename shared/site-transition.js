/* global window, document */
(function () {
  // Rive Cloud embed (same runtime used elsewhere in repo)
  var RIVE_EMBED =
    "https://rive.app/s/2b5r5odTC0qRPicJRWg9Kw/embed?runtime=rive-renderer";

  function ensureOverlay() {
    if (document.getElementById("ga-transition")) return;

    var root = document.createElement("div");
    root.id = "ga-transition";
    root.setAttribute("aria-hidden", "true");

    var frame = document.createElement("div");
    frame.className = "ga-frame";

    var iframe = document.createElement("iframe");
    iframe.src = RIVE_EMBED;
    iframe.title = "Transition animation";
    iframe.setAttribute("loading", "eager");
    iframe.setAttribute(
      "referrerpolicy",
      "no-referrer-when-downgrade"
    );
    iframe.setAttribute("allow", "autoplay; fullscreen");

    var caption = document.createElement("div");
    caption.className = "ga-caption";
    caption.textContent = "GRANT ACCESS";

    frame.appendChild(iframe);
    root.appendChild(frame);
    root.appendChild(caption);
    document.body.appendChild(root);
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
    // Do not intercept links to exported Expo app or external resources
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
    if (!el) return;
    el.classList.add("ga-on");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function hideOverlay() {
    var el = document.getElementById("ga-transition");
    if (!el) return;
    el.classList.remove("ga-on");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function navWithTransition(url) {
    showOverlay();

    // Navigate after the overlay is visible (CSS transition is ~280ms)
    // Keep it short so it feels like a purposeful “cut” rather than a loading screen.
    window.setTimeout(function () {
      window.location.href = url;
    }, 360);
  }

  // Hide overlay on back/forward navigation completion.
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
    // Let the browser handle same-page hash jumps.
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
})();

