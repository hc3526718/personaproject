/** CORS for browser-called Edge Functions (not server webhooks). */
const DEFAULT_ORIGINS = [
  'https://daltongrantacademy.uk',
  'https://www.daltongrantacademy.uk',
  'https://daltongrantacademy.vercel.app',
  'https://www.daltongrantacademy.vercel.app',
  'https://dalton-access.vercel.app',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:3000',
];

function allowedOrigins(): string[] {
  const extra = (Deno.env.get('ALLOWED_CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      (hostname === 'localhost' || hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export function isBrowserOriginAllowed(req: Request): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return true;
  if (allowedOrigins().includes(origin)) return true;
  if (isLocalDevOrigin(origin)) return true;
  return false;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = allowedOrigins();
  let match = allowed[0];
  if (origin && (allowed.includes(origin) || isLocalDevOrigin(origin))) {
    match = origin;
  }
  return {
    'Access-Control-Allow-Origin': match,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

/** Webhooks (Stripe / RevenueCat) have no browser Origin — permissive is fine. */
export const webhookCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
