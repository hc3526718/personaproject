/** Server-only ticket QR signing (matches client `ticketToken.ts` format). */

export type TicketPayloadV1 = {
  v: 1;
  ref: string;
  uid: string;
  eventId?: string;
  exp: number;
};

function toBase64Utf8(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

function fromBase64Utf8(b: string): string {
  return decodeURIComponent(escape(atob(b)));
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash), (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function signTicketToken(
  payload: TicketPayloadV1,
  secret: string,
): Promise<string> {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error('ticket_secret_missing');
  const json = JSON.stringify(payload);
  const payloadB64 = toBase64Utf8(json);
  const sig = await sha256Hex(`${trimmed}.${payloadB64}`);
  return `${payloadB64}.${sig}`;
}

export async function verifyTicketToken(
  token: string,
  secret: string,
): Promise<{ ok: true; payload: TicketPayloadV1 } | { ok: false; reason: string }> {
  const trimmed = secret.trim();
  if (!trimmed) return { ok: false, reason: 'not_configured' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [payloadB64, sig] = parts;
  const expected = await sha256Hex(`${trimmed}.${payloadB64}`);
  if (expected !== sig) return { ok: false, reason: 'invalid_signature' };
  let payload: TicketPayloadV1;
  try {
    payload = JSON.parse(fromBase64Utf8(payloadB64)) as TicketPayloadV1;
  } catch {
    return { ok: false, reason: 'invalid_payload' };
  }
  if (payload.v !== 1) return { ok: false, reason: 'unsupported_version' };
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}
