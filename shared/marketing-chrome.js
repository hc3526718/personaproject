/** Loads StaggeredMenu + screenshot carousel (pages with #dalton-staggered-menu / #dalton-card-swap). */
(function loadMarketingUi() {
  if (window.__daltonMarketingUiLoading) return;
  window.__daltonMarketingUiLoading = true;

  const CSS_HREF = '/shared/marketing-ui/marketing-ui.css';
  const JS_SRC = '/shared/marketing-ui/marketing-ui.js';

  function appendScript() {
    if (document.querySelector('script[data-dalton-marketing-ui]')) return;
    const js = document.createElement('script');
    js.src = JS_SRC;
    js.async = false;
    js.defer = true;
    js.setAttribute('data-dalton-marketing-ui', '1');
    js.onerror = function onMarketingUiError() {
      console.error('[dalton-marketing] Failed to load', JS_SRC);
    };
    document.body.appendChild(js);
  }

  if (document.querySelector('link[data-dalton-marketing-ui]')) {
    appendScript();
    return;
  }

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = CSS_HREF;
  css.setAttribute('data-dalton-marketing-ui', '1');
  css.onload = appendScript;
  css.onerror = function onMarketingCssError() {
    console.error('[dalton-marketing] Failed to load', CSS_HREF);
    appendScript();
  };
  document.head.appendChild(css);
})();
