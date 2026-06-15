# App Store pre-flight — 12 rejection risks

Use this before every **TestFlight** build and **App Store** submission for **The Dalton Grant Academy** (`com.hc111.daltondemo`). App Store Connect copy is configured separately in `APP_STORE_METADATA.md` — this doc covers **code, backend, and review behaviour**.

---

## Quick checklist

- [ ] Full flow tested on a **physical iPhone** (not simulator only)
- [ ] No placeholder copy, “coming soon”, or dev-only UI visible to reviewers
- [ ] **Demo account** created, onboarded, credentials in Review Notes
- [ ] **Sandbox IAP** path works (mandatory £2/mo access paywall)
- [ ] Screenshots/description match **this build**
- [ ] Privacy policy loads: https://daltongrantacademy.uk/privacy
- [ ] AI assistant: consent shown before Chatbase loads (app + web)
- [ ] EAS production env: no `EXPO_PUBLIC_TICKET_SIGNING_SECRET`, no screenshot dev flags
- [ ] Built with current EAS iOS image (`sdk-54` in `eas.json` — verify against Apple’s required SDK at submit time)
- [ ] Every in-app and web link from Support/Legal opens (200)

---

## 1. Crashes / broken functionality (Guideline 2.1)

**Status:** Manual — run TestFlight on device.

**What to test:** Cold launch → sign in (email + Apple) → onboarding → paywall → subscribe (Sandbox) → feed, DMs, media, events, profile, settings, delete-account flow (optional second account).

**Commonly missed:**

- OAuth first sign-in profile modal (username / role / sport only — names from provider)
- Paywall “Refresh access” after Sandbox purchase if entitlement lags
- Camera / photo library permission paths (profile photo, post upload)
- Deep links from email (confirm, reset password) on device

---

## 2. Placeholder / incomplete content (Guideline 2.1)

**Status:** OK in production paths.

| Item | Notes |
|------|--------|
| `showComingSoon()` | Defined but **not wired** to any screen |
| TextInput `placeholder` props | Normal form hints — not “Lorem ipsum” |
| Admin **QR test lab** | Hidden outside `__DEV__` |
| Admin **Analytics** alert | Staff-only; demo account should **not** be `master_control` |

**Action:** Do not give reviewers a staff/master demo account unless you want them to see internal tools.

---

## 3. Demo account (Guideline 2.1)

**Status:** You must fill credentials in `APP_REVIEW_NOTES.md` before submit.

**Requirements:**

1. Create `reviewer+…@yourdomain.com` in **production** Supabase
2. Verify email (Dashboard or in-app)
3. Complete onboarding **once** so reviewers land on **Academy access paywall**, not profile wizard
4. Paste username + password in App Review Information → Notes
5. Optional: second Sandbox Apple ID with active subscription so reviewer can skip purchase

**Commonly missed:**

- Backend down during review (Supabase + Edge Functions + RevenueCat webhooks)
- Demo account stuck in OAuth setup because onboarding incomplete
- Mandatory paywall with no Sandbox instructions in Notes

---

## 4. Metadata accuracy (Guideline 2.3)

**Status:** Configured in App Store Connect (skim only).

**Watch for:**

- Screenshots from an older build (OAuth modal, paywall copy)
- Listing features not in this binary (e.g. Wallet pass if certs missing — OK if QR check-in works; mention in Notes)
- Subscription disclosure matches **£2/month** mandatory access

---

## 5. Minimum functionality (Guideline 4.2)

**Status:** Strong — native community app.

Native value: push notifications, camera/media upload, QR check-in, DMs, offline-tolerant UI patterns, in-app purchases, profile/wallet flows. Not a thin web wrapper.

---

## 6. Spam / duplicate (Guideline 4.3)

**Status:** N/A — unique academy product.

---

## 7. In-App Purchase (Guideline 3.1.1)

**Status:** OK for iOS.

| Surface | Billing |
|---------|---------|
| iOS app | RevenueCat / **Apple IAP** — mandatory academy access |
| Web marketing | Stripe (not linked from iOS paywall for digital access) |

**Commonly missed:**

- Reviewer taps Subscribe but has no Sandbox Apple ID signed in on device
- RevenueCat offering / paywall template missing privacy + terms URLs
- “Restore purchases” not obvious on access screen

---

## 8. Privacy manifest (Guideline 5.1.1)

**Status:** Declared in `app.config.js` → `ios.privacyManifests`:

- `NSPrivacyTracking: false`
- UserDefaults (`CA92.1`), File timestamp (`C617.1`)

**Action before submit:** Run EAS production build; confirm no Xcode privacy-report errors. Keep Expo SDK and native modules updated so bundled SDKs ship their own manifests.

---

## 9. App Tracking Transparency (Guideline 5.1.2)

**Status:** No ATT prompt — **intentional**.

App does not use IDFA or cross-app tracking. `NSPrivacyTracking` is false. Do **not** add ATT unless you add an attribution/ads SDK.

**Commonly missed:** A third-party SDK silently declaring tracking — audit new dependencies before adding.

---

## 10. Privacy policy (Guideline 5.1.1)

**Status:** Live.

- Web: https://daltongrantacademy.uk/privacy
- In-app: Profile → Settings → Legal
- Paywall template: RevenueCat dashboard URLs

Ensure App Privacy “nutrition label” in Connect matches Supabase auth, RevenueCat, Sentry (if enabled), Chatbase (support AI on web), and push.

---

## 11. AI disclosure & consent (2026 enforcement)

**Status:** Implemented.

| Surface | Behaviour |
|---------|-----------|
| App → Settings → Support → **AI assistant** | `ensureAiAssistantConsent()` Alert names **Chatbase** before opening `/contact-assistant` |
| Web `/contact-assistant`, `/live-chat` | Consent gate + “AI-generated replies · Provider: Chatbase” banner before iframe loads |
| Shared script | `shared/ai-assistant-consent.js` (synced to `expo-app/marketing` on deploy) |

**Review Notes:** Mention that AI is optional support on the website; first use requires explicit consent; no in-app generative AI beyond opening the gated web page.

**Not in use:** `convai-bootstrap.js` (ElevenLabs) is **not loaded** on any page — do not enable without the same consent pattern.

---

## 12. SDK / Xcode version

**Status:** `eas.json` production → `ios.image: "sdk-54"`.

Before each submission, confirm Apple’s [required SDK](https://developer.apple.com/news/) matches your EAS image. Re-test UI after SDK bumps (safe areas, sheets, paywall).

---

## EAS production environment

**Required:**

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
EXPO_PUBLIC_DALTON_WEB_URL=https://daltongrantacademy.uk
```

**Do not set on production iOS:**

- `EXPO_PUBLIC_TICKET_SIGNING_SECRET` (dev-only; tickets via Edge Functions)
- `EXPO_PUBLIC_APP_STORE_SCREENSHOTS` or other dev overrides

---

## Deploy + build order

1. Commit app + marketing changes
2. `node expo-app/scripts/sync-marketing.mjs` (or deploy from repo root — Vercel syncs marketing)
3. Verify https://daltongrantacademy.uk/contact-assistant shows consent gate
4. `cd expo-app && eas build --platform ios --profile production`
5. `eas submit --platform ios --latest`
6. Paste `APP_REVIEW_NOTES.md` into Connect

---

## Related docs

- `APP_STORE_METADATA.md` — listing copy
- `APP_REVIEW_NOTES.md` — paste into Connect
- `TESTFLIGHT.md` — build commands
- `GO_LIVE_CHECKLIST.md` — broader launch
