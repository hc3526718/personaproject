# Run the full app on a preview build (no Mac)

Use an **existing** EAS **preview** or **development** install on your iPhone. You do **not** need a new native build to try JS changes — Metro serves the bundle from your PC.

## Prerequisites

- A **preview** or **development** `.ipa` already on the phone (from a past `eas build --profile preview` or `development`).
- **Not** Expo Go — this app uses native modules (RevenueCat, Rive, etc.).
- Windows PC on the **same Wi‑Fi** as the iPhone (or USB tunneling if you use it).

## Steps

1. In `expo-app`, copy env for local dev (if you have not already):

   ```powershell
   cd expo-app
   copy .env.example .env
   ```

   Fill `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and any keys you use on preview in [expo.dev](https://expo.dev) → project → **Environment variables** → **preview**.

2. Clear Metro cache (if you see `Unable to deserialize cloned data`):

   ```powershell
   cd expo-app
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
   ```

   That message is **not fatal** — Metro falls back to a full crawl. Clearing cache makes the next start faster.

3. Start Metro (**without** `--tunnel` first — same Wi‑Fi as the phone):

   ```powershell
   npx expo start --clear
   ```

4. On the phone, open your **Dalton preview/dev** app (not TestFlight production).

5. Scan the QR code or choose **Development build** → connect to your machine’s URL.

6. The app loads the **full** tree from `App.tsx` (auth, navigation, tabs) — same structure as when preview worked before.

## If it does not connect

- Allow Metro through **Windows Firewall** for Node.js (private networks).
- Phone and PC on the **same Wi‑Fi**; open the preview app and scan the QR from the terminal (LAN URL, e.g. `exp://192.168.x.x:8081`).
- Shake device → dev menu → enter bundler URL manually if QR fails.

### Avoid `ngrok tunnel took too long to connect`

Do **not** use `--tunnel` unless LAN fails. Tunnel needs ngrok and is often blocked or slow on Windows.

```powershell
# Prefer this:
npx expo start --clear

# Only if LAN does not work (can timeout):
npx expo start --tunnel
```

If tunnel keeps failing, use LAN + firewall fix, or USB with `adb reverse tcp:8081 tcp:8081` (Android only).

## Preview vs production TestFlight

| | Preview + Metro | Production TestFlight |
|---|-----------------|------------------------|
| JS | From your PC (instant reload) | Baked into the IPA |
| Env | `.env` / preview on expo.dev | production env |
| Boot | Full `App.tsx` (this doc) | Separate production boot hardening when you have builds again |

Production-only boot experiments (`BootAppGate`, staged shells) are **not** used in this preview path — `App.tsx` is the full app again.

## When you get EAS builds again

- Use **preview** for day-to-day testing on device without Metro.
- Use **production** / **production-diagnostic** only for TestFlight crash fixes (after committing boot changes).
