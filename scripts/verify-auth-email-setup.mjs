/**
 * Read-only health check: auth email hook, rate limits, Resend secret, send-auth-email function.
 *
 *   node scripts/verify-auth-email-setup.mjs
 */
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
  if (existsSync(tmp)) return readFileSync(tmp, 'utf8').trim();
  throw new Error('Set SUPABASE_ACCESS_TOKEN or run scripts/_get-supabase-token.ps1');
}

async function main() {
  const token = readAccessToken();
  const issues = [];
  const ok = [];

  const authRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!authRes.ok) {
    throw new Error(`Auth config GET failed (${authRes.status})`);
  }
  const auth = await authRes.json();

  if (auth.hook_send_email_enabled) {
    ok.push('Send Email hook is enabled.');
  } else {
    issues.push('hook_send_email_enabled is false — run node scripts/configure-auth-email-hook.mjs');
  }

  if (auth.hook_send_email_uri === HOOK_URI) {
    ok.push(`Hook URI matches send-auth-email (${HOOK_URI}).`);
  } else {
    issues.push(`Hook URI mismatch: ${auth.hook_send_email_uri ?? '(unset)'} expected ${HOOK_URI}`);
  }

  if (auth.mailer_autoconfirm === false) {
    ok.push('Email confirmation required (mailer_autoconfirm=false).');
  } else {
    issues.push('mailer_autoconfirm is true — sign-ups skip email verification.');
  }

  const emailLimit = auth.rate_limit_email_sent ?? 0;
  if (emailLimit >= 30) {
    ok.push(`rate_limit_email_sent=${emailLimit} (OK for production).`);
  } else {
    issues.push(
      `rate_limit_email_sent=${emailLimit} is very low — run node scripts/configure-auth-rate-limits.mjs`,
    );
  }

  const fnRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (fnRes.ok) {
    const fns = await fnRes.json();
    const hookFn = fns.find?.((f) => f.slug === 'send-auth-email');
    if (hookFn?.status === 'ACTIVE') {
      ok.push(`Edge Function send-auth-email is ACTIVE (v${hookFn.version}).`);
    } else {
      issues.push('send-auth-email function missing or not ACTIVE — deploy with supabase functions deploy send-auth-email');
    }
  }

  try {
    const { execSync } = await import('node:child_process');
    const secrets = execSync(`npx supabase secrets list --project-ref ${PROJECT_REF}`, {
      cwd: root,
      encoding: 'utf8',
    });
    if (/RESEND_API_KEY/.test(secrets)) {
      ok.push('RESEND_API_KEY secret is set on the project.');
    } else {
      issues.push('RESEND_API_KEY secret missing — auth hook cannot send mail.');
    }
    if (/SEND_EMAIL_HOOK_SECRET/.test(secrets)) {
      ok.push('SEND_EMAIL_HOOK_SECRET is set.');
    } else {
      issues.push('SEND_EMAIL_HOOK_SECRET missing — hook signature verification will fail.');
    }
  } catch (e) {
    issues.push(`Could not list Supabase secrets: ${e.message}`);
  }

  console.log('\n=== Auth email setup ===\n');
  for (const line of ok) console.log(`  ✓ ${line}`);
  for (const line of issues) console.log(`  ✗ ${line}`);

  if (issues.length > 0) {
    console.log('\nFix issues above, then re-run this script.\n');
    process.exit(1);
  }
  console.log('\nAll checks passed.\n');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
