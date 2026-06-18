/**
 * UK PECR / GDPR cookie consent banner for marketing pages.
 * Essential cookies only until the visitor accepts.
 */
(function () {
  var STORAGE_KEY = 'dga_cookie_consent_v1';
  if (!window.localStorage || window.localStorage.getItem(STORAGE_KEY) === 'accepted') return;

  var bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.setAttribute('aria-live', 'polite');
  bar.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;background:rgba(10,10,10,0.96);border-top:1px solid rgba(255,255,255,0.09);font-family:"DM Sans",sans-serif;font-size:12px;line-height:1.5;color:#9A9690;';

  var text = document.createElement('p');
  text.style.cssText = 'margin:0;flex:1;min-width:220px;';
  text.innerHTML =
    'We use essential cookies to keep you signed in and secure the site. See our <a href="/cookie-policy" style="color:#C8A84B;text-decoration:underline">Cookie Policy</a> and <a href="/privacy" style="color:#C8A84B;text-decoration:underline">Privacy Policy</a>.';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Accept';
  btn.style.cssText =
    'border:none;border-radius:999px;padding:10px 18px;background:#C8A84B;color:#0A0A0A;font-weight:600;font-size:14px;cursor:pointer;';
  btn.addEventListener('click', function () {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch (e) {
      /* private mode */
    }
    bar.remove();
  });

  bar.appendChild(text);
  bar.appendChild(btn);
  document.body.appendChild(bar);
})();
