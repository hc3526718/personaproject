/**
 * Apple PassKit Web Service endpoints (register / unregister / fetch / list updates).
 * webServiceURL in each pass points here.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PKPass } from 'npm:passkit-generator@3.5.7';

const PASS_TYPE = Deno.env.get('APPLE_PASS_TYPE_ID') ?? 'pass.com.grantaccess.event';
const TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? '';
const TICKET_SECRET = (Deno.env.get('TICKET_HMAC_SECRET') ?? '').trim();

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

function pathAfterFunction(url: URL): string {
  const raw = url.pathname;
  const marker = '/wallet-passes';
  const idx = raw.indexOf(marker);
  return idx >= 0 ? raw.slice(idx + marker.length) : raw;
}

async function buildPassForBooking(bookingId: string): Promise<Uint8Array | null> {
  if (!TEAM_ID || !Deno.env.get('APPLE_WWDR_CERT_PEM')) return null;

  const { data: booking } = await admin()
    .from('bookings')
    .select('id, reference, pass_voided, wallet_auth_token, event_id, user_id, events(title, starts_at, venue), profiles(display_name, first_name, last_name, username)')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking?.wallet_auth_token) return null;

  const ev = booking.events as { title?: string; starts_at?: string; venue?: string | null } | null;
  const profile = booking.profiles as {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  } | null;
  const voided = Boolean(booking.pass_voided);
  const webServiceURL = `${Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')}/functions/v1/wallet-passes`;

  const memberName =
    profile?.display_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    (profile?.username?.trim() ? `@${profile.username.trim()}` : '') ||
    'Member';

  const qrToken = await signTicketToken({
    v: 1,
    ref: booking.reference,
    uid: booking.user_id,
    eventId: booking.event_id ?? undefined,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  });

  const eventDate = ev?.starts_at
    ? new Date(ev.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';
  const eventTime = ev?.starts_at
    ? new Date(ev.starts_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
    : 'TBA';

  const icon1 = Uint8Array.from(atob(ICON_B64_1X), (c) => c.charCodeAt(0));
  const icon2 = Uint8Array.from(atob(ICON_B64_2X), (c) => c.charCodeAt(0));
  const icon3 = Uint8Array.from(atob(ICON_B64_3X), (c) => c.charCodeAt(0));

  const pass = new PKPass(
    {
      'icon.png': icon1,
      'icon@2x.png': icon2,
      'icon@3x.png': icon3,
    },
    {
      wwdr: Deno.env.get('APPLE_WWDR_CERT_PEM')!,
      signerCert: Deno.env.get('APPLE_SIGNER_CERT_PEM')!,
      signerKey: Deno.env.get('APPLE_SIGNER_KEY_PEM')!,
      signerKeyPassphrase: Deno.env.get('APPLE_SIGNER_KEY_PASSPHRASE') ?? undefined,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: PASS_TYPE,
      teamIdentifier: TEAM_ID,
      serialNumber: booking.id,
      organizationName: 'The Dalton Grant Academy',
      description: 'The Dalton Grant Academy Event',
      logoText: 'The Dalton Grant Academy',
      foregroundColor: 'rgb(212, 208, 200)',
      backgroundColor: 'rgb(10, 10, 10)',
      labelColor: 'rgb(200, 168, 75)',
      voided,
      webServiceURL,
      authenticationToken: booking.wallet_auth_token,
    },
  );

  pass.type = 'eventTicket';
  pass.primaryFields.push({
    key: 'event',
    label: 'EVENT',
    value: voided ? `${ev?.title ?? 'Event'} — ATTENDED` : (ev?.title ?? 'Event'),
  });
  pass.secondaryFields.push(
    { key: 'date', label: 'DATE', value: eventDate },
    { key: 'time', label: 'TIME', value: eventTime },
  );
  pass.auxiliaryFields.push(
    { key: 'location', label: 'LOCATION', value: ev?.venue?.trim() || 'Venue TBA' },
    { key: 'member', label: 'MEMBER', value: memberName },
  );
  pass.backFields.push({ key: 'booking_ref', label: 'BOOKING REF', value: booking.reference });
  if (voided) {
    pass.backFields.push({
      key: 'thanks',
      label: 'NOTE',
      value: 'Thanks for attending. This pass can now be removed.',
    });
  }
  pass.setBarcodes({
    message: qrToken,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });
  const buf = pass.getAsBuffer();
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

function toBase64Utf8(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signTicketToken(payload: {
  v: 1;
  ref: string;
  uid: string;
  eventId?: string;
  exp: number;
}): Promise<string> {
  if (!TICKET_SECRET) throw new Error('Ticket signing secret is not configured.');
  const json = JSON.stringify(payload);
  const payloadB64 = toBase64Utf8(json);
  const sig = await sha256Hex(`${TICKET_SECRET}.${payloadB64}`);
  return `${payloadB64}.${sig}`;
}

// PassKit required icons (29px @1x/2x/3x) — baked in to keep deploy self-contained.
// Generated from `expo-app/assets/dalton_logo_final_img-icons/iOS/Icon-29*.png`.
const ICON_B64_1X =
  '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';
const ICON_B64_2X =
  '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';
const ICON_B64_3X =
  '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';

async function verifyPassAuth(serial: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const { data } = await admin()
    .from('bookings')
    .select('wallet_auth_token')
    .eq('id', serial)
    .maybeSingle();
  return data?.wallet_auth_token === token;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const subPath = pathAfterFunction(url);
  const authToken = req.headers.get('Authorization')?.replace(/^ApplePass\s+/i, '') ?? null;

  // POST /v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}
  const regMatch = subPath.match(
    /^\/v1\/devices\/([^/]+)\/registrations\/([^/]+)\/([^/]+)\/?$/,
  );
  if (req.method === 'POST' && regMatch) {
    const [, deviceId, passTypeId, serial] = regMatch;
    if (!(await verifyPassAuth(serial, authToken))) {
      return new Response('Unauthorized', { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { pushToken?: string };
    if (!body.pushToken) return new Response('Bad Request', { status: 400 });

    const { data: booking } = await admin()
      .from('bookings')
      .select('id, user_id')
      .eq('id', serial)
      .maybeSingle();
    if (!booking) return new Response('Not Found', { status: 404 });

    await admin().from('wallet_passes').upsert(
      {
        booking_id: booking.id,
        user_id: booking.user_id,
        device_library_id: deviceId,
        push_token: body.pushToken,
        pass_type_id: passTypeId,
        serial_number: serial,
      },
      { onConflict: 'device_library_id,pass_type_id,serial_number' },
    );
    return new Response(null, { status: 201 });
  }

  // DELETE unregister
  if (req.method === 'DELETE' && regMatch) {
    const [, deviceId, passTypeId, serial] = regMatch;
    await admin()
      .from('wallet_passes')
      .delete()
      .eq('device_library_id', deviceId)
      .eq('pass_type_id', passTypeId)
      .eq('serial_number', serial);
    return new Response(null, { status: 200 });
  }

  // GET /v1/passes/{passTypeId}/{serialNumber}
  const passMatch = subPath.match(/^\/v1\/passes\/([^/]+)\/([^/]+)\/?$/);
  if (req.method === 'GET' && passMatch) {
    const [, , serial] = passMatch;
    if (!(await verifyPassAuth(serial, authToken))) {
      return new Response('Unauthorized', { status: 401 });
    }
    const buf = await buildPassForBooking(serial);
    if (!buf) return new Response('Not Found', { status: 404 });
    return new Response(buf, {
      headers: { 'Content-Type': 'application/vnd.apple.pkpass', 'Last-Modified': new Date().toUTCString() },
    });
  }

  // GET /v1/devices/{deviceId}/registrations/{passTypeId}?passesUpdatedSince=tag
  const listMatch = subPath.match(/^\/v1\/devices\/([^/]+)\/registrations\/([^/]+)\/?$/);
  if (req.method === 'GET' && listMatch) {
    const [, deviceId, passTypeId] = listMatch;
    const since = url.searchParams.get('passesUpdatedSince');
    let q = admin()
      .from('wallet_passes')
      .select('serial_number, created_at')
      .eq('device_library_id', deviceId)
      .eq('pass_type_id', passTypeId);
    if (since) q = q.gt('created_at', new Date(Number(since) * 1000).toISOString());
    const { data } = await q;
    const serialNumbers = (data ?? []).map((r) => r.serial_number);
    return new Response(JSON.stringify({ serialNumbers, lastUpdated: String(Math.floor(Date.now() / 1000)) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Not Found', { status: 404 });
});
