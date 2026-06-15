/**
 * Post–email-verification landing (Supabase redirect_to target).
 * Shows success, tries dalton-demo://auth/callback + tokens (TestFlight / production builds),
 * falls back to bold “return to the app” instructions.
 */
(function emailConfirmedBootstrap() {
  var NATIVE_CALLBACK = 'dalton-demo://auth/callback';
  var WEB_CALLBACK = '/app/auth/callback';

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
    if (hash) return hash;
    var code = qs('code');
    if (code) return '?code=' + encodeURIComponent(code);
    return '';
  }

  function flowType() {
    var hash = window.location.hash || '';
    var m = hash.match(/(?:^|[?#&])type=([^&]+)/);
    if (m && m[1]) return m[1];
    return qs('type') || 'signup';
  }

  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  }

  function showError(message) {
    stateEl.hidden = false;
    stateEl.className = 'confirm-card confirm-card--error';
    if (titleEl) titleEl.textContent = 'Link problem';
    if (leadEl) leadEl.textContent = message;
    if (appBtn) appBtn.hidden = true;
    if (webBtn) webBtn.hidden = true;
    if (fallbackEl) fallbackEl.hidden = true;
  }

  function showSuccess() {
    var type = flowType();
    var isRecovery = type === 'recovery' || type === 'email_change';
    stateEl.hidden = false;
    stateEl.className = 'confirm-card confirm-card--ok';
    if (titleEl) {
      titleEl.textContent = isRecovery ? 'Link confirmed' : 'Email confirmed';
    }
    if (leadEl) {
      leadEl.textContent = isRecovery
        ? 'Your reset link is valid. Open The Dalton Grant Academy app to choose a new password.'
        : 'Your email is verified. Open the app to continue account setup — you do not need to sign up again.';
    }
    if (fallbackEl) fallbackEl.hidden = false;
  }

  var errDesc = qs('error_description') || qs('error');
  if (errDesc) {
    showError(String(errDesc).replace(/\+/g, ' '));
    return;
  }

  var suffix = authSuffix();
  if (!suffix) {
    showError(
      'This confirmation link is incomplete or has already been used. Request a new email from the app or try signing in.',
    );
    return;
  }

  showSuccess();

  function openNative() {
    window.location.href = NATIVE_CALLBACK + suffix;
  }

  function openWeb() {
    window.location.href = WEB_CALLBACK + suffix;
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

  if (isMobile()) {
    setTimeout(openNative, 800);
  }
})();
