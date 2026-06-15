/**
 * Resend deliverability check for auth sign-up emails.
 *
 * Sandbox `onboarding@resend.dev` only delivers to the Resend account owner email.
 * Production sign-ups require a verified domain and RESEND_FROM_EMAIL on Supabase.
 *
 *   node scripts/check-resend-domain.mjs
 */
import { config } from 'dotenv';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROJECT_REF = 'txehbzyntvqpkkegjrwp';

config({ path: join(root, 'expo-app', '.env') });

const key = process.env.RESEND_API_KEY?.trim();
if (!key) {
  console.error('Set RESEND_API_KEY in expo-app/.env');
  process.exit(1);
}

const TEST_TO = process.env.RESEND_TEST_TO?.trim() || 'signup-test@example.com';
const FROM_CANDIDATES = [
  'The Dalton Grant Academy <onboarding@resend.dev>',
  'The Dalton Grant Academy <noreply@daltongrantacademy.uk>',
];

async function send(from) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [TEST_TO],
      subject: 'DGA Resend domain check',
      html: '<p>ignore</p>',
    }),
  });
  const body = await res.text();
  return { from, status: res.status, body };
}

async function main() {
  console.log('\n=== Resend sign-up email deliverability ===\n');
  console.log(`Test recipient: ${TEST_TO}`);
  console.log('(Sandbox only allows your Resend account owner email.)\n');

  for (const from of FROM_CANDIDATES) {
    const r = await send(from);
    console.log(`From: ${from}`);
    console.log(`  HTTP ${r.status}: ${r.body.slice(0, 280)}\n`);
  }

  try {
    const secrets = execSync(`npx supabase secrets list --project-ref ${PROJECT_REF}`, {
      cwd: root,
      encoding: 'utf8',
    });
    if (/RESEND_FROM_EMAIL/.test(secrets)) {
      console.log('Supabase RESEND_FROM_EMAIL secret: set (value hidden).');
    } else {
      console.log('Supabase RESEND_FROM_EMAIL secret: NOT SET');
    }
  } catch (e) {
    console.warn('Could not list Supabase secrets:', e.message);
  }

  console.log('\nFix: verify a domain at https://resend.com/domains then run:');
  console.log(
    '  RESEND_FROM_EMAIL="The Dalton Grant Academy <noreply@yourdomain.com>" node scripts/fix-resend-from-email.mjs',
  );
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
