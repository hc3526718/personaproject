/** Loads StaggeredMenu (+ screenshot carousel on pages with #dalton-card-swap). */
(function loadMarketingUi() {
  if (document.querySelector('link[data-dalton-marketing-ui]')) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/shared/marketing-ui/marketing-ui.css';
  css.setAttribute('data-dalton-marketing-ui', '1');
  document.head.appendChild(css);
  const js = document.createElement('script');
  js.src = '/shared/marketing-ui/marketing-ui.js';
  js.defer = true;
  js.setAttribute('data-dalton-marketing-ui', '1');
  document.body.appendChild(js);
})();
