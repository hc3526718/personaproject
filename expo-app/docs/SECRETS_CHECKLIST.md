# What you need to paste / configure (outside the repo)

Use this when moving from demo to production. **Roadmap:** `docs/NEXT_STEPS.md` (especially §3–§7).

## Supabase

- [ ] Project URL + **anon** key → `.env` as `EXPO_PUBLIC_SUPABASE_*`
- [ ] **Service role** key → server / Edge Functions only (never in the app)
- [ ] Run `backend/schema.sql` (adjust RLS policies)
- [ ] Storage buckets + policies for `media_assets` paths
- [ ] Optional: Apple/Google OAuth in Authentication settings

## Stripe (paid classes)

- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` on server
- [ ] Webhook endpoint for `checkout.session.completed` / payment intents
- [ ] Price IDs on `events` rows

## RevenueCat

- [ ] iOS + Android API keys in `.env` (see `REVENUECAT.md`)
- [ ] Webhook to your API to sync `subscription_state`

## EAS / stores

- [ ] `eas secret:create` for any private env not prefixed with `EXPO_PUBLIC_`
- [ ] Apple Developer: certificates, identifiers, App Store Connect app
- [ ] Google Play: service account for `eas submit` (optional)

## Tickets / QR

- [ ] Replace `EXPO_PUBLIC_TICKET_SIGNING_SECRET` with a strong secret; mirror on server for `POST /checkin`

## Optional analytics

- [ ] Sentry / Amplitude keys as EAS secrets if you add SDKs

If you tell me which provider you enabled first (Supabase vs Stripe vs RevenueCat), we can wire the smallest vertical slice end-to-end in a follow-up session.

## Apple Wallet (PassKit) — Edge Function secrets

Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (never in the Expo app). Used by `wallet-generate-pass` and `wallet-passes`.

- [ ] `APPLE_PASS_TYPE_ID` — e.g. `pass.com.hc111.daltondemo.event` (must match Apple Developer Pass Type ID)
- [ ] `APPLE_TEAM_ID` — 10-character Team ID
- [ ] `APPLE_WWDR_CERT_PEM` — Apple WWDR intermediate cert (PEM, real newlines or `\n`)
- [ ] `APPLE_SIGNER_CERT_PEM` — Pass Type ID certificate (PEM)
- [ ] `APPLE_SIGNER_KEY_PEM` — matching private key (PEM)
- [ ] `APPLE_SIGNER_KEY_PASSPHRASE` — only if the key is encrypted
- [ ] `TICKET_HMAC_SECRET` — strong random secret; must match production ticket signing (prefer server-only; do **not** ship a real secret as `EXPO_PUBLIC_TICKET_SIGNING_SECRET`)

### Create the Pass Type ID (Apple Developer)

1. [developer.apple.com/account](https://developer.apple.com/account) → **Identifiers** → **Pass Type IDs** → create (e.g. `pass.com.hc111.daltondemo.event`).
2. **Certificates** → create a **Pass Type ID Certificate** for that ID → download `.cer`.
3. Export signing cert + private key as PEM (Keychain / OpenSSL). Keep the private key off git and off the device.
4. Download current **Apple WWDR** G4 (or current) intermediate PEM from Apple PKI.
5. Paste all PEMs + Team ID + Pass Type ID into Supabase secrets above.
6. Smoke-test: signed-in user `POST` to `/functions/v1/wallet-generate-pass` with `{ "reference": "<booking ref>" }` → `application/vnd.apple.pkpass`.

### App / EAS (after secrets work)

- [ ] Booking UI calls `wallet-generate-pass` and opens/shares the `.pkpass`
- [ ] Host check-in uses `verify-ticket-token` + `host_check_in_booking` (camera scan in a native build)
- [ ] Marketing copy for “Add to Apple Wallet” only after a successful TestFlight pass add

