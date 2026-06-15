/**
 * Consent gate for Chatbase AI assistant embeds (contact-assistant, live-chat).
 * Required for App Store / UK AI transparency — user must opt in before the iframe loads.
 */
(function () {
  var STORAGE_KEY = 'dalton_ai_assistant_consent_v1';
  var gate = document.getElementById('ai-consent-gate');
  var chat = document.getElementById('ai-chat-wrap');
  if (!gate || !chat) return;

  function showChat() {
    gate.hidden = true;
    chat.hidden = false;
  }

  if (window.localStorage && window.localStorage.getItem(STORAGE_KEY) === '1') {
    showChat();
    return;
  }

  gate.hidden = false;
  chat.hidden = true;

  var accept = document.getElementById('ai-consent-accept');
  var decline = document.getElementById('ai-consent-decline');
  if (accept) {
    accept.addEventListener('click', function () {
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch (e) {
        /* private mode */
      }
      showChat();
    });
  }
  if (decline) {
    decline.addEventListener('click', function () {
      window.location.href = 'contact-us.html';
    });
  }
})();
