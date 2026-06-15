/**
 * Public contact form → Resend (marketing /contact-us.html).
 *
 * Secrets:
 *   RESEND_API_KEY
 *   CONTACT_TO_EMAILS — comma-separated inbox list
 * Optional:
 *   RESEND_FROM_EMAIL — default: Dalton Grant Academy <onboarding@resend.dev>
 *
 * Deploy: supabase functions deploy send-contact-email --project-ref <REF>
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, isBrowserOriginAllowed } from '../_shared/cors.ts';
import {
  checkIpRateLimit,
  rateLimitResponse,
  readRateLimitEnv,
} from '../_shared/ipRateLimit.ts';

const SUBJECT_KEYS = new Set([
  'general',
  'billing',
  'privacy_data',
  'safety',
  'account_verification',
  'feedback',
  'other',
]);

type Body = {
  subject_key?: string;
  /** When subject_key === other */
  subject_custom?: string;
  message?: string;
  page_url?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseRecipients(): string[] {
  const raw = (Deno.env.get('CONTACT_TO_EMAILS') ?? '').trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ['daltongrant@hotmail.co.uk', 'haydncampbell280@gmail.com'];
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!isBrowserOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (supabaseUrl && serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { limit, windowSec } = readRateLimitEnv('IP_RATE_LIMIT_CONTACT', {
      limit: 5,
      windowSec: 3600,
    });
    const rate = await checkIpRateLimit(admin, req, 'send-contact-email', limit, windowSec);
    if (!rate.ok) {
      return rateLimitResponse(cors, rate.retryAfterSec);
    }
  }

  const anon = (Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY') ?? '').trim();
  const auth = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
  const apikey = req.headers.get('apikey')?.trim() ?? '';
  if (anon && auth !== anon && apikey !== anon) {
    return new Response(JSON.stringify({ error: 'invalid_api_key' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const key = (body.subject_key ?? '').trim().toLowerCase();
  if (!SUBJECT_KEYS.has(key)) {
    return new Response(JSON.stringify({ error: 'invalid_subject' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let subjectLabel = '';
  switch (key) {
    case 'general':
      subjectLabel = 'General enquiry';
      break;
    case 'billing':
      subjectLabel = 'Billing';
      break;
    case 'privacy_data':
      subjectLabel = 'Privacy & data requests';
      break;
    case 'safety':
      subjectLabel = 'Safety / moderation';
      break;
    case 'account_verification':
      subjectLabel = 'Account & verification';
      break;
    case 'feedback':
      subjectLabel = 'Feedback';
      break;
    case 'other':
      subjectLabel = (body.subject_custom ?? '').trim().slice(0, 140) || 'Other';
      break;
    default:
      subjectLabel = 'Contact form';
  }

  const message = (body.message ?? '').trim();
  if (message.length < 10) {
    return new Response(JSON.stringify({ error: 'message_too_short' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  if (message.length > 8000) {
    return new Response(JSON.stringify({ error: 'message_too_long' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const to = parseRecipients();
  const from =
    Deno.env.get('RESEND_FROM_EMAIL')?.trim() ??
    'Dalton Grant Academy <onboarding@resend.dev>';

  if (!resendKey || !to.length) {
    console.error('Missing RESEND_API_KEY or recipient list');
    return new Response(JSON.stringify({ error: 'email_not_configured' }), {
      status: 503,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const origin = req.headers.get('Origin') ?? '';
  const pageUrl = escapeHtml((body.page_url ?? '').slice(0, 500));
  const html = `
  <p><strong>Subject</strong>: ${escapeHtml(subjectLabel)}</p>
  <p><strong>Origin</strong>: ${escapeHtml(origin)}</p>
  ${pageUrl ? `<p><strong>Page</strong>: ${pageUrl}</p>` : ''}
  <hr />
  <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(message)}</pre>
  `.trim();

  const payload: Record<string, unknown> = {
    from,
    to,
    subject: `[DGA Contact] ${subjectLabel}`,
    html,
    text: `Subject: ${subjectLabel}\nOrigin: ${origin}\n\n${message}`,
  };

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!send.ok) {
    const txt = await send.text();
    console.error('Resend failed', send.status, txt);
    return new Response(JSON.stringify({ error: 'send_failed' }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
