# TestFlight — production iOS build

The **home screen name** under the icon comes from the **native build**, not from JavaScript. An older TestFlight build may still show **DaltonDemo** if it was built before `app.config.js` set `name` and `CFBundleDisplayName` to **The Dalton Grant Academy**.

## Push a new build to TestFlight

From `expo-app` (after `eas login`):

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app

# Store / TestFlight (no Metro dev server required)
eas build --platform ios --profile production

# When the build finishes:
eas submit --platform ios --latest
```

Or build + submit in one flow (interactive):

```powershell
eas build --platform ios --profile production --auto-submit
```

## Profiles

| Profile | Use |
|---------|-----|
| `development` | Dev client; can attach to Metro |
| `preview` | Internal testing (Ad Hoc / internal distribution) |
| **`production`** | **App Store Connect → TestFlight → App Store** |

## Before you submit

1. **EAS env** — Production environment on [expo.dev](https://expo.dev) should include `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_DALTON_WEB_URL`, etc.
2. **App Store Connect** — App record uses bundle ID `com.hc111.daltondemo` (must match `app.config.js`).
3. **Version** — Bump `version` in `app.config.js` for each TestFlight upload (now `1.0.1+`). Production profile uses `autoIncrement` for build number.
4. **Free plan** — If EAS reports monthly iOS build limit, wait for reset or upgrade billing.

## After submit

1. App Store Connect → **TestFlight** → wait for processing (~10–30 min).
2. Add internal/external testers.
3. Install on device; confirm icon label **The Dalton Grant Academy**.

## Crash right after splash (never reaches login)

### Why dev builds work but TestFlight “instant quits”

| | **Development build** | **Production (TestFlight)** |
|--|-------------------------|-----------------------------|
| JavaScript | Loaded from **Metro** on your machine | **Embedded** in the `.ipa` (+ optional EAS Update) |
| `__DEV__` | `true` — softer failures, warnings | `false` — native SDKs can **abort** (RevenueCat `test_` key, etc.) |
| Sentry | Often no DSN locally | Needs time to init; **native** crashes may never upload |
| Error UI | Redbox / Metro | `AppErrorBoundary` only helps **JS** errors after React mounts |
| OTA | Usually off | `expo-updates` can replace JS on launch if misconfigured |

If the app **closes with no Sentry event and no “Could not open Dalton”**, treat it as a **native crash** or **bundle load failure** (not a normal React render error).

### Common causes and fixes

| Cause | Fix |
|-------|-----|
| **Stale EAS build** (wrong git commit) | `git push`, then `eas build --platform ios --profile production --clear-cache` |
| **Missing production env** on Expo | Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` (use `appl_…`, never `test_…`) |
| **EAS Update on launch** | Production uses `checkAutomatically: 'NEVER'`. To disable OTA entirely: `EXPO_PUBLIC_DISABLE_OTA=1` on EAS production + rebuild |
| **Native crash** | iPhone **Settings → Privacy → Analytics → Analytics Data** → look for `daltondemo` / `The Dalton Grant Academy`; or Xcode **Organizer → Crashes** |

### Isolate the binary (one build)

On EAS **production** env, set `EXPO_PUBLIC_MINIMAL_BOOT=1`, rebuild, install TestFlight. If you see **“Dalton boot OK”**, the native shell is fine and the crash is in the full app stack. Remove the flag and rebuild for the real app.

Boot hardening in app code: safe boot spinner (no SVG), deferred push/video preload, RevenueCat key guard, Sentry init after registration, `AppErrorBoundary` around the full tree.

See also `docs/STORE_RELEASE.md`.
