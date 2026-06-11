/**
 * Deploy auth email hook wiring: SEND_EMAIL_HOOK_SECRET + Management API auth config.
 *
 * Reads Supabase personal access token from scripts/_token.tmp (run _get-supabase-token.ps1 first)
 * or SUPABASE_ACCESS_TOKEN env var.
 */
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROJECT_REF = 'txehbzyntvqpkkegjrwp';
const HOOK_URI = `https://${PROJECT_REF}.supabase.co/functions/v1/send-auth-email`;

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

function generateHookSecret() {
  const raw = randomBytes(32).toString('base64');
  return `v1,whsec_${raw}`;
}

async function patchAuthConfig(token, hookSecret) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hook_send_email_enabled: true,
      hook_send_email_uri: HOOK_URI,
      hook_send_email_secrets: hookSecret,
      mailer_autoconfirm: false,
      rate_limit_email_sent: Number(process.env.RATE_LIMIT_EMAIL_SENT ?? 60),
      rate_limit_verify: Number(process.env.RATE_LIMIT_VERIFY ?? 30),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Auth config PATCH failed (${res.status}): ${text}`);
  }
  return text;
}

async function main() {
  const token = readAccessToken();
  const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET?.trim() || generateHookSecret();

  console.log('[configure-auth-email-hook] Setting SEND_EMAIL_HOOK_SECRET on project…');
  execSync(
    `npx supabase secrets set SEND_EMAIL_HOOK_SECRET="${hookSecret}" --project-ref ${PROJECT_REF}`,
    { cwd: root, stdio: 'inherit' },
  );

  console.log('[configure-auth-email-hook] Enabling Send Email hook…');
  await patchAuthConfig(token, hookSecret);

  console.log('[configure-auth-email-hook] Done.');
  console.log(`  Hook URI: ${HOOK_URI}`);
  console.log('  Auth emails now route through send-auth-email → Resend HTTP API.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
