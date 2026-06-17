/**
 * /password-reset — request reset email or show in-browser password form (token_hash in URL).
 */
(function passwordResetPage() {
  var cfg = window.__DGA_AUTH_REDIRECT__ || {};

  function paramsFromUrl() {
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

  function redirectTarget() {
    if (cfg.redirectTo) return cfg.redirectTo;
    return window.location.origin + '/password-reset';
  }

  var params = paramsFromUrl();
  var requestPanel = document.getElementById('request-panel');
  var errorPanel = document.getElementById('reset-error-state');
  var errorLead = document.getElementById('reset-error-lead');
  var requestForm = document.getElementById('password-reset-request-form');
  var requestStatus = document.getElementById('request-status');
  var requestEmail = document.getElementById('reset-email');
  var requestSubmit = document.getElementById('reset-submit');

  var errDesc = params.get('error_description') || params.get('error');
  if (errDesc) {
    if (requestPanel) requestPanel.hidden = true;
    if (errorPanel) errorPanel.hidden = false;
    if (errorLead) errorLead.textContent = String(errDesc).replace(/\+/g, ' ');
    return;
  }

  var hasRecovery =
    params.get('token_hash') || params.get('code') || params.get('access_token');

  if (hasRecovery) {
    if (requestPanel) requestPanel.hidden = true;
    return;
  }

  if (requestPanel) requestPanel.hidden = false;

  if (!requestForm || !requestEmail || !requestSubmit) return;

  function setRequestBusy(busy) {
    requestSubmit.disabled = busy;
    requestEmail.disabled = busy;
    requestSubmit.textContent = busy ? 'Sending…' : 'Send reset link';
  }

  function showRequestStatus(message, isError) {
    if (!requestStatus) return;
    requestStatus.hidden = false;
    requestStatus.textContent = message;
    requestStatus.className = isError ? 'request-status request-status--error' : 'request-status request-status--ok';
  }

  requestForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (requestStatus) requestStatus.hidden = true;

    var email = (requestEmail.value || '').trim();
    if (!email || email.indexOf('@') < 1) {
      showRequestStatus('Enter a valid email address.', true);
      return;
    }

    var contactCfg = window.__DALTON_CONTACT_CONFIG__ || {};
    var url = (contactCfg.supabaseUrl || '').replace(/\/$/, '');
    var anon = contactCfg.anonKey || '';
    if (!url || !anon) {
      showRequestStatus(
        'Password reset is not configured on this preview. Open The Dalton Grant Academy app and use Forgot Password, or try again after deploy.',
        true,
      );
      return;
    }

    setRequestBusy(true);
    fetch(url + '/auth/v1/recover?redirect_to=' + encodeURIComponent(redirectTarget()), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: 'Bearer ' + anon,
      },
      body: JSON.stringify({ email: email }),
    })
      .then(function (res) {
        if (!res.ok && res.status !== 429) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            throw new Error(data.msg || data.error_description || 'request_failed');
          });
        }
        if (res.status === 429) {
          throw new Error('rate_limit');
        }
      })
      .then(function () {
        requestForm.hidden = true;
        showRequestStatus(
          'If an account exists for that email, we sent a reset link. Open it on this device to choose a new password on daltongrantacademy.uk.',
          false,
        );
      })
      .catch(function (err) {
        if (err && err.message === 'rate_limit') {
          showRequestStatus('Too many requests. Wait a few minutes and try again.', true);
        } else {
          showRequestStatus('Could not send the reset email. Try again in a moment or use the app.', true);
        }
      })
      .finally(function () {
        setRequestBusy(false);
      });
  });
})();
