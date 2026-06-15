# Security & reliability review (Dalton / Expo + Supabase)

This document summarizes a **code-assisted security review** (not a formal penetration test). Risk ratings: **High** = exploitable or severe exposure without unusual prerequisites; **Medium** = meaningful abuse or data risk with constraints; **Low** = defense-in-depth, hygiene, or operational gaps.

**Supabase MCP (`get_advisors`, type `security`)** reported, among other items:

- Multiple **`SECURITY DEFINER` RPCs callable by `authenticated`** (e.g. `host_check_in_booking`, `get_or_create_dm`, follow-request helpers). This is a **known trade-off**: the linter flags any definer function granted to `authenticated`. Mitigation is **correct `auth.uid()` checks inside each function** (e.g. `host_check_in_booking` verifies event host). Periodically re-audit function bodies when changing schema.  
  Remediation reference: [Supabase database linter — authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)

- **Leaked password protection disabled** in Supabase Auth (HaveIBeenPwned integration off).  
  Remediation: [Password strength & leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

---

## High risk

| Area | Finding | Mitigation (implemented / manual) |
|------|---------|-----------------------------------|
| **Demo auth without Supabase** | When `EXPO_PUBLIC_SUPABASE_*` is missing, the app fell back to **hard-coded demo email/passwords** (`AuthContext`). Release builds could authenticate as demo admins if env were misconfigured. | **Implemented:** demo login only when `__DEV__` is true. Production without Supabase returns `false` from `login`. |
| **QR ticket signing secret** | `getTicketSigningSecret()` defaulted to a **fixed string** whenever env was unset, so anyone could forge HMACs in production misconfigs. | **Implemented:** no default in production; `signTicketPayload` throws if unset; `verifyTicketToken` returns `not configured`; event QR effect clears token on failure. **Manual:** set a long random `EXPO_PUBLIC_TICKET_SIGNING_SECRET` and mirror server-side; prefer **server-only signing** for real check-in (see `docs/QR_CHECKIN.md`). |
| **`subscription_state` without RLS** | Table could be writable/readable too broadly via PostgREST depending on grants — client could tamper with `is_pro` if policies were absent. | **Implemented:** migration `012_subscription_state_rls.sql` + matching block in `backend/rls_policies.sql` — **select own row only** for `authenticated`; no client insert/update/delete. **Manual:** run migration on Supabase. |
| **`dalton_verified` metadata** | `syncDaltonVerifiedFromProfileIfPremium` called `auth.updateUser` when client believed user was pro — **metadata is not a billing source of truth**; a modified client could try to flip flags when server said otherwise. | **Implemented:** if `subscription_state` row exists and `is_pro === false`, **do not** set `dalton_verified` in metadata. **Manual:** complete RevenueCat **webhook → `subscription_state`** so pro is server-driven; treat **entitlements in API** as authoritative for paid features. |

| **Missing RevenueCat webhook** | Native purchases update RC SDK locally but **`subscription_state` may stay empty** without an RC webhook Edge Function — web Stripe path works; cross-platform premium can desync. | **Manual:** deploy RC webhook → upsert `subscription_state` by `app_user_id` (see `docs/REVENUECAT_BILLING_SETUP.md`). **Implemented:** `Purchases.logIn(supabaseUserId)` on session. |
| **No in-app account deletion** | Apple App Store requires deletion when accounts exist; users must email support. | **Implemented:** `delete-own-account` Edge Function + profile UI (`accountDeletionService.ts`). Writes `security_audit_log` before delete. **Manual:** verify function deployed and App Store review notes mention in-app path. |
| **Stripe webhook single point** | Forged webhooks blocked by `STRIPE_WEBHOOK_SECRET`; misconfigured secret breaks billing. | **Manual:** rotate `whsec_` on compromise; monitor failed webhook deliveries in Stripe Dashboard. |

---

## Penetration-test perspective (significant weaknesses)

Top findings an external tester would report, and fixes:

| # | Weakness | Exploit / impact | Fix |
|---|----------|------------------|-----|
| 1 | **Client-only premium checks** on some flows | Modified app might show UI early; real writes should fail at RLS/API. | **Implemented (Jun 2026):** RLS on `events` insert + `media_assets` insert requires `subscription_state.is_pro` or master; trigger on `content_proposals` for media/event kinds. Sponsor proposals remain open. |
| 2 | **Broad profile read (authenticated)** | Scrape emails, bios, metadata at scale with one stolen session. | Column-level view + rate limits; CAPTCHA on sign-up. |
| 3 | **Master delete + service role** | Stolen JWT + PIN or leaked service role → mass account deletion. | **Partial:** `security_audit_log` + structured logs on `master-delete-user` / `delete-own-account`. **Manual:** IP allowlist, MFA for master accounts, rotate service role on incident. |
| 4 | **CORS `*` on Edge Functions** | CSRF-style invocation from malicious sites if victim has valid JWT in browser. | **Implemented:** shared `cors.ts` on browser-called functions (`master-delete-user`, `delete-own-account`, `send-booking-confirmation-email`, wallet, checkout). **Intentional `*`:** Stripe/RevenueCat/DB webhooks (`send-post-report-email`) — no browser Origin. |
| 5 | **Ticket HMAC in `EXPO_PUBLIC_*`** | Secret in mobile bundle → forge QR tokens if same secret on server. | Server-only signing for production check-in; rotate secret. |
| 6 | **No RC webhook** | User pays on iPhone, web still free (or reverse) until DB synced. | RC + Stripe webhooks both write `subscription_state`. |
| 7 | **Placeholder legal / support emails** | Phishing trust issues; GDPR contact invalid. | Replace before launch; verify domain. |
| 8 | **Supabase anon key in bundle** | Expected; abuse = RLS bypass attempts, credential stuffing. | RLS tests per table; Auth rate limits; leaked password protection on. |
| 9 | **Storage bucket policies** | Direct upload URLs if policies too open. | **Implemented:** `storage_media_assets_select_linked` — object read only when path exists in `media_assets` with allowed visibility (blocks bucket listing). **Manual:** virus scan pipeline for uploads. |
| 10 | **Live chat shell** | No auth on `/live-chat` until widget added — bot spam to provider. | Rate limit; require login for chat; moderation. |

**External tools:** Run [Supabase advisors](https://supabase.com/dashboard), Stripe radar, and optional Shannon on staging (`docs/SECURITY_AUDIT.md` § Agentic pentesting).

---

## Medium risk

| Area | Finding | Mitigation |
|------|---------|------------|
| **Master account deletion Edge Function** | Valid JWT + master PIN allows **`auth.admin.deleteUser(target)`** for arbitrary `target_user_id` (by design for support). Risk is **credential + PIN compromise** or leaked **service role** secret. | **Partial:** `security_audit_log` table + Edge Function logging. **Manual:** Logflare/SIEM alerts, IP allowlist, MFA, service-role rotation. |
| **Edge Function CORS `*`** | DB webhooks (`send-post-report-email`) use permissive CORS; browser functions use `cors.ts`. | **Manual:** ensure webhook secret (`REPORT_WEBHOOK_SECRET`) stays long and rotated. |
| **`profiles` SELECT for all authenticated** | `rls_policies.sql` allows any signed-in user to **read all profiles** (MVP for feeds). Increases **PII scraping** if account keys leak. | **Manual:** split policies (public profile columns vs private), or use a **view** exposing safe columns only. |
| **RevenueCat / client trust** | Premium UX uses RevenueCat SDK; **server** must enforce paywalls on sensitive operations. | **Manual:** webhook + `subscription_state` + RLS on premium-gated tables or Edge Functions with service role. |
| **Admin metadata in `notify_admins_on_post_report`** | Trigger notifies users whose `raw_user_meta_data` / `raw_app_meta_data` role is `admin` / `super_admin`. If clients could set `role` in metadata (Supabase usually restricts), that could be noisy — typically **only service role** sets app metadata. | **Manual:** ensure **no** client policy allows writing `auth.users`; use **custom claims** or `profiles` role with RLS instead of metadata where possible. |

---

## Low risk / inconsistencies

| Area | Finding | Mitigation |
|------|---------|------------|
| **WebView demo (`WebDemoApp`)** | Previously `originWhitelist={['*']}` and `mixedContentMode="always"`. | **Implemented:** whitelist limited to the configured host; `mixedContentMode="never"` for HTTPS entry URLs. |
| **SEC DEFINER RPC lint noise** | Many intentional definer RPCs remain flagged until revoked from `authenticated` (would break app). | Re-audit each function on change; consider moving sensitive ops to **Edge Functions** only. |
| **Sentry DSN in client** | Expected; ensure no PII in breadcrumbs. | **Manual:** scrub events; use separate DSN for prod/staging. |
| **EXPO_PUBLIC_* exposure** | All `EXPO_PUBLIC_` variables are **extractable from the bundle**. Never put service role, Resend secret, or private signing keys there. | Already documented in `SECRETS_CHECKLIST.md`; keep enforcing. |

---

## Manual checklist (reliability & security)

1. **Supabase Auth**  
   - Enable **MFA / 2FA** (TOTP) for admin accounts: [MFA](https://supabase.com/docs/guides/auth/auth-mfa).  
   - Enable **leaked password protection** (see link above).  
   - Configure **email confirmations**, **password strength**, and **rate limits** for sign-in / password reset.

2. **EAS / secrets**  
   - Production env in **Expo dashboard** — never ship `.env` with real keys in git.  
   - Rotate keys if any bundle or log leak is suspected.

3. **RevenueCat**  
   - Webhook signature verification + upsert `subscription_state`.  
   - Treat **App Store / Play** as purchase truth; use RC dashboard for offering integrity.

4. **Operational**  
   - **Backup** Supabase; test restore.  
   - **Review** Supabase **Auth users** and **RLS** after each migration.  
   - Re-run **Supabase advisors** (`get_advisors` security) after DDL changes.

5. **Master control**  
   - Limit `master_control = yes` in SQL to trusted staff.  
   - Monitor Edge Function logs for `master-delete-user`.

---

## Changes made in this repo (summary)

- `AuthContext.tsx` — block offline demo login unless `__DEV__`.  
- `env.ts` + `ticketToken.ts` + `eventsScreens.tsx` — production ticket signing requires explicit secret; safe failure.  
- `userMetadataSupabase.ts` — refuse metadata premium flag when server `subscription_state.is_pro` is explicitly false.  
- `WebDemoApp.tsx` — tighter WebView navigation / mixed content.  
- `backend/migrations/012_subscription_state_rls.sql` + `backend/rls_policies.sql` — RLS for `subscription_state`.
- **`038_event_booking_capacity.sql`** — race-safe booking cap trigger (applied to production).
- **`039_security_audit_followup.sql`** — `security_audit_log`; revoke `anon` on all SECURITY DEFINER functions; premium RLS; storage listing fix.
- **`040_revoke_trigger_rpc_from_authenticated.sql`** — trigger-only functions no longer callable via PostgREST.
- **`.pre-commit-config.yaml` + `.gitleaks.toml`** — secret scanning (AthenaGuard-inspired). Run: `pip install pre-commit && pre-commit install`.
- Edge Functions: audit logging + restricted CORS on `master-delete-user`, `delete-own-account`, `send-booking-confirmation-email`.

Migrations **038–040** applied to project `txehbzyntvqpkkegjrwp` via Supabase MCP (Jun 2026).

---

## Manual checklist — AthenaGuard-aligned (still required)

These cannot be fully automated from the repo; complete in dashboards / ops:

| Priority | Task | Where |
|----------|------|--------|
| **High** | Enable **leaked password protection** (HaveIBeenPwned) | Supabase Dashboard → Auth → Password security |
| **High** | Deploy + verify **RevenueCat webhook** → `subscription_state` | `supabase/functions/revenuecat-webhook`, `docs/REVENUECAT_BILLING_SETUP.md` |
| **High** | Move ticket signing **off `EXPO_PUBLIC_*`** for production check-in | Edge Function + `docs/QR_CHECKIN.md` |
| **High** | **MFA (TOTP)** for all `master_control` staff | Supabase Auth MFA |
| **Medium** | Email confirmation, password strength, Auth **rate limits** | Supabase Auth settings |
| **Medium** | Narrow **`profiles` SELECT** to a public view (email/PII) | New migration + app query updates |
| **Medium** | Replace placeholder **legal / support emails** | `contact-us.html`, App Store metadata |
| **Medium** | **Rotate secrets** if ever pasted in chat, logs, or bundles | `SECRETS_CHECKLIST.md` |
| **Medium** | Stripe webhook monitoring + `whsec_` rotation plan | Stripe Dashboard |
| **Medium** | **MCP / AI tooling hygiene** — least-privilege DB keys, no service role in agent configs | AthenaGuard § MCP |
| **Low** | Run **Shannon** pentest on staging | § Agentic pentesting below |
| **Low** | Sentry PII scrubbing; separate prod/staging DSN | Sentry project settings |
| **Low** | Live chat rate limits before widget goes live | Vercel `/live-chat` |
| **Low** | Install pre-commit hooks locally / in CI | `pre-commit install` or GitHub Action |

---

## Agentic pentesting (Shannon / Keygraph)

[Shannon](https://github.com/KeygraphHQ/shannon) (Keygraph) is an autonomous white-box pentester that reads application source, runs real exploits, and reports only findings with proof-of-concept. Use it **after** manual checklist items below, on a **staging** deployment that mirrors production auth (Supabase redirect URLs, Vercel `/app` routes).

**Recommended scope for Dalton web (`daltongrantacademy.uk/app`):**

1. **Auth & session** — email/password, Google OAuth callback (`/app/auth/callback`), PKCE code exchange, `localStorage` session persistence, logout, stale refresh tokens.
2. **RLS / PostgREST** — attempt cross-user reads/writes on `profiles`, `posts`, `messages`, `subscription_state`, storage buckets.
3. **Edge Functions** — `master-delete-user`, `send-post-report-email` (JWT, rate limits, secret headers).
4. **Client** — XSS in community post bodies, open redirects in OAuth, demo auth disabled in production builds.

**How to run Shannon Lite (local):**

- Requirements: Docker, Node 18+, Anthropic API key (see [KeygraphHQ/shannon](https://github.com/KeygraphHQ/shannon)).
- Point Shannon at this repo + staging URL; include `expo-app/` and Supabase schema under `expo-app/backend/`.
- Enterprise **Shannon Pro** ([keygraph.io](https://keygraph.io)) adds CI/CD integration, SAST/SCA, and continuous agentic testing.

**Manual pentest priorities before Shannon:**

- Confirm Supabase **Site URL** and **Redirect URLs** match Vercel exactly (no trailing-slash drift).
- Verify Google Cloud **Authorized redirect URIs** include `https://daltongrantacademy.uk/app/auth/callback`.
- Run Supabase **Security Advisor** (`get_advisors`) after each migration.
