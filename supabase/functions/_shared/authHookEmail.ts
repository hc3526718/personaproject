/**
 * Supabase Auth Send Email hook → Resend HTTP API.
 */
import { escapeHtml } from './bookingConfirmationEmail.ts';
import { resendFromFallbacks } from './resendFrom.ts';

/** Public logo at /brand/dalton_logo_final_img.png on the marketing site. */
function authEmailLogoUrl(): string {
  const explicit = Deno.env.get('AUTH_EMAIL_LOGO_URL')?.trim();
  if (explicit) return explicit;
  const web = Deno.env.get('DALTON_WEB_URL')?.trim().replace(/\/$/, '');
  if (web?.startsWith('https://')) return `${web}/brand/dalton_logo_final_img.png`;
  return 'https://daltongrantacademy.uk/brand/dalton_logo_final_img.png';
}

export type AuthEmailAction =
  | 'signup'
  | 'recovery'
  | 'invite'
  | 'magiclink'
  | 'email_change'
  | 'email_change_new'
  | 'email_change_current'
  | 'reauthentication';

type BuildOpts = {
  email: string;
  action: AuthEmailAction;
  confirmUrl: string;
};

function emailCard(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;color:#111111;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <img src="${authEmailLogoUrl()}" width="160" height="auto" alt="The Dalton Grant Academy" style="display:block;border:0;" />
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e8e8e8;border-radius:12px;padding:28px 24px;">
          ${body}
        </td></tr>
        <tr><td style="padding:24px 8px 0;font-size:12px;color:#666666;text-align:center;">
          <p style="margin:0;">© The Dalton Grant Academy</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildAuthEmail(opts: BuildOpts): { subject: string; html: string; text: string } {
  const { email, action, confirmUrl } = opts;
  const safeEmail = escapeHtml(email);
  const safeUrl = escapeHtml(confirmUrl);
  const btn = `<a href="${safeUrl}" style="display:inline-block;background:#c8a84b;color:#0a0a0a;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;">`;

  let subject = 'The Dalton Grant Academy';
  let heading = 'Account email';
  let lead = 'Please use the link below to continue.';
  let buttonLabel = 'Continue';
  let footer = 'If you did not request this, you can ignore this email.';

  switch (action) {
    case 'signup':
      subject = 'Confirm your Dalton Grant Academy account';
      heading = 'Confirm your email';
      lead = `Thanks for joining The Dalton Grant Academy. Tap the button below to verify <strong>${safeEmail}</strong> and finish creating your account.`;
      buttonLabel = 'Confirm email';
      break;
    case 'recovery':
      subject = 'Reset your Dalton password';
      heading = 'Reset your password';
      lead = `We received a request to reset the password for <strong>${safeEmail}</strong>. This link opens the app so you can choose a new password.`;
      buttonLabel = 'Reset password';
      break;
    case 'email_change':
    case 'email_change_new':
      subject = 'Confirm your new email address';
      heading = 'Confirm email change';
      lead = 'You asked to change the email on your Dalton account. Confirm to complete the update.';
      buttonLabel = 'Confirm new email';
      footer =
        'Until confirmed, sign-in still uses your previous email. Premium billing on Apple or Stripe is not changed automatically.';
      break;
    case 'magiclink':
      subject = 'Your Dalton sign-in link';
      heading = 'Sign in';
      lead = `Use the button below to sign in to <strong>${safeEmail}</strong>.`;
      buttonLabel = 'Sign in';
      break;
    case 'invite':
      subject = 'You have been invited to Dalton Grant Academy';
      heading = 'Accept your invitation';
      lead = 'You have been invited to join The Dalton Grant Academy.';
      buttonLabel = 'Accept invitation';
      break;
    default:
      break;
  }

  const html = emailCard(`
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111111;">${heading}</h1>
    <p style="margin:0 0 16px;color:#333333;">${lead}</p>
    <p style="margin:0 0 24px;">${btn}${buttonLabel}</a></p>
    <p style="margin:0;font-size:13px;color:#666666;">Or copy this link into your browser:<br /><span style="word-break:break-all;">${safeUrl}</span></p>
    <p style="margin:16px 0 0;font-size:13px;color:#666666;">${footer}</p>
  `);

  const text = [heading, '', lead.replace(/<[^>]+>/g, ''), '', confirmUrl, '', footer].join('\n');

  return { subject, html, text };
}

export function buildVerifyUrl(
  supabaseUrl: string,
  tokenHash: string,
  action: string,
  redirectTo: string,
): string {
  const base = supabaseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    token: tokenHash,
    type: action,
    redirect_to: redirectTo,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

export async function sendAuthEmailViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();

  if (!resendKey) {
    return { ok: false, error: 'resend_not_configured' };
  }

  let lastError = 'resend_failed';
  let lastStatus: number | undefined;

  for (const from of resendFromFallbacks()) {
    const send = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (send.ok) {
      return { ok: true };
    }

    const txt = await send.text();
    console.error('[send-auth-email] Resend failed', from, send.status, txt);
    lastStatus = send.status;
    try {
      const parsed = JSON.parse(txt) as { message?: string; name?: string };
      if (parsed.name === 'rate_limit_exceeded' || /rate limit/i.test(parsed.message ?? '')) {
        lastError = 'resend_rate_limit_exceeded';
        return { ok: false, error: lastError, status: send.status };
      }
      if (parsed.message) {
        lastError = parsed.message;
      }
    } catch {
      lastError = 'resend_failed';
    }

    const retryableFrom =
      send.status === 403 ||
      send.status === 422 ||
      /domain|not verified|invalid.*from/i.test(lastError);
    if (!retryableFrom) {
      break;
    }
  }

  return { ok: false, error: lastError, status: lastStatus };
}
