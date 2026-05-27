# Dalton Access — ElevenLabs agent knowledge base

> **Canonical copy:** Use [`CHATBOT_KNOWLEDGE_BASE.md`](./CHATBOT_KNOWLEDGE_BASE.md) for the fullest training document (billing, security boundaries, accessibility). This file is kept for ElevenLabs-specific notes.

Use this document to train a voice/chat assistant for Dalton Access (mobile app + web at `https://daltongrantacademy.vercel.app/app`).

---

## What Dalton Access is

Dalton Access is a performance community platform for athletes and creators. Users can:

- Browse **Community** posts and trending topics
- Discover **Events** (book, save, host with premium tools)
- Watch **Media** (training, mindset, recovery content)
- View **Sponsors** and partnership offers
- Manage **Profile** (bio, interests, highlights, results, banner, photo)
- Subscribe to **Premium** for creator tools and Dalton verification

Accounts use **Supabase** (email/password or Google/Apple sign-in). Premium on mobile uses **RevenueCat** (App Store / Play). Premium on web uses **Stripe Checkout**.

---

## Sign in and account setup

### Sign up / log in

1. Open the app (or web `/app`).
2. **Welcome** screen: Sign Up, Log In, Continue with Google, Continue with Apple (iOS).
3. After email sign-up, confirm email if prompted, then log in.
4. Complete **onboarding**: role, sports (capitalized when saved), discovery source, username.

### Same account on all devices

Use the **same email** (or same Google/Apple account) everywhere. Premium follows the account via `subscription_state` in the database—not the device.

### Forgot password

Use **Log In → Forgot password** (if shown) or contact support if reset email does not arrive (check spam).

---

## Premium and Dalton verification

### Two steps for creator features

1. **Premium subscription** (paid) — required first.
2. **Dalton verification** (team-approved) — required before publishing events/media.

`dalton_verified` alone does **not** unlock creator tools without premium.

### If + button shows paywall

User is not premium. On web: Stripe checkout. On iOS/Android: RevenueCat paywall.

### If user sees “Awaiting Dalton verification”

They have premium but are not yet verified. Message: *Once your account has been verified you will have access to your premium features.* They should wait for the Dalton team or contact support—do not promise instant verification.

### Restore purchases (mobile)

Profile → Premium → **Restore purchases**. Web: refresh after Stripe payment; return URL includes `?stripe_checkout=success`.

---

## Main tabs (how to use features)

### Community

- Scroll feed; on web, trending sidebar may appear.
- Create post (where enabled): text and images.
- Pull down to refresh (gold ring loader at top).

### Events

- Filter chips: All, Booked, Saved, Past, My events (premium).
- **+** create event: premium + verification required.
- Search icon in header (same size as Media).
- Book events; QR check-in for hosts (premium).

### Media

- Browse categories (chips).
- **Continue Watching** only appears if the user started a video and did not finish it.
- If everything watched, **Recommended** may show instead.
- **Bookmark** icon opens saved library.
- **+** upload: premium + verification.

### Sponsors

- Browse partner listings.
- **+** partnership inquiry: premium required, then in-app message about coordinating with Dalton team.

### Profile

- Edit sections: basic info, photo, banner, bio, interests, highlights, recent results.
- Photo/banner: upload from gallery (stored in Supabase Storage).
- Settings → Legal: Terms, Privacy (opens marketing site pages).

---

## Web vs mobile

| Feature | Web | iOS/Android |
|--------|-----|-------------|
| Sign in | Email, Google | Email, Google, Apple |
| Premium purchase | Stripe | RevenueCat / stores |
| Video upload | Limited | Full library picker |
| Rive animation | Auth welcome (iframe) | Native/embed |

Web base path: `/app`. OAuth callback: `/app/auth/callback`.

---

## Troubleshooting (assistant playbook)

### “Can’t log in”

- Confirm email verified (sign-up flow).
- Check internet connection.
- Web: allow cookies/localStorage; try incognito if stuck session.
- Google sign-in: ensure redirect URL matches Supabase settings.

### “Premium not showing after payment”

- Wait 1–2 minutes for webhook.
- Pull to refresh or restart app.
- Web: return from Stripe with success URL.
- Mobile: Restore purchases.
- Still missing: escalate to live support with receipt email and account email.

### “Paywall won’t open”

- Web: Supabase + Stripe Edge Functions must be deployed; user must be signed in.
- Mobile: not available in Expo Go—needs TestFlight/production build.

### “Can’t upload photo/banner”

- Grant photo library permission.
- Check connection.
- If upload fails: Storage bucket `media_assets` policy may block—escalate support.

### “Rive animation has white/grey box on web”

Known embed limitation. Animation should sit on dark `#0A0A0A` background; if box persists, suggest updating browser or using mobile app.

### “Spinner looks wrong on pull-to-refresh”

App uses a **gold circular** loader (not the system spinner). If user sees a blank area, advise pull again or update app.

---

## When to escalate to live support

Escalate when:

- Payment taken but no premium after 24h
- Account deletion or GDPR request
- Harassment, impersonation, or safety reports
- Master control / admin access requests
- Verification status disputes
- Bug crashes (ask for device, OS, app version, steps)

Collect: account email, platform (web/iOS/Android), screenshot if possible, time of issue.

---

## Legal and privacy links

When `EXPO_PUBLIC_DALTON_WEB_URL` is set:

- Terms: `{DALTON_WEB_URL}/terms`
- Privacy: `{DALTON_WEB_URL}/privacy`
- Athlete agreement: `{DALTON_WEB_URL}/athlete-agreement`

In-app: Profile → Settings → Legal.

---

## Accessibility (in-app — four features only)

- **Larger Text**, **Dark Interface** (default), **Differentiate Without Color**, **Sufficient Contrast** — Settings → Accessibility; sync across devices when signed in.
- Do not claim VoiceOver, captions, reduced motion, or light theme as product features unless shipped.

---

## Content submission (media & sponsors) — future / ops

**Not fully automated in app today.** Recommended flows for operations:

1. **Email intake** — `partners@` / `media@` with PDF proposal + attachments.
2. **In-app proposals** (future) — form linked to moderator role; approve/deny updates catalog.
3. **Verification** — human review before `media_assets` or sponsor rows go public.

Assistant: direct creators to Support for partnership/media pitches until in-app submission ships.

---

## Offline mode (roadmap)

Not fully shipped. Planned approach:

- Cache feed/events/sponsors/media metadata in local storage when online.
- Queue actions (posts, uploads) until reconnect.
- Show “Offline” banner and read-only cached content.

If user asks offline: explain coming soon; suggest downloading saved items where available.

---

## Caption @ and # highlighting (roadmap)

Gold styling when typing `@` or `#` in captions requires a custom `TextInput` (rich text) or markdown layer—not default React Native. Not in current build; suggest plain text tags for now.

---

## Assistant tone

- Clear, calm, athlete-friendly.
- Do not share API keys, webhook secrets, or service role keys.
- Do not promise verification timelines unless ops provides them.
- Prefer step-by-step fixes before escalation.

---

## Quick FAQ

**Q: Is Dalton verified the same as Premium?**  
A: No. Premium is paid. Verification is approval to publish as a creator.

**Q: Can I use Premium on web and phone?**  
A: Yes, one subscription per account (Stripe on web, stores on mobile—both update the same account when webhooks are configured).

**Q: Where are my saved events?**  
A: Events tab → Saved filter.

**Q: Where is my saved media?**  
A: Media tab → bookmark icon → Saved library.

**Q: How do I edit my bio?**  
A: Profile → Edit Profile Sections → Bio.

---

*Last updated for product training. Regenerate when major releases ship.*
