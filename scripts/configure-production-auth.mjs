/**
 * Production auth + email wiring after Resend domain verification.
 *
 * Sets:
 *   - site_url + redirect allow list (daltongrantacademy.uk)
 *   - Send Email hook → send-auth-email
 *   - Email rate limits
 *   - Disables custom SMTP (hook + Resend is the production path)
 *
 * Secrets (run separately if not set):
 *   RESEND_FROM_EMAIL="The Dalton Grant Academy <noreply@daltongrantacademy.uk>"
 *   node scripts/fix-resend-from-email.mjs
 *
 * Usage:
 *   node scripts/configure-production-auth.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN or scripts/_token.tmp
 */
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROJECT_REF = 'txehbzyntvqpkkegjrwp';
const SITE_ORIGIN = (process.env.DALTON_SITE_URL ?? 'https://daltongrantacademy.uk').replace(/\/$/, '');
const HOOK_URI = `https://${PROJECT_REF}.supabase.co/functions/v1/send-auth-email`;

const REDIRECT_URLS = [
  `${SITE_ORIGIN}/app/auth/callback`,
  `${SITE_ORIGIN}/**`,
  `https://www.daltongrantacademy.uk/app/auth/callback`,
  `https://www.daltongrantacademy.uk/**`,
  'http://localhost:8081/app/auth/callback',
  'http://localhost:19006/app/auth/callback',
  'http://localhost:3000/app/auth/callback',
  'com.hc111.daltondemo://auth/callback',
];

function readAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const tmp = join(__dirname, '_token.tmp');
  if (existsSync(tmp)) return readFileSync(tmp, 'utf8').trim();
  throw new Error('Set SUPABASE_ACCESS_TOKEN or run scripts/_get-supabase-token.ps1');
}

function generateHookSecret() {
  return `v1,whsec_${randomBytes(32).toString('base64')}`;
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
  const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET?.trim() || generateHookSecret();

  console.log('[configure-production-auth] Current site_url:', before.site_url);
  console.log('[configure-production-auth] Setting site_url →', SITE_ORIGIN);

  if (!process.env.SEND_EMAIL_HOOK_SECRET?.trim()) {
    const secretsList = execSync(`npx supabase secrets list --project-ref ${PROJECT_REF}`, {
      cwd: root,
      encoding: 'utf8',
    });
    if (/SEND_EMAIL_HOOK_SECRET/.test(secretsList)) {
      console.log(
        '[configure-production-auth] SEND_EMAIL_HOOK_SECRET already set — not rotating (omit hook_send_email_secrets patch).',
      );
    } else {
      console.log('[configure-production-auth] Setting SEND_EMAIL_HOOK_SECRET…');
      execSync(
        `npx supabase secrets set SEND_EMAIL_HOOK_SECRET="${hookSecret}" --project-ref ${PROJECT_REF}`,
        { cwd: root, stdio: 'inherit' },
      );
    }
  } else {
    console.log('[configure-production-auth] Using SEND_EMAIL_HOOK_SECRET from env.');
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'The Dalton Grant Academy <noreply@daltongrantacademy.uk>';
  console.log('[configure-production-auth] Setting RESEND_FROM_EMAIL →', fromEmail);
  execSync(
    `npx supabase secrets set RESEND_FROM_EMAIL="${fromEmail}" --project-ref ${PROJECT_REF}`,
    { cwd: root, stdio: 'inherit' },
  );

  const mergedRedirects = new Set(
    String(before.uri_allow_list ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const url of REDIRECT_URLS) mergedRedirects.add(url);

  const patch = {
    site_url: SITE_ORIGIN,
    uri_allow_list: [...mergedRedirects].join(','),
    hook_send_email_enabled: true,
    hook_send_email_uri: HOOK_URI,
    mailer_autoconfirm: false,
    external_email_enabled: true,
    rate_limit_email_sent: Number(process.env.RATE_LIMIT_EMAIL_SENT ?? 60),
    rate_limit_verify: Number(process.env.RATE_LIMIT_VERIFY ?? 30),
  };

  const secretsList = execSync(`npx supabase secrets list --project-ref ${PROJECT_REF}`, {
    cwd: root,
    encoding: 'utf8',
  });
  const shouldSetHookSecret =
    process.env.SEND_EMAIL_HOOK_SECRET?.trim() || !/SEND_EMAIL_HOOK_SECRET/.test(secretsList);
  if (shouldSetHookSecret) {
    patch.hook_send_email_secrets = hookSecret;
  }

  const after = await patchAuthConfig(token, patch);

  console.log('\n[configure-production-auth] Done.');
  console.log('  site_url:', after.site_url);
  console.log('  hook enabled:', after.hook_send_email_enabled);
  console.log('  hook URI:', after.hook_send_email_uri);
  console.log('  rate_limit_email_sent:', after.rate_limit_email_sent);
  console.log('\nNext: node scripts/verify-auth-email-setup.mjs');
  console.log('      node scripts/check-resend-domain.mjs');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
