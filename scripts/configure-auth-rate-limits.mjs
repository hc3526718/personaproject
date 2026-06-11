/**
 * Raise Supabase Auth email rate limits (Management API).
 *
 * Default hook/SMTP projects often ship with rate_limit_email_sent = 2/hour,
 * which triggers "email rate limit exceeded" during sign-up testing.
 *
 * Usage:
 *   node scripts/configure-auth-rate-limits.mjs
 *   RATE_LIMIT_EMAIL_SENT=100 node scripts/configure-auth-rate-limits.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN or scripts/_token.tmp (see _get-supabase-token.ps1).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'txehbzyntvqpkkegjrwp';

function readAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const tmp = join(__dirname, '_token.tmp');
  if (existsSync(tmp)) {
    return readFileSync(tmp, 'utf8').trim();
  }
  throw new Error('Set SUPABASE_ACCESS_TOKEN or run scripts/_get-supabase-token.ps1');
}

async function getAuthConfig(token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET auth config failed (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function patchAuthConfig(token, body) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH auth config failed (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function main() {
  const token = readAccessToken();
  const before = await getAuthConfig(token);
  const emailLimit = Number(process.env.RATE_LIMIT_EMAIL_SENT ?? 60);
  const verifyLimit = Number(process.env.RATE_LIMIT_VERIFY ?? 30);

  console.log('[configure-auth-rate-limits] Before:', {
    rate_limit_email_sent: before.rate_limit_email_sent,
    rate_limit_verify: before.rate_limit_verify,
    hook_send_email_enabled: before.hook_send_email_enabled,
  });

  await patchAuthConfig(token, {
    rate_limit_email_sent: emailLimit,
    rate_limit_verify: verifyLimit,
  });

  const after = await getAuthConfig(token);
  console.log('[configure-auth-rate-limits] After:', {
    rate_limit_email_sent: after.rate_limit_email_sent,
    rate_limit_verify: after.rate_limit_verify,
  });
  console.log('[configure-auth-rate-limits] Done.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
