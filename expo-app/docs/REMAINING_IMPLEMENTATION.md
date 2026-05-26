# Remaining implementation — manual, external, and priority backlog

Last updated after community UX, messaging, storage, and activity-badge work.

---

## Must apply on Supabase (if not already)

Run in SQL Editor (or via migrations `024`–`028`):

| Migration | Purpose |
|-----------|---------|
| `024_profiles_athlete_and_catalog_storage.sql` | Athlete details + catalog storage paths |
| `025_bookings_event_user_unique.sql` | Duplicate booking guard |
| `026_fix_dm_storage_and_proposal_limits.sql` | DM notify, storage policies, proposal monthly cap |
| `027_storage_bucket_and_dm_rls_recursion.sql` | **`media_assets` bucket** + RLS recursion fix |

Without **`media_assets`** bucket and non-recursive `conversation_participants` policies, profile uploads and DMs return **400/500**.

---

## External / manual (cannot finish in app code alone)

### Apple Wallet event tickets (Path B in docs)

- Pass Type ID, signing certs, `.pkpass` delivery
- Or **Pass2U** / vendor API (see `docs/WHAT_NEXT_DETAILED_PENDING.md`)
- Server must issue pass after confirmed booking; app opens add-to-wallet flow
- QR check-in still validated on your backend (`docs/QR_CHECKIN.md`)

### Apple Push Notifications (production)

- APNs key in Expo/EAS, `expo-notifications` in production build
- `docs/APPLE_PUSH_SSL_SETUP.md`, `docs/INTEGRATIONS.md`
- App now suppresses **system banners while foregrounded**; in-app list + badges handle open app
- Optional: `expo-haptics` ping when in-app notification arrives (partial — wire in `ActivityBadgeProvider`)

### App Store / Play release

- EAS production profiles, store listings, screenshots (`docs/APP_STORE_METADATA.md`, `docs/STORE_RELEASE.md`)
- RevenueCat products linked (`docs/REVENUECAT.md`)

### Stripe live keys

- Event paid checkout edge functions + webhook secrets in Supabase/Vercel
- Test with sandbox first (`docs/BILLING_SANDBOX_TESTING.md`)

### OAuth production

- Apple + Google redirect URLs and Services ID (`docs/OAUTH_APPLE_GOOGLE.md`)

---

## Priority backlog (in-repo)

### High (product correctness)

| Item | Status |
|------|--------|
| `media_assets` storage bucket + RLS | Migration 027 — **apply on prod** |
| DM / messages 500 (RLS recursion) | Migration 027 — **apply on prod** |
| Delete own posts | Confirm modal + feed removal (code); verify `posts_delete_author` policy |
| Redeploy web bundle after fixes | User must hard-refresh / redeploy (`npx expo export` / Vercel) |
| Profile avatar/banner upload | Depends on bucket + policies |

### Medium (UX / growth)

| Item | Status |
|------|--------|
| Create post wizard | **Done** — `CreateCommunityPostWizard` |
| Comments bottom sheet | **Done** — `PostCommentsSheet` |
| Notification icons + deep links | **Done** — `notificationNavigation.ts` |
| Activity badges (bell / messages / tab) | **Done** — `ActivityBadgeProvider` |
| Master outreach message template | **Done** — `proposalOutreachMessage.ts` |
| Highlight video modal (not media player) | **Done** — `HighlightVideoModal` |
| Smart back on wizards | **Done** — `useWizardBack` on create post; extend to other wizards as needed |
| Per-conversation unread message count | Inbox uses last-seen timestamp; refine with read receipts later |
| Server-side premium gates | Migration cancelled earlier — revisit if paywall bypass reported |

### Low (polish)

| Item | Status |
|------|--------|
| Accessibility pass on profile screens | Cancelled earlier — still open |
| Pass2U / Wallet MVP | Not started |
| Sentry source maps on EAS | `docs/MONITORING_AND_ANALYTICS.md` |
| Realtime read receipts for DMs | Optional enhancement |

---

## Deploy checklist after pulling latest `main`

1. Apply migrations **024–028** on Supabase project `txehbzyntvqpkkegjrwp`.
2. Confirm bucket: `select id from storage.buckets where id = 'media_assets';`
3. Rebuild and deploy web: `cd expo-app && npx expo export --platform web` (or your Vercel pipeline).
4. Hard-refresh browser (Ctrl+Shift+R) — old bundles still call `media_assets(...)` embed on messages.
5. Smoke test: delete post, DM send, avatar upload, notification tap, create post wizard.

---

## Known 400/401 class issues (root causes)

| Symptom | Typical cause | Fix |
|---------|---------------|-----|
| Storage **400** on `media_assets/...` | Missing bucket or insert policy | Migration 027 |
| REST **500** on messages / media | RLS infinite recursion on `conversation_participants` | Migration 027 |
| Old JS still shows `select=*,media_assets(...)` | Stale deployed web bundle | Redeploy + cache bust |
| Delete appears to do nothing | Web `Alert` confirm + RLS deny | `ConfirmModal` + `posts_delete_author` |
