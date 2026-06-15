/**
 * Invoke send-auth-email with a signed test payload.
 * Requires the live hook secret — use test-signup-email.mjs for end-to-end instead.
 *
 *   ROTATE_HOOK_SECRET=1 node scripts/test-auth-hook.mjs  # re-sync hook secret + send test mail
 */
import { randomBytes, createHmac } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROJECT_REF = 'txehbzyntvqpkkegjrwp';
const HOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/send-auth-email`;

function generateHookSecret() {
  return `v1,whsec_${randomBytes(32).toString('base64')}`;
}

function signWebhook(payload, secret) {
  const raw = secret.replace(/^v1,whsec_/, '');
  const msgId = `msg_${randomBytes(8).toString('hex')}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signed = `${msgId}.${ts}.${body}`;
  const sig = createHmac('sha256', Buffer.from(raw, 'base64'))
    .update(signed)
    .digest('base64');
  return {
    headers: {
      'webhook-id': msgId,
      'webhook-timestamp': ts,
      'webhook-signature': `v1,${sig}`,
      'Content-Type': 'application/json',
    },
    body,
  };
}

async function main() {
  if (process.env.ROTATE_HOOK_SECRET !== '1') {
    console.error('[test-auth-hook] Set ROTATE_HOOK_SECRET=1 to sync secret and send a test mail.');
    console.error('For production checks use: node scripts/test-signup-email.mjs you@example.com');
    process.exit(1);
  }

  const hookSecret = process.env.HOOK_SECRET?.trim() || generateHookSecret();
  execSync(
    `npx supabase secrets set SEND_EMAIL_HOOK_SECRET="${hookSecret}" --project-ref ${PROJECT_REF}`,
    { cwd: root, stdio: 'inherit' },
  );
  const token = readFileSync(join(__dirname, '_token.tmp'), 'utf8').trim();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hook_send_email_enabled: true,
      hook_send_email_uri: HOOK_URL,
      hook_send_email_secrets: hookSecret,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  console.log('[test-auth-hook] Hook secret synced to Auth + Edge.');

  const payload = {
    user: { email: process.env.TEST_EMAIL?.trim() || 'haydncampbell22@gmail.com' },
    email_data: {
      token: '000000',
      token_hash: 'test-token-hash',
      redirect_to: 'https://daltongrantacademy.uk/app/auth/callback',
      email_action_type: 'signup',
      site_url: 'https://daltongrantacademy.uk',
    },
  };

  const { headers, body } = signWebhook(payload, hookSecret);
  const resp = await fetch(HOOK_URL, { method: 'POST', headers, body });
  const text = await resp.text();
  console.log('HTTP', resp.status);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
