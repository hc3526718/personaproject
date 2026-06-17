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
