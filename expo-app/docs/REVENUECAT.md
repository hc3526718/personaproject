# RevenueCat & premium entitlements

**Related:** `docs/NEXT_STEPS.md` §4, `docs/MONETIZATION.md`, `docs/ACCESS_MODEL.md` §7, `docs/SECRETS_CHECKLIST.md`.

## Entitlement

- App checks entitlement id **`premium`** (see `src/subscriptions/revenueCat.ts`).
- Free tier: browse events, limited saves (enforce in API later).
- Premium: unlimited saves, early booking, offline media, ad-free — gate in UI + server.

## App setup

1. Create a RevenueCat project; add iOS and Android apps matching your bundle IDs.
2. Create **Entitlement** `premium` and attach **Offering** / products from App Store Connect / Play Console.
3. Set in `.env`:
   - `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
   - `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
4. **Expo Go**: SDK is skipped (`executionEnvironment === 'expoGo'`). Use an **EAS development** or **preview** build to test purchases.

## Backend webhook (server truth)

1. In RevenueCat dashboard → **Integrations** → **Webhooks** → your API URL, e.g. `POST https://api.yourapp.com/webhooks/revenuecat`.
2. Verify webhook signature per RevenueCat docs.
3. Upsert `subscription_state` (see `backend/schema.sql`): `user_id`, `is_pro`, `entitlement_ids`, `raw`.
4. API routes that require premium must read **database**, not only the client.

## Paywall UI

- **Settings → Premium** opens `PaywallScreen` (refresh / restore).
