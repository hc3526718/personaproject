/**
 * Supabase auth redirect landing — shared by email-confirmed and password-reset pages.
 * Set window.__DGA_AUTH_REDIRECT__ before loading this script.
 */
(function authRedirectBridge() {
  var cfg = window.__DGA_AUTH_REDIRECT__ || {};
  var NATIVE_CALLBACK = 'dalton-demo://auth/callback';

  var stateEl = document.getElementById('confirm-state');
  var titleEl = document.getElementById('confirm-title');
  var leadEl = document.getElementById('confirm-lead');
  var appBtn = document.getElementById('open-app-btn');
  var webBtn = document.getElementById('continue-web-btn');
  var fallbackEl = document.getElementById('confirm-fallback');

  if (!stateEl) return;

  function qs(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function authSuffix() {
    var hash = window.location.hash || '';
    if (hash && hash.length > 1) return hash;
    var search = window.location.search || '';
    if (search && search.length > 1) return search;
    return '';
  }

  function webCallbackUrl() {
    var origin = window.location.origin || 'https://daltongrantacademy.uk';
    return origin.replace(/\/$/, '') + '/app/auth/callback';
  }

  function showError(message) {
    stateEl.hidden = false;
    stateEl.className = 'confirm-card confirm-card--error';
    if (titleEl) titleEl.textContent = cfg.errorTitle || 'Link problem';
    if (leadEl) leadEl.textContent = message;
    if (appBtn) appBtn.hidden = true;
    if (webBtn) webBtn.hidden = true;
    if (fallbackEl) fallbackEl.hidden = true;
  }

  function showSuccess() {
    stateEl.hidden = false;
    stateEl.className = 'confirm-card confirm-card--ok';
    if (titleEl) titleEl.textContent = cfg.successTitle || 'Confirmed';
    if (leadEl) leadEl.textContent = cfg.successLead || '';
    if (appBtn) {
      appBtn.textContent = cfg.openAppLabel || 'Open The Dalton Grant Academy app';
      appBtn.hidden = cfg.hideOpenApp === true;
    }
    if (webBtn) {
      webBtn.textContent = cfg.continueWebLabel || 'Continue in browser instead';
      webBtn.hidden = cfg.hideWebContinue === true;
    }
    if (fallbackEl) fallbackEl.hidden = cfg.fallbackHtml !== true;
  }

  var suffix = authSuffix();

  var errDesc = qs('error_description') || qs('error');
  if (errDesc) {
    showError(String(errDesc).replace(/\+/g, ' '));
    return;
  }

  if (!suffix) {
    if (cfg.showRequestForm) return;
    showError(
      cfg.missingTokenMessage ||
        'This link is incomplete or has already been used. Request a new email from the app or try signing in.',
    );
    return;
  }

  if (cfg.webPasswordReset) {
    return;
  }

  showSuccess();

  function openNative() {
    window.location.href = NATIVE_CALLBACK + suffix;
  }

  function openWeb() {
    window.location.assign(webCallbackUrl() + suffix);
  }

  if (appBtn) {
    appBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openNative();
    });
  }
  if (webBtn) {
    webBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openWeb();
    });
  }
})();
