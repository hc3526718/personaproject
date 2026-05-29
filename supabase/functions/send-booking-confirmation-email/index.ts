/**
 * Sends a booking confirmation email to the signed-in user via Resend.
 *
 * Secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Optional: RESEND_FROM_EMAIL, DALTON_WEB_URL
 *
 * Deploy: supabase functions deploy send-booking-confirmation-email --project-ref <REF>
 *
 * Body: { booking_id: string } or { reference: string }
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendBookingConfirmationEmail } from '../_shared/bookingConfirmationEmail.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
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

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: { booking_id?: string; reference?: string };
  try {
    body = (await req.json()) as { booking_id?: string; reference?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let bookingId = (body.booking_id ?? '').trim();
  const reference = (body.reference ?? '').trim();

  if (!bookingId && reference) {
    const { data: row } = await admin
      .from('bookings')
      .select('id')
      .eq('reference', reference)
      .eq('user_id', user.id)
      .maybeSingle();
    bookingId = row?.id ?? '';
  }

  if (!bookingId) {
    return new Response(JSON.stringify({ error: 'booking_id_required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const result = await sendBookingConfirmationEmail(admin, {
    bookingId,
    userId: user.id,
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.error === 'forbidden' ? 403 : 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, skipped: result.skipped === true, reason: result.reason ?? null }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
