# Account deletion audit

Last verified against production project `txehbzyntvqpkkegjrwp` via Management API.

## User path

1. **Profile → Settings → Delete account**
2. Confirm dialog (Apple / Stripe cancellation guidance)
3. iOS: `Alert.prompt` — type **DELETE**
4. `POST /functions/v1/delete-own-account` with user JWT + `{ confirm_phrase: "DELETE" }`
5. On success: local sign-out + confirmation alert

## Edge Function (`delete-own-account`)

| Step | Action |
|------|--------|
| Auth | Validates Bearer JWT; only deletes `auth.uid()` |
| Confirm | Requires `confirm_phrase === DELETE` |
| Audit | Inserts `security_audit_log` (`self_delete_account`) |
| Storage | **Best-effort** purge via `purgeUserStorage()` (see below) |
| Auth delete | `auth.admin.deleteUser(userId)` |

**Deploy status:** ACTIVE (verify version after each deploy).

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

Some FKs **SET NULL** (e.g. `events.created_by`, proposal reviewers) — content may remain anonymised, not tied to a live account.

## Storage (not FK-linked)

`storage.objects` does **not** cascade on SQL delete. `purgeUserStorage` removes prefixes:

- `profiles/{userId}/`
- `posts/{userId}/`
- `events/{userId}/`
- `proposals/{userId}/`
- `messages/{conversationId}/{userId}/` (per conversation membership)

Objects uploaded under other prefixes without `userId` in the path may require manual ops cleanup (rare).

## Not deleted / retained by design

| Item | Reason |
|------|--------|
| `security_audit_log` rows | Security / compliance audit trail |
| Apple / Google identity at provider | User must revoke at provider; Supabase auth row is removed |
| RevenueCat / App Store subscription | User must cancel in iOS Subscriptions; deletion does not refund |
| Stripe web subscription | User must cancel via Stripe portal (stated in delete copy) |
| Post reports **about** the user’s content | Reporter rows cascade; reported posts may be deleted with author CASCADE |

## Gaps / ops

- Redeploy `delete-own-account` after changing `purgeUserStorage.ts`.
- Run `node scripts/verify-auth-email-setup.mjs` separately for mail — unrelated to deletion.
- For GDPR export before delete, use Support — no in-app export yet.

## Manual verification checklist

- [ ] Create test user → post + upload avatar → delete → confirm auth user gone in Dashboard
- [ ] Confirm storage prefix empty in Dashboard → Storage → `media_assets`
- [ ] Confirm `subscription_state` row gone for user id
- [ ] Confirm sign-in fails for deleted email
