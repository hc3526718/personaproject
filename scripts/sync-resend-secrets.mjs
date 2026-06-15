/**
 * Sync Resend secrets from expo-app/.env to Supabase Edge Functions.
 * Does not print secret values.
 */
import { config } from 'dotenv';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROJECT_REF = 'txehbzyntvqpkkegjrwp';

config({ path: join(root, 'expo-app', '.env') });

const key = process.env.RESEND_API_KEY?.trim();
const from =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  'The Dalton Grant Academy <noreply@daltongrantacademy.uk>';

if (!key) {
  console.error('RESEND_API_KEY missing in expo-app/.env');
  process.exit(1);
}

execSync(`npx supabase secrets set RESEND_API_KEY="${key}" --project-ref ${PROJECT_REF}`, {
  cwd: root,
  stdio: 'inherit',
});
execSync(`npx supabase secrets set RESEND_FROM_EMAIL="${from}" --project-ref ${PROJECT_REF}`, {
  cwd: root,
  stdio: 'inherit',
});

console.log('[sync-resend-secrets] RESEND_API_KEY + RESEND_FROM_EMAIL synced (values hidden).');
