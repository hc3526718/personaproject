#!/usr/bin/env node
/**
 * Create RevenueCat sandbox webhook DAWebHook-Sandbox (API v2).
 * Requires: REVENUECAT_API_V2_SECRET_KEY (Dashboard → Project → API keys → Secret)
 *
 * Usage (PowerShell):
 *   $env:REVENUECAT_API_V2_SECRET_KEY = "sk_..."
 *   $env:REVENUECAT_WEBHOOK_AUTH = "Bearer <same token as Supabase REVENUECAT_WEBHOOK_AUTHORIZATION>"
 *   node scripts/revenuecat-sandbox-webhook.mjs
 */
const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID ?? 'proj88ab5ee7';
const WEBHOOK_URL =
  process.env.REVENUECAT_WEBHOOK_URL ??
  'https://txehbzyntvqpkkegjrwp.supabase.co/functions/v1/revenuecat-webhook';
const NAME = 'DAWebHook-Sandbox';

const apiKey = (process.env.REVENUECAT_API_V2_SECRET_KEY ?? '').trim();
const authHeader = (process.env.REVENUECAT_WEBHOOK_AUTH ?? '').trim();

if (!apiKey) {
  console.error('Missing REVENUECAT_API_V2_SECRET_KEY (RevenueCat API v2 secret key).');
  process.exit(1);
}
if (!authHeader) {
  console.error(
    'Missing REVENUECAT_WEBHOOK_AUTH — set to the same value as Supabase REVENUECAT_WEBHOOK_AUTHORIZATION, e.g. "Bearer <token>" or just the token.',
  );
  process.exit(1);
}

const authorization_header = authHeader.startsWith('Bearer ')
  ? authHeader
  : `Bearer ${authHeader}`;

const base = `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/integrations/webhooks`;

async function rc(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`RevenueCat API ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function main() {
  const list = await rc('');
  const items = list?.items ?? [];
  const existing = items.find((w) => w.name === NAME);
  if (existing) {
    console.log(`Already exists: ${NAME} (${existing.id}) environment=${existing.environment}`);
    return;
  }
  const sameUrl = items.find((w) => w.url === WEBHOOK_URL);
  if (sameUrl) {
    console.error(
      `RevenueCat already has a webhook on this URL (${sameUrl.name}, env=${sameUrl.environment}).`,
    );
    console.error(
      'Cannot add DAWebHook-Sandbox with the same URL (409). Use update-webhook-integration to set environment to sandbox/null on the existing integration, or use a different URL.',
    );
    process.exit(1);
  }

  const created = await rc('', {
    method: 'POST',
    body: {
      name: NAME,
      url: WEBHOOK_URL,
      authorization_header,
      environment: 'sandbox',
      event_types: null,
      app_id: null,
    },
  });

  console.log('Created sandbox webhook:', JSON.stringify(created, null, 2));
}

main().catch((e) => {
  console.error(e.message ?? e);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});
