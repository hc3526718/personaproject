/**
 * Fan-out push + email to master accounts when a proposal is submitted.
 * In-app rows are created by DB trigger `trg_notify_masters_new_proposal`.
 *
 * Invoke after successful `content_proposals` insert (client or webhook).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type Body = { proposal_id?: string };

type Prefs = {
  push?: boolean;
  email?: boolean;
  master_proposals?: boolean;
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const fromEmail = (Deno.env.get('PROPOSAL_NOTIFY_FROM') ?? 'Dalton <notifications@dalton-access.vercel.app>').trim();

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const proposalId = body.proposal_id?.trim();
  if (!proposalId) {
    return new Response(JSON.stringify({ error: 'proposal_id_required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: proposal, error: propErr } = await admin
    .from('content_proposals')
    .select('id, kind, payload, author_id')
    .eq('id', proposalId)
    .maybeSingle();

  if (propErr || !proposal) {
    return new Response(JSON.stringify({ error: 'proposal_not_found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const payload = (proposal.payload ?? {}) as Record<string, unknown>;
  const label =
    (typeof payload.title === 'string' && payload.title.trim()) ||
    (typeof payload.brand_name === 'string' && payload.brand_name.trim()) ||
    'New proposal';
  const kind = String(proposal.kind ?? 'media');
  const subject = `Dalton · ${kind} proposal: ${label}`;
  const textBody = `A new ${kind} proposal was submitted and is waiting in Master review.\n\nOpen Dalton → Settings → Master intake → Review proposals.`;

  const { data: masters } = await admin
    .from('profiles')
    .select('id, master_control')
    .eq('master_control', 'yes');

  const masterIds = (masters ?? []).map((m) => m.id as string).filter(Boolean);
  if (masterIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, notified: 0 }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let pushSent = 0;
  let emailSent = 0;

  for (const masterId of masterIds) {
    const { data: authUser } = await admin.auth.admin.getUserById(masterId);
    const masterEmail = authUser?.user?.email?.trim() ?? '';
    const { data: settingsRow } = await admin
      .from('user_settings')
      .select('preferences')
      .eq('user_id', masterId)
      .maybeSingle();

    const prefs = (settingsRow?.preferences as { notification_channels?: Prefs } | null)
      ?.notification_channels;
    const allow = prefs?.master_proposals !== false;
    const allowPush = allow && prefs?.push !== false;
    const allowEmail = allow && prefs?.email !== false;

    if (allowPush) {
      const { data: tokenRow } = await admin
        .from('device_push_tokens')
        .select('expo_push_token')
        .eq('user_id', masterId)
        .maybeSingle();
      const token = tokenRow?.expo_push_token?.trim();
      if (token?.startsWith('ExponentPushToken')) {
        try {
          const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: token,
              title: subject,
              body: label,
              data: { proposal_id: proposalId, kind: 'master_proposal' },
            }),
          });
          if (res.ok) pushSent += 1;
        } catch {
          /* non-fatal */
        }
      }
    }

    if (allowEmail && resendKey && masterEmail) {
      const to = masterEmail;
      if (to) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [to],
              subject,
              text: textBody,
            }),
          });
          if (res.ok) emailSent += 1;
        } catch {
          /* non-fatal */
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, masters: masterIds.length, push_sent: pushSent, email_sent: emailSent }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
