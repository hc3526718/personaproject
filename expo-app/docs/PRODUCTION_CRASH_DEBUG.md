# Production-only crash (preview/dev work, TestFlight quits)

## Dev vs production — why they behave differently

| | Development | Production (TestFlight) |
|---|-------------|------------------------|
| JS | Metro serves from your PC; fast refresh | Single minified Hermes bundle baked into the IPA |
| `__DEV__` | `true` — demo logins, looser RC keys | `false` — stricter RevenueCat, no dev shortcuts |
| EAS env | Often missing vars → code paths skip native SDKs | **production** env on expo.dev — every `EXPO_PUBLIC_*` is set |
| Lazy `import()` | Forgiving chunk loading | Can **stack-overflow** on circular deps (`importAll` / `get` loop) |
| Console | Visible in Metro / dev menu | **Not visible** — use on-screen `EXPO_PUBLIC_BOOT_TRACE=1` |

A **development build** is useful for day-to-day work but **does not reproduce** store-bundle boot failures. Use **`production-diagnostic`** (release binary + boot trace overlay) instead.

## Why preview/dev work but production does not

| Factor | Development | Preview | Production (TestFlight) |
|--------|-------------|---------|-------------------------|
| JS source | Metro on your PC | Embedded in IPA | Embedded in IPA |
| `expo-dev-client` | Yes | No | No |
| EAS **environment** | Often `.env` / dev secrets | **preview** env on expo.dev | **production** env on expo.dev |
| OTA channel | Usually none | `preview` | `production` |
| Distribution | internal | internal | **store** |
| RevenueCat | `test_` keys allowed in `__DEV__` | Same release binary rules | **`test_` key can kill app natively** |

**No Sentry + no error UI** = crash happens **before React mounts** or in **native code** (not a normal JS exception).

**Sentry: `Maximum call stack size exceeded` + repeating `get@…` in `importAll`** = Metro circular dependency during `import()` (e.g. `notificationBannerPrefs` ↔ `notifyPrefsAccess` loaded via `ActionBannerProvider` at boot). Fix: extract shared types to `src/lib/inAppNotifyTypes.ts` so the cycle is gone.

EAS **build logs** only show compile success — they do not show runtime crashes on your phone.

## Step 1 — Minimal boot (proves native shell)

```powershell
cd expo-app
eas build --platform ios --profile production-minimal --clear-cache
```

Install the IPA (internal distribution / TestFlight if submitted).

- **Shows “Dalton boot OK”** → native binary is fine; crash is in the full JS/native app stack.
- **Still instant quit** → native plugin, signing, or device issue — capture crash log (Step 4).

## Step 2 — Diagnostic build (full app, no Sentry plugin, no OTA)

After **“Dalton boot OK”** on `production-minimal`, run the **full app** with probe labels:

```powershell
eas build --platform ios --profile production-diagnostic --clear-cache
```

Install from the Expo build page (internal / QR). You should see:

1. **Loading…** → **Loading fonts…** → **Starting auth…** → **Loading navigation…** → **Welcome / login**

Note the **last label** before a crash (if any). `EXPO_PUBLIC_BOOT_PROBE=1` shows gold text at the top.

**Boot trace overlay:** `EXPO_PUBLIC_BOOT_TRACE=1` (enabled on `production-diagnostic`) shows a scrolling log at the bottom of the screen with timestamps — no Mac console required. The **last line** before a quit is the failing step.

See **[STACK_OVERFLOW_EXPLAINED.md](./STACK_OVERFLOW_EXPLAINED.md)** for why `Maximum call stack size exceeded` happens and why you cannot “just reduce the stack.”

Boot path (current): `App` → `BootAppGate` → **static** `AuthBootShell` → `AuthProvider` → auth ready → `require` navigation (no `import()` at startup).

If diagnostic **opens to login**, compare **EAS production env** to diagnostic (especially `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` = `appl_…`), then ship `production` profile.

## Step 3 — Match preview env to production

On [expo.dev](https://expo.dev) → **dalton-demo** → **Environment variables**:

Compare **preview** vs **production**. Production must have:

- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` = `appl_…` (**never** `test_…`)
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Preview working with **missing** RC key is a clue: production may be **configuring** RevenueCat and crashing.

## Step 4 — Device crash log (required if still failing)

**iPhone:** Settings → Privacy & Security → Analytics → Analytics Data → newest `daltondemo` / `The Dalton Grant Academy` entry.

**Mac + Xcode:** Window → Devices and Simulators → your iPhone → **Open Console** or **View Device Logs**.

Look for `EXC_CRASH`, `RCTFatal`, `Purchases`, `EXUpdates`, `Sentry`.

Paste the first 30 lines of the crash thread into a support ticket / agent chat.

## Step 5 — Production store build (after minimal/diagnostic pass)

```powershell
eas build --platform ios --profile production --clear-cache
eas submit --platform ios --latest
```

`production` profile now sets `EXPO_PUBLIC_DISABLE_OTA=1` and disables EAS build cache to avoid stale native artifacts.

**Do not publish** `eas update` to `production` until the app opens reliably.

## OTA note

An older update on branch `production` used **runtime 1.0.0** while current builds use **1.0.1** — it should not apply, but OTA is disabled in new production builds anyway.
