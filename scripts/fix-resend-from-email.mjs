/**
 * Clear invalid RESEND_FROM_EMAIL (e.g. *@*.vercel.app) so auth mail uses Resend sandbox sender.
 * For production deliverability, verify your domain in Resend and set:
 *   RESEND_FROM_EMAIL="The Dalton Grant Academy <noreply@yourdomain.com>"
 *
 *   node scripts/fix-resend-from-email.mjs
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROJECT_REF = 'txehbzyntvqpkkegjrwp';
const SANDBOX_FROM = 'The Dalton Grant Academy <onboarding@resend.dev>';
const PRODUCTION_FROM = 'The Dalton Grant Academy <noreply@daltongrantacademy.uk>';

const from = process.env.RESEND_FROM_EMAIL?.trim() || PRODUCTION_FROM;

console.log(`[fix-resend-from-email] Setting RESEND_FROM_EMAIL to: ${from}`);
execSync(
  `npx supabase secrets set RESEND_FROM_EMAIL="${from}" --project-ref ${PROJECT_REF}`,
  { cwd: root, stdio: 'inherit' },
);
console.log('[fix-resend-from-email] Done. Redeploy send-auth-email if you changed function code.');
