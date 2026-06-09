/**
 * Verify a signed ticket QR token (server holds TICKET_HMAC_SECRET).
 * Used by host check-in when the client no longer bundles the signing secret.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, isBrowserOriginAllowed } from '../_shared/cors.ts';
import { verifyTicketToken } from '../_shared/ticketToken.ts';

type Body = { token?: string };

Deno.serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (!isBrowserOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const ticketSecret = (Deno.env.get('TICKET_HMAC_SECRET') ?? '').trim();
  if (!ticketSecret) {
    return new Response(JSON.stringify({ error: 'ticket_secret_missing' }), {
      status: 503,
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

  const token = (body.token ?? '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'token_required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const result = await verifyTicketToken(token, ticketSecret);
  if (!result.ok) {
    return new Response(JSON.stringify({ ok: false, reason: result.reason }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, payload: result.payload }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
