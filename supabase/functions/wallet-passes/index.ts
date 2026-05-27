/**
 * Apple PassKit Web Service endpoints (register / unregister / fetch / list updates).
 * webServiceURL in each pass points here.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PKPass } from 'npm:passkit-generator@3.3.2';

const PASS_TYPE = Deno.env.get('APPLE_PASS_TYPE_ID') ?? 'pass.com.grantaccess.event';
const TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? '';

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
    .select('id, reference, pass_voided, wallet_auth_token, events(title, starts_at, venue), profiles(full_name)')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking?.wallet_auth_token) return null;

  const ev = booking.events as { title?: string; starts_at?: string; venue?: string | null } | null;
  const profile = booking.profiles as { full_name?: string | null } | null;
  const voided = Boolean(booking.pass_voided);
  const webServiceURL = `${Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')}/functions/v1/wallet-passes`;

  const passJson = {
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
    eventTicket: {
      primaryFields: [
        {
          key: 'event',
          label: 'EVENT',
          value: voided ? `${ev?.title ?? 'Event'} — ATTENDED` : (ev?.title ?? 'Event'),
        },
      ],
      secondaryFields: [
        {
          key: 'date',
          label: 'DATE',
          value: ev?.starts_at
            ? new Date(ev.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'TBA',
        },
      ],
      backFields: [
        { key: 'booking_ref', label: 'BOOKING REF', value: booking.reference },
        ...(voided
          ? [{ key: 'thanks', label: 'NOTE', value: 'Thanks for attending. This pass can now be removed.' }]
          : []),
      ],
    },
    barcode: {
      message: booking.reference,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
    },
  };

  const pass = new PKPass(
    {},
    {
      wwdr: Deno.env.get('APPLE_WWDR_CERT_PEM')!,
      signerCert: Deno.env.get('APPLE_SIGNER_CERT_PEM')!,
      signerKey: Deno.env.get('APPLE_SIGNER_KEY_PEM')!,
      signerKeyPassphrase: Deno.env.get('APPLE_SIGNER_KEY_PASSPHRASE') ?? undefined,
    },
    passJson,
  );
  const buf = pass.getAsBuffer();
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

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
