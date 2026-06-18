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
  const fromEnv = [
    Deno.env.get('DALTON_WEB_URL') ?? '',
    Deno.env.get('STRIPE_CHECKOUT_BASE_URL') ?? '',
    Deno.env.get('ALLOWED_CORS_ORIGINS') ?? '',
  ]
    .flatMap((raw) => raw.split(','))
    .map((s) => s.trim())
    .filter(Boolean);

  const normalized = fromEnv.flatMap((entry) => {
    try {
      if (entry.startsWith('http://') || entry.startsWith('https://')) {
        const u = new URL(entry);
        const base = `${u.protocol}//${u.host}`;
        const withWww =
          !u.host.startsWith('www.') ? `${u.protocol}//www.${u.host}` : null;
        return withWww ? [base, withWww] : [base];
      }
    } catch {
      /* ignore */
    }
    return [entry];
  });

  return [...new Set([...DEFAULT_ORIGINS, ...normalized])];
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
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, PATCH',
    Vary: 'Origin',
  };
  if (!origin) {
    return { ...base, 'Access-Control-Allow-Origin': allowed[0] };
  }
  if (allowed.includes(origin) || isLocalDevOrigin(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin };
  }
  // Do not echo a mismatched origin — browsers reject preflight when ACAO ≠ request origin.
  return base;
}

/** Webhooks (Stripe / RevenueCat) have no browser Origin — permissive is fine. */
export const webhookCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
