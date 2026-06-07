# RangeError: Maximum call stack size exceeded (production boot)

## What it means (plain English)

JavaScript keeps a **call stack** — a list of “who called who” while your code runs. Each function call adds a frame. When a function returns, that frame is removed.

**Maximum call stack size exceeded** means the stack hit its limit. That almost always means **infinite recursion**: function A calls B calls A calls B… forever — not “the app is too big.”

You **cannot fix this by “reducing the stack size.”** The limit is there to stop runaway recursion from freezing the device. The fix is to **stop the infinite loop** in code or in the bundler.

## What your Sentry / `.ips` logs show

Your stack repeats the same line dozens of times:

```
get@141625:29
get@141625:29
…
importAll@227255:43
asyncRequireImpl@227259:20
```

That pattern is **Metro’s lazy module loader** (`import()` / loading a split JS chunk), stuck in a **getter loop** while resolving exports — not your login screen logic.

The iPhone `.ips` file (`TheDaltonGrantAcademy-2026-06-03-111744.ips`) shows:

- **~1 second** after launch (`procLaunch` → crash)
- **SIGABRT** on `com.meta.react.turbomodulemanager.queue` (native abort after the JS fatal error)
- **Hermes** running on the JS thread
- **RiveRuntime** and **Sentry** in the binary (normal for this app)

So: **JS stack overflow during module load** → React Native reports it → native side aborts → app closes before you can read the screen.

## Why dev works but TestFlight doesn’t

| Development | Production (TestFlight) |
|-------------|-------------------------|
| Metro serves many small files | One optimized Hermes bundle |
| Lazy `import()` is forgiving | `importAll` + circular deps → **getter loop** |
| `__DEV__` shortcuts | Full production env + native modules |

A **development build** with `console.log` will often **not** reproduce this — different loader and bundle layout.

## What we changed in code

1. **Removed `import()` from the boot path** — `ProductionAppShell` (which used `import('./AuthBootShell')`) was deleted.
2. **`AuthBootShell` is a static import** from `BootAppGate` so it stays in the **main bundle** (no async chunk for boot).
3. **`AuthContext` slimmed** — oauth, profile, sentry, boot video loaded via `require()` only when needed, not at module top.
4. **Sentry init deferred** 10s after launch; no `import('./sentryBoot')` at startup.
5. **Notification prefs cycle broken** — `inAppNotifyTypes.ts`; `notifyPrefsAccess` must never import `notificationBannerPrefs`.
6. **`RootGate.tsx`** — `index.ts` registers only `RootGate`; `App.tsx` loads in `useEffect` after the native runtime is ready (avoids `[runtime not ready]` + early `importAll` blowups).
7. **Sentry** — no sync `initSentryFromEnv` / `wrapWithSentry` during `index.ts` or `App` module evaluation; init runs after `RootGate` mounts.

Navigation still loads via `require()` **after** auth is ready (not during the first “Loading…” frame).

## What you should do

```powershell
cd expo-app
eas build --platform ios --profile production-diagnostic --clear-cache
```

Install the **new** build (build number must be **higher than 29**). Old builds still contain the `import()` boot chain.

If it still crashes, check Sentry: if the stack **still** shows `importAll` / `asyncRequireImpl`, note the build number — an old IPA may still be installed.

## Persisted boot trace (if trace enabled)

With `EXPO_PUBLIC_BOOT_TRACE=1`, lines are saved to AsyncStorage key `dalton_boot_trace` so you can read the last step even when the app closes instantly (e.g. from a future settings screen or dev menu).
