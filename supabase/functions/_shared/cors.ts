/** CORS for browser-called Edge Functions (not server webhooks). */
const DEFAULT_ORIGINS = [
  'https://daltongrantacademy.vercel.app',
  /** www subdomain (Stripe return URLs, bookmarks, previews) */
  'https://www.daltongrantacademy.vercel.app',
  /** Legacy Vercel project URL (still referenced by older deploys) */
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

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = allowedOrigins();
  const match = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': match,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

/** True when Origin is absent (server-to-server) or matches an allowed marketing/app origin. */
export function isBrowserOriginAllowed(req: Request): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return true;
  return allowedOrigins().includes(origin);
}

/** Webhooks (Stripe / RevenueCat) have no browser Origin — permissive is fine. */
export const webhookCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
