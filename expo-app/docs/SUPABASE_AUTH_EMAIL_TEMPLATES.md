# Supabase Auth email templates (Dalton)

Paste these into **Supabase Dashboard → Authentication → Email Templates**.  
Use a **public HTTPS logo URL** (see [Logo hosting](#logo-hosting) below).

**Enable in Dashboard → Authentication → Providers → Email:**

- Confirm email: **ON** (mandatory for email/password sign-up)
- Secure email change: **ON** (recommended for Settings → Change email)
- Magic link / OTP: leave **OFF** (not used in the app)

**Delivery (production):** Auth mail is sent via the **`send-auth-email`** Edge Function (Supabase **Send Email** hook) using the **Resend HTTP API** (`RESEND_API_KEY` secret). Re-run `node scripts/configure-auth-email-hook.mjs` after deploy if the hook URI changes.

**SMTP (optional fallback):** If you disable the hook, use [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp) with username **`resend`** (literal) and your API key as the password — not your email address.

---

## Shared HTML wrapper

Replace `{{LOGO_URL}}` and `{{SITE_URL}}` in each template (or use Supabase `{{ .SiteURL }}` where noted).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Dalton Grant Academy</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111111;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="https://daltongrantacademy.uk/brand/dalton_logo_final_img.png" width="160" height="auto" alt="The Dalton Grant Academy" style="display:block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e8e8e8;border-radius:12px;padding:28px 24px;">
              {{BODY}}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;font-size:12px;color:#666666;text-align:center;">
              <p style="margin:0 0 12px;">© The Dalton Grant Academy. All rights reserved.</p>
              <p style="margin:0 0 12px;">
                <a href="https://daltongrantacademy.uk/privacy" style="color:#111111;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="https://daltongrantacademy.uk/terms" style="color:#111111;">Terms</a>
                &nbsp;·&nbsp;
                <a href="https://daltongrantacademy.uk/" style="color:#111111;">Home</a>
                &nbsp;·&nbsp;
                <a href="https://daltongrantacademy.uk/contact-us" style="color:#111111;">Contact</a>
              </p>
              <p style="margin:0;font-size:11px;color:#999999;">
                You received this message because of activity on your Dalton Grant Academy account.
                If you did not request this, you can ignore it or contact us via the website contact form.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 1. Confirm sign up

**Subject:** `Confirm your Dalton Grant Academy account`

**Body** (inside the card — Supabase variables):

```html
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111111;">Confirm your email</h1>
<p style="margin:0 0 16px;color:#333333;">Thanks for joining The Dalton Grant Academy. Tap the button below to verify <strong>{{ .Email }}</strong> and finish creating your account.</p>
<p style="margin:0 0 24px;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#c8a84b;color:#0a0a0a;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;">Confirm email</a>
</p>
<p style="margin:0;font-size:13px;color:#666666;">Or copy this link into your browser:<br /><span style="word-break:break-all;">{{ .ConfirmationURL }}</span></p>
```

App behaviour: `AuthContext.signUp` sends this automatically; users must confirm before `signInWithPassword` succeeds. No in-app “resend” button required (they can sign up again or use Support).

---

## 2. Reset password

**Subject:** `Reset your Dalton password`

```html
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111111;">Reset your password</h1>
<p style="margin:0 0 16px;color:#333333;">We received a request to reset the password for <strong>{{ .Email }}</strong>. This link opens the app so you can choose a new password.</p>
<p style="margin:0 0 24px;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#c8a84b;color:#0a0a0a;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;">Reset password</a>
</p>
<p style="margin:0;font-size:13px;color:#666666;">If you did not request a reset, ignore this email. Your password will not change.</p>
```

App: **Log In → Forgot Password** → `PasswordRecovery` screen after link.

---

## 3. Change email address

**Subject:** `Confirm your new email address`

```html
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111111;">Confirm email change</h1>
<p style="margin:0 0 16px;color:#333333;">You asked to change the email on your Dalton account. Confirm to complete the update.</p>
<p style="margin:0 0 24px;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#c8a84b;color:#0a0a0a;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;">Confirm new email</a>
</p>
<p style="margin:0;font-size:13px;color:#666666;">Until confirmed, sign-in still uses your previous email. Premium billing on Apple or Stripe is not changed automatically.</p>
```

App: **Settings → Account & Security → Change email address** only.

---

## Do not enable in app

| Template | Reason |
|----------|--------|
| Invite user | Not used — no invite flow |
| Magic link / OTP | Not used — email/password + OAuth only |
| Reauthentication | Not used — no sensitive in-app step requiring reauth |

---

## Logo hosting

Emails need an **absolute HTTPS** image URL (many clients block embedded attachments).

**Recommended:** host on your Vercel marketing site:

1. Copy `expo-app/assets/dalton_logo_final_img.png` to `web-deploy/brand/dalton_logo_final_img.png` (add to `scripts/vercel-build.mjs` copy step if needed).
2. After deploy, use:  
   `https://daltongrantacademy.uk/brand/dalton_logo_final_img.png`

**Alternative:** Supabase Storage public bucket `brand/dalton_logo_final_img.png` with a public URL.

Test the URL in a browser before pasting into templates.

---

## Redirect URLs (required)

Authentication → URL configuration:

- **Site URL:** `https://daltongrantacademy.uk`
- **Redirect URLs:**  
  - `https://daltongrantacademy.uk/email-confirmed` (signup / reset success page → deep link to app)  
  - `https://daltongrantacademy.uk/app/auth/callback`  
  - `dalton-demo://auth/callback` (native)

See `docs/BACKEND_AUTH.md`.
