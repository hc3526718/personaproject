/**
 * Email confirmation on daltongrantacademy.uk — verify here (not via Supabase URL in email).
 */
(function emailConfirmedPage() {
  var cfg = window.__DGA_AUTH_REDIRECT__ || {};
  var pendingEl = document.getElementById('pending-state');
  var successEl = document.getElementById('success-state');
  var errorEl = document.getElementById('error-state');
  var confirmBtn = document.getElementById('confirm-email-btn');
  var errorTitle = document.getElementById('error-title');
  var errorLead = document.getElementById('error-lead');

  function paramsFromUrl() {
    var merged = new URLSearchParams();
    var search = window.location.search || '';
    var hash = window.location.hash || '';

    if (search.length > 1) {
      try {
        new URLSearchParams(search.slice(1)).forEach(function (v, k) {
          merged.set(k, v);
        });
      } catch (e) {
        /* ignore */
      }
    }

    if (hash.length > 1) {
      try {
        var raw = hash.slice(1);
        if (raw.charAt(0) === '?') raw = raw.slice(1);
        new URLSearchParams(raw).forEach(function (v, k) {
          merged.set(k, v);
        });
      } catch (e) {
        /* ignore */
      }
    }

    return merged;
  }

  function supabaseConfig() {
    var contactCfg = window.__DALTON_CONTACT_CONFIG__ || {};
    return {
      url: (contactCfg.supabaseUrl || '').replace(/\/$/, ''),
      anon: contactCfg.anonKey || '',
    };
  }

  function showError(message) {
    if (pendingEl) pendingEl.hidden = true;
    if (successEl) successEl.hidden = true;
    if (errorEl) errorEl.hidden = false;
    if (errorTitle) errorTitle.textContent = cfg.errorTitle || 'Could not confirm';
    if (errorLead) errorLead.textContent = message;
  }

  function showSuccess() {
    if (pendingEl) pendingEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (successEl) successEl.hidden = false;
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      /* ignore */
    }
  }

  function showPending(message) {
    if (successEl) successEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (pendingEl) pendingEl.hidden = false;
    var lead = pendingEl && pendingEl.querySelector('.text-dim');
    if (lead && message) lead.textContent = message;
  }

  var params = paramsFromUrl();
  var errDesc = params.get('error_description') || params.get('error');
  if (errDesc) {
    showError(String(errDesc).replace(/\+/g, ' '));
    return;
  }

  if (params.get('access_token')) {
    showSuccess();
    return;
  }

  var tokenHash = params.get('token_hash') || params.get('token');
  var type = params.get('type') || 'signup';

  if (!tokenHash) {
    showError(
      cfg.missingTokenMessage ||
        'This confirmation link is incomplete or has already been used. Request a new email from the app or try signing in.',
    );
    return;
  }

  function setBusy(busy) {
    if (confirmBtn && !confirmBtn.hidden) {
      confirmBtn.disabled = busy;
      confirmBtn.textContent = busy ? 'Confirming…' : cfg.confirmButtonLabel || 'Confirm email address';
    }
  }

  function runVerify() {
    var sb = supabaseConfig();
    if (!sb.url || !sb.anon) {
      showError('Confirmation is not configured on this site. Try again from the app.');
      return;
    }
    showPending('Confirming your email address…');
    if (confirmBtn) confirmBtn.hidden = true;
    setBusy(true);
    fetch(sb.url + '/auth/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: sb.anon },
      body: JSON.stringify({
        token_hash: tokenHash,
        type: type === 'email_change' ? 'email_change' : type === 'invite' ? 'invite' : 'signup',
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(data.msg || data.error_description || data.message || 'verify_failed');
          }
          return data;
        });
      })
      .then(function () {
        showSuccess();
      })
      .catch(function (err) {
        var msg = err && err.message ? String(err.message) : 'Could not confirm your email.';
        if (/expired|invalid|already been used/i.test(msg)) {
          msg = 'This confirmation link has expired or was already used. Request a new email from the app.';
        }
        showError(msg);
        if (confirmBtn) {
          confirmBtn.hidden = false;
          showPending('Tap below to try confirming again.');
        }
      })
      .finally(function () {
        setBusy(false);
      });
  }

  showPending('Confirming your email address…');
  if (confirmBtn) confirmBtn.hidden = true;
  runVerify();

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function (e) {
      e.preventDefault();
      runVerify();
    });
  }
})();
