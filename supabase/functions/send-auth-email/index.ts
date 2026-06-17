/**
 * Supabase Auth Send Email hook — delivers auth mail via Resend HTTP API.
 *
 * Secrets: RESEND_API_KEY, SEND_EMAIL_HOOK_SECRET
 * Optional: RESEND_FROM_EMAIL, SUPABASE_URL (auto-injected)
 *
 * Enable: Dashboard → Auth → Hooks → Send Email
 *   URI: https://<project-ref>.supabase.co/functions/v1/send-auth-email
 *   Secret: same value as SEND_EMAIL_HOOK_SECRET (v1,whsec_…)
 *
 * Deploy: supabase functions deploy send-auth-email --no-verify-jwt --project-ref <REF>
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import {
  buildAuthEmail,
  buildMarketingAuthLink,
  sendAuthEmailViaResend,
  type AuthEmailAction,
} from '../_shared/authHookEmail.ts';

type HookPayload = {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: AuthEmailAction;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')?.trim();
  if (!rawSecret) {
    console.error('[send-auth-email] SEND_EMAIL_HOOK_SECRET not set');
    return new Response(JSON.stringify({ error: 'hook_secret_missing' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const hookSecret = rawSecret.replace(/^v1,whsec_/, '');
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: HookPayload;
  try {
    data = new Webhook(hookSecret).verify(payload, headers) as HookPayload;
  } catch (err) {
    console.error('[send-auth-email] webhook verify failed', err);
    return new Response(JSON.stringify({ error: 'invalid_signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { user, email_data: emailData } = data;
  const to = user?.email?.trim();
  if (!to || !emailData?.token_hash || !emailData.email_action_type) {
    return new Response(JSON.stringify({ error: 'invalid_payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? emailData.site_url ?? '').trim();
  const marketingOrigin = (Deno.env.get('DALTON_WEB_URL') ?? 'https://daltongrantacademy.uk').replace(
    /\/$/,
    '',
  );

  const confirmUrl = buildMarketingAuthLink(
    marketingOrigin,
    emailData.token_hash,
    emailData.email_action_type,
  );

  const { subject, html, text } = buildAuthEmail({
    email: to,
    action: emailData.email_action_type,
    confirmUrl,
  });

  const result = await sendAuthEmailViaResend({ to, subject, html, text });
  if (!result.ok) {
    const isRateLimit =
      result.error === 'resend_rate_limit_exceeded' || result.status === 429;
    const httpStatus = isRateLimit ? 429 : result.status === 503 ? 503 : 500;
    const message = isRateLimit
      ? 'email rate limit exceeded'
      : result.error === 'resend_not_configured'
        ? 'Auth email service is not configured (RESEND_API_KEY missing).'
        : result.error === 'resend_domain_required_for_recipient'
          ? 'Auth email From address must use verified domain (set RESEND_FROM_EMAIL on Supabase).'
          : result.error;
    return new Response(
      JSON.stringify({
        error: {
          http_code: httpStatus,
          message,
        },
      }),
      {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
