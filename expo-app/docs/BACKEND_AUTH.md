# Backend & authentication

**Related:** `docs/NEXT_STEPS.md` (§0–§1, §3), `docs/SECRETS_CHECKLIST.md`, `backend/schema.sql`.

## Stack decision

**Primary stack: [Supabase](https://supabase.com)** — Postgres, Auth (email + OAuth), Storage buckets, Row Level Security (RLS), and optional Edge Functions. Fits posts, messages, events, and media metadata in one SQL model.

Alternatives (from product brief): Firebase (NoSQL + Auth + Storage), Clerk + hosted Postgres, Auth0/Cognito for enterprise SSO.

## Environment variables

See root `.env.example`. Required for live auth:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS-enforced) |

When these are **empty**, the app keeps the **demo** email/password gate (`AuthContext`).

## Auth flows (app)

1. **Demo (default)** — `user123@gmail.com` / `12345!` sets local session only.
2. **Supabase** — `signInWithPassword` / `signUp`; session persisted via `expo-secure-store` adapter in `src/lib/supabase.ts`.
3. **Logout** — `signOut()` clears Supabase session and local demo state.

## API layer

`src/api/client.ts` — `apiFetch(path, init)` attaches `Authorization: Bearer <access_token>` when Supabase session exists. Point `EXPO_PUBLIC_API_BASE_URL` at your API (e.g. Supabase Edge Functions or Railway).

## Secrets you must configure outside the repo

- Supabase **service role** key — server-only; never in the app.
- OAuth client secrets (Google/Apple) — Supabase dashboard.
- Stripe / RevenueCat — see `INTEGRATIONS.md` and `REVENUECAT.md`.
