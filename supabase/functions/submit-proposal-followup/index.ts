/**
 * Emails Dalton team when an approved proposal author submits follow-up content.
 * Client calls after `submit_proposal_followup` RPC succeeds.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type Body = { proposal_id?: string };

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
  const teamRaw = (Deno.env.get('PROPOSAL_TEAM_EMAIL') ?? Deno.env.get('REPORT_NOTIFY_EMAIL') ?? '').trim();
  const fromEmail = (Deno.env.get('PROPOSAL_NOTIFY_FROM') ?? 'Dalton <notifications@daltongrantacademy.vercel.app>').trim();

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
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

  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes.user?.id) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { data: proposal, error: propErr } = await admin
    .from('content_proposals')
    .select(
      'id, kind, status, payload, followup_notes, followup_asset_urls, followup_submitted_at, author_id',
    )
    .eq('id', proposalId)
    .eq('author_id', userRes.user.id)
    .maybeSingle();

  if (propErr || !proposal) {
    return new Response(JSON.stringify({ error: 'proposal_not_found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (proposal.status !== 'approved' || !proposal.followup_submitted_at) {
    return new Response(JSON.stringify({ error: 'followup_not_submitted' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { data: authorProfile } = await admin
    .from('profiles')
    .select('display_name, username')
    .eq('id', proposal.author_id)
    .maybeSingle();

  const { data: authorAuth } = await admin.auth.admin.getUserById(proposal.author_id);
  const authorEmail = authorAuth?.user?.email ?? '(unknown)';

  const payload = (proposal.payload ?? {}) as Record<string, unknown>;
  const label =
    (typeof payload.title === 'string' && payload.title.trim()) ||
    (typeof payload.brand_name === 'string' && payload.brand_name.trim()) ||
    proposal.id;

  const notes = String(proposal.followup_notes ?? '').trim() || '(none)';
  const assets = (proposal.followup_asset_urls ?? []) as string[];
  const assetBlock = assets.length
    ? assets.map((u) => `- ${u}`).join('\n')
    : '(no extra files)';

  const text = [
    `Approved proposal follow-up submitted`,
    ``,
    `Proposal: ${label}`,
    `Kind: ${proposal.kind}`,
    `Author: ${authorProfile?.display_name ?? authorProfile?.username ?? proposal.author_id}`,
    `Author email: ${authorEmail}`,
    `Proposal ID: ${proposal.id}`,
    ``,
    `Additional notes:`,
    notes,
    ``,
    `Additional assets:`,
    assetBlock,
  ].join('\n');

  const teamEmails = teamRaw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);

  let emailed = 0;
  if (resendKey && teamEmails.length) {
    for (const to of teamEmails) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: `Dalton · Approved proposal follow-up: ${label}`,
          text,
        }),
      });
      if (res.ok) emailed += 1;
    }
    if (authorEmail && authorEmail !== '(unknown)') {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [authorEmail],
          subject: `Dalton · We received your follow-up for "${label}"`,
          text: `Thanks — your extra details and assets were sent to the Dalton team for review.\n\n${notes}`,
        }),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, emailed }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
