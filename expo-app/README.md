# Dalton Demo (Expo)

By default the app runs a **native** app shell that mirrors the static HTML flows:

- **Tabs** (Community, Media, Sponsors, Events, Profile) — see `src/navigation/AppNavigator.tsx`.
- **Stacks** per tab map to the numbered HTML mockups (feed, messages, media library / player, event booking, profile settings, sponsors, onboarding, Grant Access signup).
- **Design tokens** — `src/designSystem.ts`.
- **Typography** — Bebas Neue + DM Sans via `@expo-google-fonts/*`, loaded in `App.tsx` (`loadAppFonts.ts`) to align with the HTML mockups.
- **HTML-derived content** — e.g. `src/data/upcomingEventsFromHtml.ts` (from `13-Upcoming Events.html`), community feed posts from `7-Community Feed.html`.
- **Demo hub** — Profile → “Demo flows hub”, or Community stack → `DemoHub` (same idea as `index.html`).

`Grant Access` (`32-…`) is **splash + create account** only; **Continue** switches to the **Community** tab (feed).

To load the **HTML mockups** in a **WebView** instead, set `EXPO_PUBLIC_USE_WEBVIEW_DEMO=1` (see `.env.example`); implementation in `src/WebDemoApp.tsx`.

## Backend roadmap docs

Product/backend planning and setup checklists live in **`docs/`** (auth, access model, monetization, storage, Stripe, QR check-in, RevenueCat, EAS release, UI wiring, secrets). **Implementation order:** **`docs/NEXT_STEPS.md`**. SQL sketch: **`backend/schema.sql`**.

## Expo SDK 54

- **Expo SDK 54** · **React Native 0.81** · **React 19** — use **Expo Go** that lists SDK 54, or a **development build** (`eas build`).
- **Node.js** — use **20.19+** (Expo recommendation).
- **Android HTTP (WebView demo)** — cleartext traffic is enabled via `expo-build-properties` in `app.json` (not the deprecated `android.usesCleartextTraffic` field).

## Run with Expo Go

1. From the **repo root** (parent of `expo-app/`):

   ```bash
   npx --yes serve -l tcp://0.0.0.0:5173
   ```

2. From **`expo-app/`**:

   ```bash
   npm install
   npx expo start
   ```

3. Scan the QR code. Enter your PC’s IP and port (e.g. `192.168.1.42:5173`) on first launch, or set `EXPO_PUBLIC_DALTON_WEB_URL` in `.env` (see `.env.example`).

## Why not “convert all HTML to React Native”?

- There is **no automatic** HTML → RN converter that preserves layout and behavior.
- Rebuilding **32** screens by hand means **new components**, **navigation**, **state**, and **assets** — it’s a **full app project**, not a format change.
- The **WebView** approach is the standard way to ship HTML/CSS demos inside Expo until you **incrementally** replace screens with RN.

If you want to **start** a real RN migration, do it **one flow at a time** (e.g. auth only) with **React Navigation**, and keep the rest in WebView until migrated.

## Store builds

Same as before: use **EAS Build** for `.aab` / `.ipa`. Point `EXPO_PUBLIC_DALTON_WEB_URL` at **HTTPS** for production.
