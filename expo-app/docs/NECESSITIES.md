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
