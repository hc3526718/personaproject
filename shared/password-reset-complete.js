/**
 * Password reset completion on daltongrantacademy.uk (recovery tokens in URL).
 */
(function passwordResetComplete() {
  var cfg = window.__DGA_AUTH_REDIRECT__ || {};
  var panel = document.getElementById('recover-panel');
  var form = document.getElementById('password-reset-complete-form');
  var passwordEl = document.getElementById('new-password');
  var confirmEl = document.getElementById('confirm-password');
  var statusEl = document.getElementById('recover-status');
  var submitBtn = document.getElementById('recover-submit');
  var confirmState = document.getElementById('confirm-state');
  var errorPanel = document.getElementById('reset-error-state');
  var errorLead = document.getElementById('reset-error-lead');

  if (!panel || !form) return;

  function qsFromUrl() {
    var hash = window.location.hash || '';
    var search = window.location.search || '';
    var raw = hash.length > 1 ? hash.slice(1) : search.length > 1 ? search.slice(1) : '';
    if (!raw) return new URLSearchParams();
    try {
      return new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function hasRecoveryTokens() {
    var p = qsFromUrl();
    return !!(p.get('access_token') || p.get('code') || p.get('token_hash'));
  }

  if (!hasRecoveryTokens()) return;

  if (errorPanel) errorPanel.hidden = true;
  if (confirmState) confirmState.hidden = true;
  var requestPanel = document.getElementById('request-panel');
  if (requestPanel) requestPanel.hidden = true;
  panel.hidden = false;

  function showStatus(message, isError) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.className = isError ? 'request-status request-status--error' : 'request-status request-status--ok';
  }

  function setBusy(busy) {
    if (submitBtn) {
      submitBtn.disabled = busy;
      submitBtn.textContent = busy ? 'Saving…' : 'Save new password';
    }
    if (passwordEl) passwordEl.disabled = busy;
    if (confirmEl) confirmEl.disabled = busy;
  }

  function validatePassword(pw) {
    if (pw.length < 8) return 'Use at least 8 characters.';
    if (!/[a-z]/.test(pw)) return 'Include a lowercase letter.';
    if (!/[A-Z]/.test(pw)) return 'Include an uppercase letter.';
    if (!/\d/.test(pw)) return 'Include a number.';
    return null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (statusEl) statusEl.hidden = true;

    var pw = (passwordEl && passwordEl.value) || '';
    var confirm = (confirmEl && confirmEl.value) || '';
    var pwErr = validatePassword(pw);
    if (pwErr) {
      showStatus(pwErr, true);
      return;
    }
    if (pw !== confirm) {
      showStatus('Passwords do not match.', true);
      return;
    }

    var contactCfg = window.__DALTON_CONTACT_CONFIG__ || {};
    var url = (contactCfg.supabaseUrl || '').replace(/\/$/, '');
    var anon = contactCfg.anonKey || '';
    if (!url || !anon) {
      showStatus('Password reset is not configured on this site. Use the app instead.', true);
      return;
    }

    setBusy(true);
    var params = qsFromUrl();
    var accessToken = params.get('access_token');
    var refreshToken = params.get('refresh_token');
    var code = params.get('code');
    var tokenHash = params.get('token_hash');
    var type = params.get('type') || 'recovery';

    function finishSessionThenUpdate(sessionHeaders) {
      return fetch(url + '/auth/v1/user', {
        method: 'PUT',
        headers: Object.assign(
          {
            'Content-Type': 'application/json',
            apikey: anon,
          },
          sessionHeaders,
        ),
        body: JSON.stringify({ password: pw }),
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(data.msg || data.error_description || data.message || 'update_failed');
          }
          return data;
        });
      });
    }

    var chain = Promise.resolve();

    if (accessToken && refreshToken) {
      chain = finishSessionThenUpdate({ Authorization: 'Bearer ' + accessToken });
    } else if (code) {
      chain = fetch(url + '/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anon },
        body: JSON.stringify({ auth_code: code, code_verifier: '' }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.msg || data.error_description || 'exchange_failed');
            return data;
          });
        })
        .then(function (data) {
          return finishSessionThenUpdate({ Authorization: 'Bearer ' + data.access_token });
        })
        .catch(function () {
          throw new Error(
            'Open this reset link in the same browser where you requested it, or request a new link from the app.',
          );
        });
    } else if (tokenHash) {
      chain = fetch(url + '/auth/v1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anon },
        body: JSON.stringify({ token_hash: tokenHash, type: type === 'recovery' ? 'recovery' : type }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.msg || data.error_description || 'verify_failed');
            return data;
          });
        })
        .then(function (data) {
          var token = data.access_token;
          if (!token) throw new Error('Could not verify reset link.');
          return finishSessionThenUpdate({ Authorization: 'Bearer ' + token });
        });
    } else {
      showStatus('This reset link is incomplete or has expired. Request a new one.', true);
      setBusy(false);
      return;
    }

    chain
      .then(function () {
        panel.innerHTML =
          '<div class="auth-success-hero">' +
          '<div class="auth-success-circle" aria-hidden="true">' +
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M20 6L9 17L4 12" stroke="#0a0a0a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<p class="auth-success-title">Password updated</p>' +
          '<p class="text-dim mt-3 leading-relaxed text-center">' +
          (cfg.passwordSavedMessage || 'Your password has been updated.') +
          ' Open The Dalton Grant Academy app and log in with your new password.' +
          '</p></div>';
        panel.hidden = false;
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          /* ignore */
        }
      })
      .catch(function (err) {
        var msg = err && err.message ? String(err.message) : 'Could not update password.';
        if (/expired|invalid|already been used/i.test(msg)) {
          msg = 'This reset link has expired or was already used. Request a new link from the app.';
        }
        showStatus(msg, true);
      })
      .finally(function () {
        setBusy(false);
      });
  });
})();
