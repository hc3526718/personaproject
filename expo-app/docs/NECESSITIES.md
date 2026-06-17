# NECESSITIES — one-shot ops

Quick reference for operations that are not self-service in the app.

## Master control access (one SQL)

Replace `your-master@email.com` and `123456` (your chosen 6-digit PIN), then run in the Supabase SQL editor.

```sql
WITH target AS (
  SELECT u.id
  FROM auth.users u
  WHERE lower(coalesce(u.email, '')) = lower('your-master@email.com')
)
UPDATE public.profiles p
SET
  master_control = 'yes',
  master_pin_hash = encode(
    digest(trim('123456') || p.id::text || 'dalton_master_v1', 'sha256'),
    'hex'
  )
FROM target t
WHERE p.id = t.id;
```

**After running:** sign out and sign back in so `master_control` loads. Enter the PIN in the app under **Profile → Master control** (or **Settings → Security**).

### Change master PIN

```sql
UPDATE public.profiles p
SET master_pin_hash = encode(
  digest(trim('NEW_6_DIGIT_PIN') || p.id::text || 'dalton_master_v1', 'sha256'),
  'hex'
)
FROM auth.users u
WHERE p.id = u.id
  AND lower(coalesce(u.email, '')) = lower('your-master@email.com')
  AND p.master_control = 'yes';
```

### Remove master access

```sql
UPDATE public.profiles
SET master_control = 'no', master_pin_hash = null
WHERE id = '<profile-uuid>';
```

More detail: [MASTER_CONTROL.env](./MASTER_CONTROL.env).

## Auth email confirmation (production)

Signup emails must link to `https://daltongrantacademy.uk/email-confirmed?token_hash=...` (not the Supabase `/auth/v1/verify` URL directly).

1. Deploy `send-auth-email` Edge Function (Send Email hook enabled in Supabase Auth).
2. Deploy marketing site (`vercel-build`) so `/email-confirmed` uses `shared/email-confirmed-page.js`.
3. Request a **new** confirmation email from the app — old emails may lack `token_hash` in the link.

## Deploy master PIN verification

```bash
supabase functions deploy verify-master-pin --project-ref txehbzyntvqpkkegjrwp
```

## Skip £2/mo academy access paywall (exempt accounts)

**Configured exempt emails (production):** `haydncampbell22@gmail.com`, `daltongrant@hotmail.co.uk`

**Option A — email allowlist (app build / EAS env)**

Set on Vercel, EAS, or `expo-app/.env`, then rebuild native app / redeploy web:

```env
EXPO_PUBLIC_ACCESS_EXEMPT_EMAILS=haydncampbell22@gmail.com,daltongrant@hotmail.co.uk
```

These accounts bypass the mandatory paywall in the app (master control and admin roles are already exempt).

**Option B — mark paid in Supabase (no app rebuild)**

Grants access server-side; works for Apple reviewers and comp accounts:

```sql
INSERT INTO public.subscription_state (user_id, is_payment_verified, is_pro)
SELECT u.id, true, true
FROM auth.users u
WHERE lower(coalesce(u.email, '')) IN (
  lower('haydncampbell22@gmail.com'),
  lower('daltongrant@hotmail.co.uk')
)
ON CONFLICT (user_id) DO UPDATE
SET is_payment_verified = true, is_pro = true, updated_at = now();
```

Sign out and back in after running SQL. User must already exist in `auth.users` (sign up once first).

**Option C — master control**

Master accounts (`profiles.master_control = 'yes'`) are already paywall-exempt.

## App Store reviewer / tester account

Use a **real email** you control (e.g. `daltongrant@hotmail.co.uk`) because confirmation emails are sent in production.

**Recommended setup (reviewer skips signup + paywall):**

1. **Create the account once** — sign up in the app (or Supabase Auth → Add user) with the reviewer email and a strong password.
2. **Confirm email** — either complete the confirmation link once, or in Supabase Dashboard → Authentication → Users → select user → confirm email.
3. **Run paywall exempt SQL** (Option B above) for that email.
4. **Complete onboarding once** in the app (profile setup) so the reviewer lands straight in the main app after Log In.
5. **App Review notes** — paste username + password only. State that the account is pre-verified and has complimentary access; subscription signup and new-account flows are documented in the notes / demo video.

**What reviewers will not exercise with this account:** new sign-up + email confirmation, password reset, and first-time IAP purchase. Mention that in App Review notes, or provide a **second Sandbox-only account** without exempt SQL if Apple must test IAP.

**Your own testing:** use a separate email without exempt SQL when you need to test paywall and signup flows end-to-end.

## Production deployment (web + native auto-submit)

One-shot commands for shipping **marketing + web** (`daltongrantacademy.uk`) and **store binaries** (TestFlight / App Store / Play). Run from a machine with `git` pushed to GitHub, `eas-cli` logged in, and Vercel CLI linked.

### Pre-flight (every release)

1. **Commit and push** — EAS builds the latest commit on your branch (not unstaged local files).
2. **Bump marketing version** in `expo-app/app.config.js` → `version` (e.g. `1.0.1` → `1.0.2`) when App Store / Play require it. Build numbers auto-increment via `eas.json` → `production.autoIncrement`.
3. **EAS Production environment** ([expo.dev](https://expo.dev) → project **dalton-demo** → Environment variables → **production**) must include at least:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon>
EXPO_PUBLIC_DALTON_WEB_URL=https://daltongrantacademy.uk
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_...
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_ACCESS_EXEMPT_EMAILS=haydncampbell22@gmail.com,daltongrant@hotmail.co.uk
```

Optional but recommended: `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_TICKET_SIGNING_SECRET`. Never put service-role or webhook secrets in `EXPO_PUBLIC_*`.

4. **Store submit credentials (one-time)** — In Expo dashboard or via `eas credentials`: Apple App Store Connect API key (iOS submit). Google Play service account JSON (Android submit). `eas.json` already defines `submit.production`.

More detail: `docs/SECRETS_CHECKLIST.md`, `docs/TESTFLIGHT.md`, `docs/STORE_RELEASE.md`.

### 1. Deploy marketing + web app (Vercel)

Custom domain **`daltongrantacademy.uk`** must point at the **`personaproject`** Vercel project (not a stale preview).

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app

# First time only (link to production project):
npx vercel link --project personaproject

# Production deploy:
npx vercel deploy --prod --yes
```

**Verify:** `https://daltongrantacademy.uk/email-confirmed` loads the confirmation page; `https://daltongrantacademy.uk/app` opens the web app.

Set the same `EXPO_PUBLIC_*` values on Vercel **Production** env if the web app needs them at build time.

### 2. Deploy Supabase Edge Functions (when auth/backend changed)

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app

supabase functions deploy send-auth-email --project-ref txehbzyntvqpkkegjrwp
supabase functions deploy verify-master-pin --project-ref txehbzyntvqpkkegjrwp
```

Add any other functions you changed in the same session.

### 3. Native production build + auto-submit (stores)

From `expo-app`, after `npm i -g eas-cli` and `eas login`:

**iOS → TestFlight / App Store Connect (build + submit in one step):**

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app

eas build --platform ios --profile production --auto-submit
```

**Android → Google Play (internal / production track):**

```powershell
eas build --platform android --profile production --auto-submit
```

**Both platforms:**

```powershell
eas build --platform all --profile production --auto-submit
```

`--auto-submit` uses the `submit.production` profile in `eas.json` and uploads the finished artifact when the build completes. First run may prompt for ASC / Play credentials; store them in Expo for non-interactive runs.

**Non-interactive (CI or repeat deploys):**

```powershell
eas build --platform ios --profile production --auto-submit --non-interactive
```

**Build only, submit later:**

```powershell
eas build --platform ios --profile production
# after build finishes:
eas submit --platform ios --latest --profile production
```

```powershell
eas build --platform android --profile production
eas submit --platform android --latest --profile production
```

**Clean rebuild** (if TestFlight crashes on launch with a stale binary):

```powershell
eas build --platform ios --profile production --auto-submit --clear-cache
```

| `eas.json` profile | Use |
|--------------------|-----|
| `development` | Dev client (Metro) |
| `preview` | Internal testing |
| **`production`** | **App Store / Play** — `distribution: store`, `autoIncrement: true`, iOS `sdk-54` |

Bundle ID / package: `com.hc111.daltondemo` (must match App Store Connect and Play Console).

### 4. After deploy

1. **App Store Connect** → TestFlight → wait for processing (~10–30 min) → install on device; icon should read **The Dalton Grant Academy**.
2. When ready for review: ASC → **Submit for Review** (auto-submit only uploads the build; review is still manual unless you use ASC automation).
3. **Google Play** → confirm the new AAB on your chosen track → roll out.
4. **Smoke test on the store build:** sign in (email + OAuth), complete onboarding (≤3 steps), welcome tour, community feed, paywall / exempt account.
5. **Auth email:** request a **new** signup confirmation after Vercel deploy — old links may lack `token_hash`.

App Review tester setup: section **App Store reviewer / tester account** above.

## Web checkout (Stripe) — fix “couldn’t start checkout”

Web paywall calls Edge Function `stripe-create-checkout` with `plan: access` (£2/mo). Secrets must use **matching Stripe mode** (all test or all live).

**Supabase Edge secrets** (`txehbzyntvqpkkegjrwp`):

```powershell
# Test checkout on daltongrantacademy.uk (card 4242 4242 4242 4242):
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_..." --project-ref txehbzyntvqpkkegjrwp
npx supabase secrets set STRIPE_PRICE_ACCESS_MONTHLY_ID=price_1TcLzSRiVFlZ45SIGrBvr0tm --project-ref txehbzyntvqpkkegjrwp
npx supabase secrets set STRIPE_CHECKOUT_BASE_URL=https://daltongrantacademy.uk/app --project-ref txehbzyntvqpkkegjrwp

npx supabase functions deploy stripe-create-checkout --project-ref txehbzyntvqpkkegjrwp
```

**Verify digests** (no secret values printed):

```powershell
$env:STRIPE_SECRET_KEY = "sk_test_..."
node scripts/verify-stripe-supabase-secrets.mjs
```

**Production live checkout:** replace `sk_test_` with `sk_live_`, set `STRIPE_PRICE_ACCESS_MONTHLY_ID` to your **live** £2/mo `price_…`, and set Vercel `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…`.

**After paying:** Stripe webhook → `subscription_state.is_payment_verified`; tap **I already paid — refresh access** or reload the app.
