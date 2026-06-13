# App Store Connect — App Review notes

Paste the sections below into **App Review Information → Notes** when submitting **The Dalton Grant Academy** (bundle `com.hc111.daltondemo`).

---

## Demo account (required)

| Field | Value |
|-------|--------|
| **Username** | `[CREATE: reviewer+dga@yourdomain.com — pre-verified email]` |
| **Password** | `[SET: strong password — share in Notes only]` |

**Before submit:** Create this account in production Supabase, confirm email in Dashboard (or sign up in-app and verify), and complete onboarding once so reviewers land on the access paywall, not profile setup.

**Optional second account** with an active **Sandbox** Apple subscription (see Subscriptions below) so reviewers can enter the app without purchasing.

---

## Subscription model

The Dalton Grant Academy uses a **mandatory £2/month academy access** subscription (auto-renewable) to fund content and community infrastructure.

| Step | What reviewers see |
|------|-------------------|
| 1 | Sign in or create account (email, Apple, or Google). |
| 2 | Complete brief onboarding / OAuth profile setup if prompted. |
| 3 | **Academy access screen** — tap **Subscribe with App Store** → RevenueCat paywall → Sandbox purchase. |
| 4 | After purchase, **Restore purchases** and **Refresh access** are on the same screen if needed. |

**What the subscription unlocks:**

- Community feed (posts, comments, reactions)
- Direct messages and follow requests
- Media library (training / podcast content)
- Events (discover, book, QR check-in)
- Sponsor listings
- Athlete profile and settings

**Billing:**

- **iOS:** Apple In-App Purchase via RevenueCat (`Official Offering` / academy access product).
- **Web:** Stripe (not shown on iOS build).
- **Privacy Policy & Terms:** On the RevenueCat paywall template **and** as links on the access screen footer. Also: Profile → Settings → Legal.

**Cancel subscription:** iOS Settings → Apple ID → Subscriptions. Deleting the Dalton account does not cancel Apple billing — copy in Profile → Settings → Delete account explains this.

---

## Sandbox IAP testing

1. Use a **Sandbox Apple ID** (App Store Connect → Users and Access → Sandbox).
2. Sign in to the demo account in the app.
3. On the academy access screen, tap **Subscribe with App Store**.
4. Complete purchase in the RevenueCat / StoreKit sheet.
5. If the app does not unlock immediately, tap **I already paid — refresh access**.

---

## Account deletion

**Path:** Profile → Settings → scroll to **Delete account** → Continue → type **DELETE** (iOS prompt).

- Calls production Edge Function `delete-own-account`.
- Removes `auth.users` row; Postgres rows cascade via `profiles` FK (`posts`, `messages`, `bookings`, `subscription_state`, etc.).
- User-owned Storage objects under `profiles/`, `posts/`, `events/`, `proposals/`, and `messages/` are purged before auth deletion.
- `security_audit_log` records `self_delete_account` (retained for security; no PII beyond user id).

Reviewers should **cancel Apple subscription separately** before deleting if they subscribed during review.

---

## Sign in with Apple & Hide My Email

- **Sign in with Apple** is on the login and sign-up screens (iOS).
- Users who choose **Hide My Email** receive a `@privaterelay.appleid.com` address in Supabase — sign-in works normally.
- After first Apple/Google sign-in, a **profile setup modal** collects first name, last name, username, role, and sport (Apple may not provide name on repeat sign-ins).

**Production check (verified):** Supabase Apple provider enabled; client id `com.hc111.daltondemo`; secret configured.

---

## User-generated content & moderation

| User action | System behaviour |
|-------------|------------------|
| **Report post** | Post menu (⋯) → Report post → reason → row in `post_reports` |
| **Block user** | Message thread → menu → Block |
| **Staff review** | Master/staff accounts review reports in Supabase / internal tools |
| **Enforcement** | Delete post, suspend account, or ban per Terms |

**Support / safety contact:** Profile → Settings → Support → Email support (`/contact-team` on website).

---

## Legal & support URLs

| Purpose | URL |
|---------|-----|
| Support | https://daltongrantacademy.vercel.app/contact-team |
| Privacy | https://daltongrantacademy.vercel.app/privacy |
| Terms | https://daltongrantacademy.vercel.app/terms |
| Marketing | https://daltongrantacademy.vercel.app |

---

## Accessibility (declared in Connect)

Settings → Accessibility: **Larger Text**, **Dark Interface** (default), **Differentiate Without Color**, **Sufficient Contrast**. Do not claim VoiceOver / Reduced Motion until implemented.

---

## Known limitations (optional — only if asked)

- **Apple Wallet** ticket pass requires Pass Type ID certificates; if unavailable, booking QR still works in-app.
- **Master Control** is staff-only (not visible to standard users).

---

## RevenueCat paywall (live template)

The native purchase sheet uses the **published RevenueCat Paywall v2** template on offering **`Official Offering`** (lookup key). The template includes **Privacy Policy** and **Terms of Service** links configured in the RevenueCat dashboard.

To re-verify without MCP: RevenueCat Dashboard → Paywalls → published template → confirm legal URLs point to `daltongrantacademy.vercel.app/privacy` and `/terms`.

Set `REVENUECAT_API_V2_SECRET_KEY` locally to run:

```powershell
# Optional — list paywalls via API v2
$env:REVENUECAT_PROJECT_ID = "proj88ab5ee7"
node -e "fetch('https://api.revenuecat.com/v2/projects/'+process.env.REVENUECAT_PROJECT_ID+'/paywalls',{headers:{Authorization:'Bearer '+process.env.REVENUECAT_API_V2_SECRET_KEY}}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j,null,2)))"
```

---

## Resend vs Supabase built-in email (for reviewers — N/A)

Auth email (confirm signup, reset password) is sent via **Supabase Send Email hook** → **Resend** with **custom HTML** (`send-auth-email` Edge Function). Switching to Supabase’s default SMTP/templates would use **Dashboard email templates** (plain Supabase layout) unless you paste the same HTML there — it does **not** automatically revert to “standard” mail; you choose hook (custom) vs built-in templates.

See `docs/SUPABASE_AUTH_EMAIL_TEMPLATES.md`.
