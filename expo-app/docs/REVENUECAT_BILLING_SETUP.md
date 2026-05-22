# RevenueCat + web billing setup (Grant Access)

Use this checklist after creating **Web Billing** and **App Store** products in RevenueCat.

## Architecture in this repo

| Channel | Client | Server truth |
|---------|--------|----------------|
| iOS / Android | `react-native-purchases` + Paywall UI | `subscription_state.is_pro` + RC SDK |
| Web | Stripe Checkout via `stripe-create-checkout` | Stripe webhook → `subscription_state` |

Premium resolution (`resolvePremiumAccess.ts`):

1. If `subscription_state.is_pro` → **premium** (all platforms)  
2. Else on native → RevenueCat `CustomerInfo`  
3. Else on web → DB only  

**Goal:** One Supabase user id → one entitlement, regardless of where they paid.

---

## 1. RevenueCat dashboard

1. **Project** — note Project ID (`EXPO_PUBLIC_REVENUECAT_PROJECT_ID` for tooling only).  
2. **Entitlement** — identifier must match `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (default: `premium`).  
3. **iOS app** — App Store Connect bundle id; public SDK key → `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` (`appl_…`).  
4. **Android app** — Play Console app; public SDK key → `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` (`goog_…`).  
5. **Offering** — lookup key e.g. `Official Offering` → optional `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER`.  
6. **Web Billing** — connect Stripe; create web products/prices in RC.

---

## 2. Code already wired

- Native paywall: `presentRevenueCatPaywall()`  
- **User id sync:** `identifyRevenueCatUser(supabaseUserId)` on login (`SubscriptionContext`) — required so RC Web + mobile share one customer  
- Web checkout: `startStripeCheckout()` → Edge Function  
- Web return: `?stripe_checkout=success` handled by `useStripeCheckoutReturn`

---

## 3. EAS / Expo environment variables

Set in **EAS → Environment variables** (production + preview):

```env
EXPO_PUBLIC_DALTON_WEB_URL=https://dalton-access.vercel.app
EXPO_PUBLIC_WEB_BASE_PATH=/app
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_...
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_...
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER=Official Offering
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

> Use **`EXPO_PUBLIC_`** prefix (not `EAS_PUBLIC_`). EAS injects these at build time.

Supabase **Edge Function secrets** (never in Expo):

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY_ID=price_...   # from Stripe linked to RC Web Billing
STRIPE_PRICE_ANNUAL_ID=price_...    # optional
STRIPE_CHECKOUT_BASE_URL=https://dalton-access.vercel.app/app
```

Deploy:

```bash
supabase functions deploy stripe-create-checkout --project-ref <REF>
supabase functions deploy stripe-webhook --project-ref <REF>
```

Stripe webhook URL: `https://<REF>.supabase.co/functions/v1/stripe-webhook`  
Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 4. RevenueCat webhooks (recommended for App Store purchases)

**Gap today:** No `revenuecat-webhook` Edge Function in repo — mobile purchases may not update `subscription_state` until you add one.

**Manual setup:**

1. RevenueCat → Integrations → Webhooks → add endpoint (your Supabase function or worker).  
2. On `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, map `app_user_id` → `subscription_state` upsert (same shape as `stripe-webhook`).  
3. Verify webhook authorization header per RC docs.

Until deployed, native users rely on RevenueCat SDK locally; web relies on Stripe webhook — **cross-platform premium** needs both webhooks writing the same table.

---

## 5. Avoid double billing

Tell users: subscribe **once**, same email everywhere.

- Web paid → do not also subscribe in App Store for same account.  
- App Store paid → use **Restore purchases** on other iOS devices; web reads `subscription_state` after RC webhook.

Refunds: Apple/Google/Stripe dashboards — not in-app.

---

## 6. Test matrix

| Case | Expected |
|------|----------|
| Web Stripe checkout | `subscription_state.is_pro` true; web + mobile premium after refresh |
| iOS sandbox purchase | RC active entitlement; DB updated after RC webhook |
| Restore purchases | Same Apple ID → premium on device |
| Log out / log in | `Purchases.logIn` same user id → entitlements follow |

---

## 7. App Store Connect

- Subscription group + products linked in RC  
- Paid Applications Agreement active  
- App Store metadata privacy/support URLs → `https://dalton-access.vercel.app/...`

See `docs/APP_STORE_METADATA.md`.
