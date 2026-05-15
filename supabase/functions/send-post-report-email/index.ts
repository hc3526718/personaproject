/**
 * Receives Supabase Database Webhook payloads for `public.post_reports` INSERTs
 * and emails you via Resend.
 *
 * Secrets (Dashboard → Edge Functions → send-post-report-email → Secrets):
 *   RESEND_API_KEY           — https://resend.com/api-keys
 *   REPORT_NOTIFY_EMAIL      — moderator inbox
 *   REPORT_WEBHOOK_SECRET    — long random string; must match webhook header below
 * Optional:
 *   RESEND_FROM_EMAIL        — default: Dalton Reports <onboarding@resend.dev>
 *             (Resend sandbox only delivers to your account email until you verify a domain)
 *
 * Webhook (Dashboard → Database → Webhooks): table post_reports, event INSERT
 *   URL: https://<PROJECT_REF>.supabase.co/functions/v1/send-post-report-email
 *   HTTP headers (required):
 *     Authorization: Bearer <EXPO_PUBLIC_SUPABASE_ANON_KEY or anon key from API settings>
 *     apikey: <same anon key>
 *     x-report-secret: <same value as REPORT_WEBHOOK_SECRET>
 *     Content-Type: application/json
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

type InsertPayload = {
  type: 'INSERT';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: null;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-report-secret',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors });
  }

  const expectedSecret = Deno.env.get('REPORT_WEBHOOK_SECRET')?.trim();
  if (!expectedSecret) {
    console.error('REPORT_WEBHOOK_SECRET is not set');
    return new Response(JSON.stringify({ error: 'Function not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const provided = req.headers.get('x-report-secret')?.trim();
  if (provided !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const notifyTo = Deno.env.get('REPORT_NOTIFY_EMAIL')?.trim();
  const from =
    Deno.env.get('RESEND_FROM_EMAIL')?.trim() ?? 'Dalton Reports <onboarding@resend.dev>';

  if (!resendKey || !notifyTo) {
    console.error('Missing RESEND_API_KEY or REPORT_NOTIFY_EMAIL');
    return new Response(JSON.stringify({ error: 'Email not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const payload = body as Partial<InsertPayload>;
  if (payload.type !== 'INSERT' || payload.table !== 'post_reports' || !payload.record) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const r = payload.record;
  const id = String(r.id ?? '');
  const postId = String(r.post_id ?? '');
  const reporterId = String(r.reporter_id ?? '');
  const reason = String(r.reason ?? '');
  const details = String(r.details ?? '');
  const status = String(r.status ?? 'open');
  const createdAt = String(r.created_at ?? '');

  const subject = `[Dalton] Post report: ${reason} (${status})`;
  const dashboardHint = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
  const editorBase = dashboardHint.replace(/\/$/, '');
  const html = `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5;">
  <h2>New community post report</h2>
  <table style="border-collapse: collapse;">
    <tr><td style="padding: 6px 12px 6px 0;"><strong>Report id</strong></td><td>${escapeHtml(id)}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0;"><strong>Post id</strong></td><td>${escapeHtml(postId)}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0;"><strong>Reporter id</strong></td><td>${escapeHtml(reporterId)}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0;"><strong>Reason</strong></td><td>${escapeHtml(reason)}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0;"><strong>Details</strong></td><td>${escapeHtml(details) || '—'}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0;"><strong>Created</strong></td><td>${escapeHtml(createdAt)}</td></tr>
  </table>
  ${
    editorBase
      ? `<p style="margin-top:16px;color:#555;">Review <code>post_reports</code> in the Supabase dashboard (${escapeHtml(editorBase)}).</p>`
      : ''
  }
</body></html>`;

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [notifyTo],
      subject,
      html,
    }),
  });

  if (!send.ok) {
    const errText = await send.text();
    console.error('Resend error', send.status, errText);
    return new Response(JSON.stringify({ error: 'Email provider rejected request' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
});
