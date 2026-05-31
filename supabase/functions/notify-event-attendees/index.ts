/**
 * Push notifications to users booked on an event when details change.
 * In-app rows are created by DB trigger `trg_notify_booked_users_on_event_update`.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type Body = { event_id?: string };

type Prefs = {
  push?: boolean;
  event_reminders?: boolean;
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
  const eventId = body.event_id?.trim();
  if (!eventId) {
    return new Response(JSON.stringify({ error: 'event_id_required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ev, error: evErr } = await admin
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .maybeSingle();

  if (evErr || !ev) {
    return new Response(JSON.stringify({ error: 'event_not_found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const title = String(ev.title ?? 'Event').trim() || 'Event';
  const pushTitle = 'Event updated';
  const pushBody = `${title} has new details.`;

  const { data: bookings } = await admin.from('bookings').select('user_id').eq('event_id', eventId);
  const userIds = [...new Set((bookings ?? []).map((b) => b.user_id as string).filter(Boolean))];
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, push_sent: 0 }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let pushSent = 0;

  for (const userId of userIds) {
    const { data: settingsRow } = await admin
      .from('user_settings')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();

    const prefs = (settingsRow?.preferences as { notification_channels?: Prefs } | null)
      ?.notification_channels;
    const allowPush = prefs?.push !== false && prefs?.event_reminders !== false;
    if (!allowPush) continue;

    const { data: tokenRow } = await admin
      .from('device_push_tokens')
      .select('expo_push_token')
      .eq('user_id', userId)
      .maybeSingle();
    const token = tokenRow?.expo_push_token?.trim();
    if (!token?.startsWith('ExponentPushToken')) continue;

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          title: pushTitle,
          body: pushBody,
          data: { event_id: eventId, link_type: 'event', link_id: eventId },
        }),
      });
      if (res.ok) pushSent += 1;
    } catch {
      /* non-fatal */
    }
  }

  return new Response(JSON.stringify({ ok: true, push_sent: pushSent }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
