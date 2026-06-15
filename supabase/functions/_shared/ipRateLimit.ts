import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

export type IpRateLimitResult =
  | { ok: true; hitCount: number }
  | { ok: false; retryAfterSec: number; hitCount: number };

export async function checkIpRateLimit(
  admin: SupabaseClient,
  req: Request,
  scope: string,
  limit: number,
  windowSec: number,
): Promise<IpRateLimitResult> {
  const ip = clientIp(req).slice(0, 64);
  const { data, error } = await admin.rpc('edge_ip_rate_limit_hit', {
    p_scope: scope,
    p_client_ip: ip,
    p_window_sec: windowSec,
    p_limit: limit,
  });

  if (error) {
    console.error('[ipRateLimit] rpc failed', scope, error.message);
    return { ok: true, hitCount: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const allowed = Boolean(row?.allowed ?? true);
  const retryAfterSec = Number(row?.retry_after_sec ?? 0);
  const hitCount = Number(row?.hit_count ?? 0);

  if (!allowed) {
    return { ok: false, retryAfterSec, hitCount };
  }
  return { ok: true, hitCount };
}

export function rateLimitResponse(
  cors: Record<string, string>,
  retryAfterSec: number,
): Response {
  return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
    status: 429,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, retryAfterSec)),
    },
  });
}

export function readRateLimitEnv(
  prefix: string,
  defaults: { limit: number; windowSec: number },
): { limit: number; windowSec: number } {
  const limit = Number(Deno.env.get(`${prefix}_MAX`) ?? defaults.limit);
  const windowSec = Number(Deno.env.get(`${prefix}_WINDOW_SEC`) ?? defaults.windowSec);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : defaults.limit,
    windowSec: Number.isFinite(windowSec) && windowSec > 0 ? windowSec : defaults.windowSec,
  };
}
