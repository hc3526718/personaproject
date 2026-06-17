#!/usr/bin/env node
/**
 * Compare Stripe values in your shell to digests deployed on Supabase (via `supabase secrets list`).
 * Does NOT print secret values — only SHA-256 digests.
 *
 * Usage (PowerShell):
 *   $env:STRIPE_SECRET_KEY = "sk_test_..."
 *   $env:STRIPE_WEBHOOK_SECRET = "whsec_..."
 *   $env:STRIPE_PRICE_MONTHLY_ID = "price_1TXP2..."   # optional
 *   $env:STRIPE_PRICE_ANNUAL_ID = "price_1TXP4..."    # optional
 *   node scripts/verify-stripe-supabase-secrets.mjs
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'txehbzyntvqpkkegjrwp';

const KNOWN_PRICE_DIGESTS = {
  '98849ccee5ac96cdce32c22985f6b625ed829674b9b4274b3592d9016233625d': {
    mode: 'test',
    label: 'STRIPE_PRICE_MONTHLY_ID (test)',
    value: 'price_1TXP2BRiVFlZ45SI385a4Hs1',
  },
  '37df5147aaa60516863dae8ea3795806841123d6303824607aa36e8dc1ff2bea': {
    mode: 'test',
    label: 'STRIPE_PRICE_ANNUAL_ID (test)',
    value: 'price_1TXP46RiVFlZ45SIKs5TENQk',
  },
  'a0527f2836134d9f09be1b70b4d0009685acb3d466c5f44f78708c237335a5ef': {
    mode: 'live',
    label: 'STRIPE_PRICE_MONTHLY_ID (live)',
    value: 'price_1TXSERRiVFlZ45SIaDXL6xpx',
  },
  'e28bf818c4745e0611a0760f27d95ace6e2deee203a97ed6c69f83467c6a0fed': {
    mode: 'live',
    label: 'STRIPE_PRICE_ANNUAL_ID (live)',
    value: 'price_1TXSEORiVFlZ45SINHhHucgV',
  },
  '3c32b543f588b0d0d057f8d92de0fb99a5f6aeea5a5d5c6a01624eed7a1b25fe': {
    mode: 'live',
    label: 'STRIPE_PRICE_ACCESS_MONTHLY_ID (live £2/mo)',
    value: 'price_1TbkdqRiVFlZ45SIMWXBnSCH',
  },
  'c1dde5699b88a04630e83b4601e445cdaef1eea1fc5691ed67d270c02ea33735': {
    mode: 'test',
    label: 'STRIPE_PRICE_ACCESS_MONTHLY_ID (test £2/mo)',
    value: 'price_1TcLzSRiVFlZ45SIGrBvr0tm',
  },
};

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function prefixFor(name, value) {
  if (name === 'STRIPE_SECRET_KEY') {
    if (value.startsWith('sk_test_')) return 'sk_test_';
    if (value.startsWith('sk_live_')) return 'sk_live_';
    return 'unknown';
  }
  if (name === 'STRIPE_WEBHOOK_SECRET') {
    return value.startsWith('whsec_') ? 'whsec_' : 'unknown';
  }
  return value.slice(0, 10);
}

function parseSupabaseDigests(stdout) {
  const map = new Map();
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*\|\s*([a-f0-9]{64})\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function fetchSupabaseDigests() {
  try {
    const out = execSync(`npx supabase secrets list --project-ref ${PROJECT_REF}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return parseSupabaseDigests(out);
  } catch (e) {
    console.error('Could not run `supabase secrets list`. Log in with `npx supabase login` first.');
    console.error(e.message ?? e);
    process.exit(2);
  }
}

function describePriceDigest(d) {
  const known = KNOWN_PRICE_DIGESTS[d];
  if (known) return `${known.label} [${known.mode}]`;
  return 'unknown price id';
}

console.log(`Supabase project ref: ${PROJECT_REF}\n`);

const remote = fetchSupabaseDigests();
const names = [
  'STRIPE_PRICE_ACCESS_MONTHLY_ID',
  'STRIPE_PRICE_MONTHLY_ID',
  'STRIPE_PRICE_ANNUAL_ID',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

let allOk = true;

console.log('--- Deployed on Supabase (digest only) ---');
for (const name of names) {
  const d = remote.get(name);
  if (!d) {
    console.log(`${name}: (not set on Supabase)`);
    allOk = false;
    continue;
  }
  const extra =
    name.startsWith('STRIPE_PRICE_') ? ` → ${describePriceDigest(d)}` : '';
  console.log(`${name}: ${d}${extra}`);
}

console.log('\n--- Your shell env vs Supabase ---');
for (const name of names) {
  const local = (process.env[name] ?? '').trim();
  const remoteDigest = remote.get(name);

  if (!remoteDigest) {
    console.log(`${name}: skip (missing on Supabase)`);
    continue;
  }

  if (!local) {
    console.log(`${name}: (not in shell — set $env:${name} to compare)`);
    continue;
  }

  const localDigest = digest(local);
  const ok = localDigest === remoteDigest;
  if (!ok) allOk = false;

  console.log(
    `${name}: ${ok ? 'MATCH' : 'MISMATCH'} | prefix ${prefixFor(name, local)} | len ${local.length}`,
  );
  if (!ok) {
    console.log(`  local digest:   ${localDigest}`);
    console.log(`  remote digest:  ${remoteDigest}`);
    if (name.startsWith('STRIPE_PRICE_')) {
      console.log(`  remote looks like: ${describePriceDigest(remoteDigest)}`);
      const localKnown = Object.entries(KNOWN_PRICE_DIGESTS).find(([, v]) => v.value === local);
      if (localKnown) console.log(`  local looks like: ${localKnown[1].label} (${localKnown[1].mode})`);
    }
  }
}

const monthlyRemote = remote.get('STRIPE_PRICE_MONTHLY_ID');
if (monthlyRemote) {
  const skLocal = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  const skTest = skLocal.startsWith('sk_test_');
  const monthlyIsTest =
    monthlyRemote === '98849ccee5ac96cdce32c22985f6b625ed829674b9b4274b3592d9016233625d';
  const monthlyIsLive =
    monthlyRemote === 'a0527f2836134d9f09be1b70b4d0009685acb3d466c5f44f78708c237335a5ef';

  console.log('\n--- Mode sanity ---');
  if (monthlyIsTest) console.log('Supabase prices: TEST (price_1TXP…) — correct with sk_test_.');
  if (monthlyIsLive) console.log('Supabase prices: LIVE (price_1TXS…) — checkout fails if STRIPE_SECRET_KEY is sk_test_.');
  if (skLocal && skTest && monthlyIsLive) {
    console.log('WARNING: sk_test_ in shell but LIVE prices on Supabase.');
    allOk = false;
  }
  if (skLocal && !skTest && !skLocal.startsWith('sk_live_')) {
    console.log('WARNING: STRIPE_SECRET_KEY prefix not sk_test_ or sk_live_.');
  }
}

console.log(`
Notes:
- MISMATCH here means "what you typed in the shell" ≠ "what is deployed on Supabase" — not "Stripe Dashboard is wrong".
- Webhook fix for invalid_signature: copy Signing secret from the Stripe endpoint whose URL is
  https://${PROJECT_REF}.supabase.co/functions/v1/stripe-webhook
  then: npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..." --project-ref ${PROJECT_REF}
- After set, re-run this script; STRIPE_WEBHOOK_SECRET should MATCH.
- expo-app/.env uses STRIPE_PRICE_* for live IDs; use STRIPE_TEST_PRICE_ID_* or export test IDs when verifying.
`);

process.exit(allOk ? 0 : 1);
