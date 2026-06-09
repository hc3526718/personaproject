/**
 * Issue a signed QR ticket token for the caller's booking (server-only HMAC).
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY, TICKET_HMAC_SECRET
 * Deploy: supabase functions deploy issue-ticket-token --project-ref <REF>
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, isBrowserOriginAllowed } from '../_shared/cors.ts';
import { signTicketToken, type TicketPayloadV1 } from '../_shared/ticketToken.ts';

type Body = { booking_id?: string };

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

  const ticketSecret = (Deno.env.get('TICKET_HMAC_SECRET') ?? '').trim();
  if (!ticketSecret) {
    return new Response(JSON.stringify({ error: 'ticket_secret_missing' }), {
      status: 503,
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 503,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user?.id) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
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

  const bookingId = (body.booking_id ?? '').trim();
  if (!bookingId) {
    return new Response(JSON.stringify({ error: 'booking_id_required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: booking, error: bkErr } = await admin
    .from('bookings')
    .select('id, reference, user_id, event_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (bkErr || !booking) {
    return new Response(JSON.stringify({ error: 'booking_not_found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (booking.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const reference = String(booking.reference ?? '').trim();
  if (!reference) {
    return new Response(JSON.stringify({ error: 'booking_invalid' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const payload: TicketPayloadV1 = {
    v: 1,
    ref: reference,
    uid: user.id,
    ...(booking.event_id ? { eventId: String(booking.event_id) } : {}),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  };

  try {
    const token = await signTicketToken(payload, ticketSecret);
    return new Response(JSON.stringify({ ok: true, token }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sign_failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
