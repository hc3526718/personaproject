# Account deletion audit

Last verified against production project `txehbzyntvqpkkegjrwp`.

## User path

1. **Profile → Settings → Delete account**
2. Confirm dialog — platform-specific copy:
   - **Web:** Stripe subscription scheduled to cancel at period end on delete
   - **Mobile:** Apple / Google subscription **not** auto-cancelled; user must cancel in device settings
3. Type **DELETE** (prompt on all platforms; web uses modal prompt)
4. `POST /functions/v1/delete-own-account` with user JWT + `{ confirm_phrase: "DELETE" }`
5. On success: local sign-out + confirmation alert (mobile includes subscription cancellation reminder)

## Edge Function (`delete-own-account`)

| Step | Action |
|------|--------|
| Auth | Validates Bearer JWT; only deletes `auth.uid()` |
| Confirm | Requires `confirm_phrase === DELETE` |
| Stripe | If `STRIPE_SECRET_KEY` set: `subscriptions.update(id, { cancel_at_period_end: true })` for active web subscriptions (customer search + stored `stripe_subscription_id`) |
| Audit | Inserts `security_audit_log` (`self_delete_account`) with `stripe_subscriptions_scheduled` |
| Storage | **Best-effort** purge via `purgeUserStorage()` |
| Auth delete | `auth.admin.deleteUser(userId)` |

Response includes `stripe_subscriptions_scheduled: string[]` for web clients.

**Deploy:** `supabase functions deploy delete-own-account --project-ref txehbzyntvqpkkegjrwp`

Requires `STRIPE_SECRET_KEY` on the function (same as `stripe-webhook`).

## Subscription liability (mobile)

When a user deletes their account on **iOS or Android**, App Store / Google Play billing is **not** cancelled by DGA. The app shows an explicit post-deletion alert directing the user to cancel in device subscription settings.

**The Dalton Grant Academy is not liable for any unrecalled payments** when accounts are deleted on mobile without the user cancelling their Apple or Google subscription.

Documented in:

- In-app delete warning (`deleteAccountFlow.ts`)
- Post-delete alert (mobile)
- [Terms of Use](/terms) §5 (subscriptions & billing)
- This file

## Web Stripe auto-cancel

On **web** account deletion, active Stripe subscriptions are set to `cancel_at_period_end: true` before the auth user is removed. This cannot be undone; the user retains access until the end of the paid period but will not renew.

## Database cascade (auth.users → profiles → …)

`profiles.id` references `auth.users(id) ON DELETE CASCADE`. Deleting the auth user removes the profile and cascades to (non-exhaustive):

| Table | delete_rule |
|-------|-------------|
| posts, post_comments, post_likes, post_reactions | CASCADE |
| post_reports (as reporter) | CASCADE |
| messages, conversation_participants | CASCADE |
| bookings, wallet_passes | CASCADE |
| media_assets (owner) | CASCADE |
| subscription_state, user_settings, device_push_tokens | CASCADE |
| follows, follow_requests, content_proposals (author) | CASCADE |
| in_app_notifications | CASCADE |

## Storage (not FK-linked)

`purgeUserStorage` removes user prefixes under `media_assets` bucket. Objects outside those prefixes may need manual ops cleanup.

## Not deleted / retained by design

| Item | Reason |
|------|--------|
| `security_audit_log` rows | Security / compliance audit trail |
| Stripe customer record | Retained by Stripe; subscription set to cancel at period end |
| Apple / Google subscription (mobile) | User must cancel at provider |
| Billing / tax records | Legal retention per Privacy Policy |

## Manual verification checklist

- [ ] Web user with Stripe sub → delete → confirm `cancel_at_period_end` in Stripe Dashboard
- [ ] Mobile user → delete → confirm post-delete subscription alert shown
- [ ] Confirm auth user gone; `subscription_state` row removed
- [ ] Confirm sign-in fails for deleted email
