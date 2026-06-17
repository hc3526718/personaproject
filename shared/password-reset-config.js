/**
 * Post–password-reset landing (Supabase recovery redirect_to target).
 * Without tokens in the URL, password-reset-page.js shows the email request form instead.
 */
window.__DGA_AUTH_REDIRECT__ = {
  showRequestForm: true,
  hideWebContinue: true,
  hideOpenApp: true,
  webPasswordReset: true,
  successTitle: 'Reset link confirmed',
  successLead:
    'Your reset link is valid. Enter a new password below — you can log in to the app when you are done.',
  passwordSavedMessage: 'Your password has been updated.',
  passwordSavedHint: 'Open the app and log in with your new password.',
  missingTokenMessage:
    'This reset link is incomplete or has already been used. Enter your email below to request a new link.',
  fallbackHtml: false,
};
