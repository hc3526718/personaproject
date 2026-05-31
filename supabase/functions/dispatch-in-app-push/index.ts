/**
 * Sends Expo push for a row in `in_app_notifications` when user prefs allow.
 * Invoke from client (background) or DB trigger via pg_net.
 *
 * Body: { notification_id: string }
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  classifyNotificationCategory,
  sendExpoPush,
  shouldSendExpoPush,
  type InAppNotifyPrefs,
  type NotificationChannels,
} from '../_shared/expoPush.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

  let body: { notification_id?: string };
  try {
    body = (await req.json()) as { notification_id?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const notificationId = body.notification_id?.trim();
  if (!notificationId) {
    return new Response(JSON.stringify({ error: 'notification_id_required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error: rowErr } = await admin
    .from('in_app_notifications')
    .select('id, user_id, title, body, link_type, link_id')
    .eq('id', notificationId)
    .maybeSingle();

  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: 'notification_not_found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const userId = row.user_id as string;
  const title = String(row.title ?? 'Notification').trim();
  const pushBody = String(row.body ?? '').trim() || title;
  const linkType = (row.link_type as string | null) ?? null;
  const linkId = (row.link_id as string | null) ?? null;

  const [{ data: settingsRow }, { data: profileRow }, { data: tokenRow }] = await Promise.all([
    admin.from('user_settings').select('preferences').eq('user_id', userId).maybeSingle(),
    admin.from('profiles').select('master_control').eq('id', userId).maybeSingle(),
    admin.from('device_push_tokens').select('expo_push_token').eq('user_id', userId).maybeSingle(),
  ]);

  const prefs = (settingsRow?.preferences ?? {}) as Record<string, unknown>;
  const channels = (prefs.notification_channels ?? {}) as NotificationChannels;
  const inApp = (prefs.in_app_notify ?? undefined) as InAppNotifyPrefs | undefined;
  const isMaster = (profileRow?.master_control as string | null)?.toLowerCase() === 'yes';

  const category = classifyNotificationCategory(title, pushBody, linkType);
  if (!shouldSendExpoPush({ channels, inApp, category, isMaster })) {
    return new Response(JSON.stringify({ ok: true, push_sent: false, reason: 'prefs' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const token = (tokenRow?.expo_push_token as string | undefined)?.trim() ?? '';
  if (!token) {
    return new Response(JSON.stringify({ ok: true, push_sent: false, reason: 'no_token' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const sent = await sendExpoPush(token, {
    title,
    body: pushBody,
    data: {
      ...(linkType ? { link_type: linkType } : {}),
      ...(linkId ? { link_id: linkId } : {}),
      notification_id: notificationId,
    },
  });

  return new Response(JSON.stringify({ ok: true, push_sent: sent }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
