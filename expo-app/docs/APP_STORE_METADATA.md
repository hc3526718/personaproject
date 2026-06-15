# App Store Connect — listing, compliance & assets

Product names in repo: **The Dalton Grant Academy** (user-facing brand on welcome/auth) and **The Dalton Grant Academy** (screenshot tooling). Use one name consistently in App Store Connect; below uses **The Dalton Grant Academy** with bundle ID `com.hc111.daltondemo` from `eas.json` / TestFlight docs.

---

## Routing app coverage (GeoJSON)

**File:** `[../app-store/routing-app-coverage.geojson](../app-store/routing-app-coverage.geojson)`

- Format: single root `**MultiPolygon`** (required by Apple).
- **Polygon 1:** simplified Great Britain (England, Scotland, Wales).
- **Polygon 2:** simplified Ireland (Republic + cross-border event area).

Upload in App Store Connect only if the portal asks for **routing / geographic coverage** (common for navigation apps). The Dalton Grant Academy is primarily community, media, events, and messaging; if Apple does not show the upload field, you do not need this file. If you expand beyond UK & Ireland, replace coordinates or add polygons inside the same `MultiPolygon` (still one `MultiPolygon` root).

---

## Listing copy (English — United Kingdom)

Paste the blocks below into **App Store Connect → App Information / App Store** (English UK). All public URLs use production domain **`https://daltongrantacademy.uk`**.

### Required URLs (App Information)

| Field | Value |
| ----- | ----- |
| **Privacy Policy URL** | `https://daltongrantacademy.uk/privacy` |
| **Support URL** | `https://daltongrantacademy.uk/contact-team` |
| **Marketing URL** (optional) | `https://daltongrantacademy.uk` |
| **Labels and Markings** (DSA, if asked) | `https://daltongrantacademy.uk/labels-and-markings` |
| **Terms of Use (EULA)** | `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` *(Apple Standard EULA — also select in App Store Connect → App Information → License Agreement)* |
| **Terms of Service** (your site) | `https://daltongrantacademy.uk/terms` |

### App name (title)

**The Dalton Grant Academy**

*(30 characters max on App Store; this fits.)*

### Subtitle

**Train, connect & book events**

*(30 characters max. Alternatives: `Your boxing community hub` · `Community, media & events`.)*

### Promotional text

*(170 characters max; editable anytime without a new app version.)*

> Academy access requires a £2/month subscription. Community feed, messaging, media, events & sponsors in one app. Sign in, subscribe, and join your crew.

*(~155 characters — adjust if Connect counts differently.)*

### Description

*(4,000 characters max. **Must** disclose that a subscription is required to use the app — Apple Guideline 3.1 and common reviewer expectation.)*

The Dalton Grant Academy is the home for athletes, coaches, and fight-community crews who want training, conversation, and events in one app.

**Subscription required**  
Access to the app and its content requires an active **Academy Access** auto-renewable subscription (**£2 per month**, price may vary by region and is shown in-app before purchase). There is no free tier for full app use. Payment is charged to your Apple ID account at confirmation of purchase. Your subscription **automatically renews** unless you turn off auto-renew at least **24 hours** before the end of the current billing period. Your account is charged for renewal within 24 hours prior to the end of the current period. You can **manage or cancel** subscriptions in **Settings → Apple ID → Subscriptions** after purchase. **Restore purchases** is available in-app if you already subscribed on this Apple ID.

Privacy Policy: https://daltongrantacademy.uk/privacy  
Terms of Service: https://daltongrantacademy.uk/terms  
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

**Community**  
Share updates, photos, and clips with people who understand the work. Follow the feed, react to posts, and stay close to your gym, club, or team.

**Messages**  
DM coaches, training partners, and event hosts. Keep logistics and feedback in one thread instead of scattered chats.

**Media**  
Browse training and mindset content from verified contributors. Save what you want to revisit and continue watching where you left off.

**Events**  
Discover camps, showcases, open mats, and coached sessions. Book your place, get check-in details, and add events to your calendar.

**Sponsors**  
See partner brands and offers curated for the community, with clear paths to learn more.

**Your profile**  
Build your athlete profile, manage settings, and control how others can reach you. Sign in with email, Apple, or Google. You can delete your account in-app (Settings).

The Dalton Grant Academy is built for a dark, high-contrast experience that feels at home in the gym or on the road. Accessibility options include Larger Text, Differentiate Without Color, and Sufficient Contrast in Settings.

Questions or partnership enquiries: use the support URL on this App Store page or https://daltongrantacademy.uk/contact-team

Terms, privacy, and athlete agreement are available in-app and on our website.

### Keywords

*(100 characters total, comma-separated, no spaces after commas, no repeat of app name.)*

`boxing,training,community,events,coach,athletes,fitness,gym,sparring,media,sponsors,booking`

*(96 characters — room to add one token e.g. `subscription` if you drop another.)*

### What's New (version 1.0.0)

> Initial release of The Dalton Grant Academy — community feed, messaging, training media, event booking, athlete profiles, and mandatory Academy Access subscription for full app use.

### In-app purchase / subscription metadata (App Store Connect → Subscriptions)

Use wording consistent with the in-app paywall (`AcademyAccessPaywall`):

| Field | Suggested copy |
| ----- | -------------- |
| **Subscription group display name** | Academy Access |
| **Subscription name** | Academy Access Monthly |
| **Duration** | 1 month |
| **Price** | £2.99 or £2.00 (match App Store Connect product tier you created) |
| **Subscription description** | Full access to The Dalton Grant Academy — community, messages, media, events, sponsors, and your athlete profile. Required to use the app after sign-in. Cancel anytime in Apple ID Subscriptions. |

Link the subscription to RevenueCat entitlement **`premium`** (see [REVENUECAT.md](./REVENUECAT.md)).

### Copyright

**© 2026 The Dalton Grant Academy** *(adjust year / legal entity to match your trader declaration)*

### App Review Information (paste into Review Notes)

See **[APP_REVIEW_NOTES.md](./APP_REVIEW_NOTES.md)** for demo account, sandbox IAP steps, Sign in with Apple / Google, account deletion path, and Wallet pass notes.

**One-line subscription note for reviewers:**  
After sign-in, the app presents a mandatory **Academy Access** paywall (£2/month via sandbox IAP). Use the demo account and sandbox tester Apple ID documented in review notes; **Restore purchases** is on the paywall.

---

## App encryption documentation (Export Compliance)

**Copy-paste text** for App Store Connect step **“App Encryption Documentation 1 of 3”** (app description), encryption answers, DSA/trader notes: **[APP_ENCRYPTION_EXPORT_COMPLIANCE.md](./APP_ENCRYPTION_EXPORT_COMPLIANCE.md)**.

Apple asks whether your app uses encryption. Most apps that only use **HTTPS (TLS)** qualify for a **standard exemption**.

### What to answer in App Store Connect

1. **Does your app use encryption?**
  **Yes** — the app uses HTTPS to talk to Supabase, RevenueCat, Stripe, OAuth providers, etc.
2. **Is it exempt?**
  Typically **Yes** — exemption type **(e)(1)** or the questionnaire wording *“app uses only standard encryption / exempt”* (Apple’s exact labels change slightly by year).
3. `**ITSAppUsesNonExemptEncryption` in `Info.plist`**
  For exempt apps, set `**false**` (or rely on Expo / EAS to set export compliance). Meaning: you are **not** using non-exempt cryptography beyond what Apple allows without annual BIS paperwork.

### When you need more than the checkbox

You need **U.S. export classification (ERN/self-classification)** and possibly **UK/EU** filings if you:

- Add **custom** encryption (not just TLS),
- Ship **end-to-end encrypted** messaging you control,
- Embed cryptography for purposes beyond authentication.

The Dalton Grant Academy today: **TLS + platform keychain** — document as standard HTTPS-only in the annual compliance questionnaire.

### Practical steps

1. Complete the **Export Compliance** section each time you upload a build in App Store Connect (or in `eas submit`).
2. In Xcode / `app.json` → `ios.infoPlist`, confirm `ITSAppUsesNonExemptEncryption` is `false` if you claim exemption.
3. Keep a one-line internal note: *“The Dalton Grant Academy vX.Y — encryption limited to Apple OS + HTTPS (TLS 1.2+); no proprietary crypto.”*

Official reference: [Apple — Complying with encryption export regulations](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations).

---

## Regulations & permits (App Store Connect)

These are **questionnaires**, not files you upload (unless Apple requests a document).


| Area                         | What Apple / stores ask             | The Dalton Grant Academy guidance                                                                                                           |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Export compliance**        | Encryption (above)                  | Standard HTTPS exemption                                                                                                        |
| **Content rights**           | You own or licensed all app content | Yes for your UI; user-generated content needs Terms + moderation                                                                |
| **Age rating**               | Violence, UGC, messaging, purchases | Likely **12+** or **13+** with UGC/messaging; complete the questionnaire honestly                                               |
| **UGC**                      | Moderation, reporting, blocking     | In-app post reports; master moderation tools                                                                                    |
| **Account deletion**         | Required if accounts exist          | Provide in-app path + support URL                                                                                               |
| **Privacy Nutrition Labels** | Data linked to user                 | Map Supabase auth, analytics (Sentry if enabled), RevenueCat, push tokens                                                       |
| **Digital purchases**        | IAP vs external payment             | RevenueCat subscriptions; Stripe on web per your setup                                                                          |
| **Business / permits**       | Rare for fitness apps               | No special “permit” unless you sell regulated services; **event ticketing** may need consumer terms/refunds in your legal pages |
| **UK / EU**                  | Trader status, DSA, GDPR            | Privacy policy + support contact on website; GDPR lawful basis in privacy policy                                                |


**No separate “permit file”** is uploaded to Apple for a standard fitness/community app. Keep **Terms**, **Privacy**, and **Support URL** live at `EXPO_PUBLIC_DALTON_WEB_URL` (e.g. [https://daltongrantacademy.uk](https://daltongrantacademy.uk)).

---

## Accessibility (App Store declaration & in-app)

### What The Dalton Grant Academy supports today (declare in App Store Connect → Accessibility)

Align declarations with **what users actually get** on first run and in **Profile → Settings → Accessibility**:


| Feature                               | In-app today                                                                          | App Store declaration suggestion             |
| ------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Larger Text**                       | Toggle in Settings; scales text via `maxFontSizeMultiplier`; syncs to `user_settings` | **Supported**                                |
| **Dark Interface**                    | Dark UI by default (informational row in Settings)                                    | **Supported**                                |
| **Differentiate Without Color Alone** | Toggle; stronger borders/labels when enabled; cloud sync                              | **Supported** (expand affordances over time) |
| **Sufficient Contrast**               | Toggle; higher-contrast palette when enabled; cloud sync                              | **Supported**                                |


**Do not declare** (removed from Settings until implemented): VoiceOver, Voice Control, Light Interface, Reduced Motion, Captions.

**App Store rule:** Only claim features users can **discover and use** in Settings → Accessibility.

### Suggested “Accessibility” blurb for review notes (optional)

> The Dalton Grant Academy uses a dark interface by default. Settings → Accessibility includes Larger Text, Differentiate Without Color, and Sufficient Contrast; preferences sync across iOS, Android, and web when signed in.

---

## Images: alpha channels & transparency

**What it means:**  
PNG (and some other formats) can store **alpha** — an extra channel per pixel for **opacity**. Transparent areas let whatever is **behind** the image show through (checkerboard in Photoshop = alpha = 0).

**Apple’s rule for many store assets:** Screenshots and marketing images must be **opaque** — **no transparency**, **no alpha channel**. Apple composites your images onto its own backgrounds; transparent pixels can render as black, white, or broken edges.

**What to do:**

1. Export App Store screenshots as **PNG or JPEG without transparency**.
2. Flatten layers; use a solid background (The Dalton Grant Academy uses dark `#0a0a0a`-style — match `designSystem`).
3. In design tools: *Export → no transparency* or *fill background*.
4. **App icon** must also be opaque (no rounded-corner transparency trick — iOS applies the mask).

**JPEG** has no alpha (safe). **PNG** is fine if alpha is fully opaque everywhere.

The screenshot editor README already notes: use PNG/JPG; avoid formats with unexpected alpha.

---

## Quick checklist before submit

- `routing-app-coverage.geojson` uploaded **if** Connect requests it
- Title, subtitle, keywords, description, promotional text pasted
- Export compliance answered (HTTPS exempt)
- Age rating + privacy labels
- Support URL, marketing URL, privacy policy URL
- Screenshots **opaque**, correct device sizes
- Accessibility section matches Settings toggles
- `EXPO_PUBLIC_`* secrets on EAS for production build ([TESTFLIGHT.md](./TESTFLIGHT.md))

