#!/usr/bin/env node
/**
 * Verify Stripe secret *prefixes* and price-id digests against Supabase secret list digests.
 *
 * Usage (PowerShell) — paste test keys only, never commit:
 *   $env:STRIPE_SECRET_KEY = "sk_test_..."
 *   $env:STRIPE_WEBHOOK_SECRET = "whsec_..."
 *   node scripts/verify-stripe-supabase-secrets.mjs
 */
import { createHash } from 'node:crypto';

const EXPECTED = {
  /** Test-mode prices (Stripe Dashboard → Test mode ON). */
  STRIPE_PRICE_MONTHLY_ID: {
    value: 'price_1TXP2BRiVFlZ45SI385a4Hs1',
    digest: '98849ccee5ac96cdce32c22985f6b625ed829674b9b4274b3592d9016233625d',
  },
  STRIPE_PRICE_ANNUAL_ID: {
    value: 'price_1TXP46RiVFlZ45SIKs5TENQk',
    digest: '37df5147aaa60516863dae8ea3795806841123d6303824607aa36e8dc1ff2bea',
  },
  /** Live-mode prices (only if STRIPE_SECRET_KEY is sk_live_). */
  STRIPE_PRICE_MONTHLY_ID_LIVE: {
    value: 'price_1TXSERRiVFlZ45SIaDXL6xpx',
    digest: 'a0527f2836134d9f09be1b70b4d0009685acb3d466c5f44f78708c237335a5ef',
  },
  STRIPE_PRICE_ANNUAL_ID_LIVE: {
    value: 'price_1TXSEORiVFlZ45SINHhHucgV',
    digest: 'e28bf818c4745e0611a0760f27d95ace6e2deee203a97ed6c69f83467c6a0fed',
  },
  STRIPE_SECRET_KEY: {
    digest: 'aec6edab1bfa2a7d95e757ba5d6b56c7722acbf005e39b376d72cf82a6a4993e',
  },
  STRIPE_WEBHOOK_SECRET: {
    digest: '98afc15f9349a52c22d5f48516a51dfdca516ad677a5f107a12b6553198e5e3f',
  },
};

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function check(name, value, expectedDigest) {
  if (!value) {
    console.log(`${name}: (not provided in env — skip)`);
    return null;
  }
  const d = digest(value);
  const ok = d === expectedDigest;
  const prefix =
    name === 'STRIPE_SECRET_KEY'
      ? value.startsWith('sk_test_')
        ? 'sk_test_'
        : value.startsWith('sk_live_')
          ? 'sk_live_'
          : 'unknown'
      : name === 'STRIPE_WEBHOOK_SECRET'
        ? value.startsWith('whsec_')
          ? 'whsec_'
          : 'unknown'
        : value.slice(0, 10);
  console.log(
    `${name}: digest ${ok ? 'MATCH' : 'MISMATCH'} Supabase | prefix ${prefix} | len ${value.length}`,
  );
  return ok;
}

console.log('Supabase project ref: txehbzyntvqpkkegjrwp\n');

let allOk = true;
for (const [name, cfg] of Object.entries(EXPECTED)) {
  if (name.endsWith('_LIVE')) continue;
  const envVal = process.env[name] ?? cfg.value ?? '';
  const ok = check(name, envVal, cfg.digest);
  if (ok === false) allOk = false;
}

const monthlyDigest = EXPECTED.STRIPE_PRICE_MONTHLY_ID.digest;
const annualDigest = EXPECTED.STRIPE_PRICE_ANNUAL_ID.digest;
const liveMonthly = EXPECTED.STRIPE_PRICE_MONTHLY_ID_LIVE.digest;
const liveAnnual = EXPECTED.STRIPE_PRICE_ANNUAL_ID_LIVE.digest;
console.log('\nSupabase price ID mode check (read digests from `supabase secrets list`):');
console.log(
  '  If monthly digest matches TEST row → test prices configured (correct for sk_test_).',
);
console.log(
  '  If monthly digest matches LIVE row → live prices with sk_test_ will fail checkout.',
);

if (!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.log(
    '\nTip: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the shell to confirm they match Supabase (digests only).',
  );
  console.log('Price IDs already match Supabase digests for the documented test price IDs.');
}

process.exit(allOk ? 0 : 1);
