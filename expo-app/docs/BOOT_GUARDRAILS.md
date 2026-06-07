# Boot guardrails (keep the app stable)

This documents the **working boot architecture** after fixing Metro stack overflows, UTF-16 encoding, and the `daltonBootVideo` platform cycle. Follow these rules on every change that touches startup, notifications, or platform-specific files.

## Stable startup chain

```
index.ts          → gesture-handler, splash, WebBrowser; registerRootComponent(RootGate)
RootGate.tsx      → empty shell until mount; require('./App'); deferred Sentry init
App.tsx           → AuthProvider → providers → AppNavigator when fonts + auth ready
```

Do **not** import `App` from `index.ts`. Do **not** call `initSentryFromEnv()` at the top level of `index.ts`.

## Notification prefs (no import cycle)

| Module | Role |
|--------|------|
| `src/lib/inAppNotifyTypes.ts` | Types + defaults only — **no imports from other app modules** |
| `src/lib/notifyPrefsAccess.ts` | Master/basic category gates — imports **only** `inAppNotifyTypes` |
| `src/lib/notificationBannerPrefs.ts` | Load/save prefs + banner rules — imports `inAppNotifyTypes` + `notifyPrefsAccess` |

**Never** import `notificationBannerPrefs` from `notifyPrefsAccess.ts`.

## Boot video (no platform self-cycle)

| File | Role |
|------|------|
| `src/constants/daltonBootVideo.ts` | Shared `DALTON_BOOT_VIDEO_BG`, `warmDaltonBootVideoCache` (web preload) |
| `src/constants/daltonBootVideoNativeAsset.native.ts` | Native-only `require()` for `VideoP.mp4` |

**Never** add `daltonBootVideo.native.ts` that re-exports from `./daltonBootVideo` — on iOS Metro resolves that path back to the `.native.ts` file and loops.

## Do not re-enable (without full preview + device test)

- `BootAppGate`, `AuthBootShell`, `ProductionAppShell`, `DeferredAppProviders`
- Staged `import()` / `require()` boot shells for the root app
- `import('./AuthBootShell')` or lazy navigation `require()` at **first paint**
- Sync `initSentryFromEnv()` + `wrapWithSentry` **both** at `index.ts` evaluation time

`wrapWithSentry(App)` in `App.tsx` is OK **only** while `RootGate` defers loading `App`.

## File encoding (Windows)

Save all `.ts` / `.tsx` as **UTF-8** in Cursor/VS Code (status bar). Notepad “Unicode” = UTF-16 → Babel error `Unexpected character ''`.

## Automated checks

```powershell
cd expo-app
npm run check:boot          # fast: encoding, entry, prefs, platform files
npm run check:cycles        # + madge circular dependency scan from index.ts
```

Run `check:boot` before commits that touch `index.ts`, `App.tsx`, `RootGate.tsx`, notify prefs, or `*.native.ts`.

Before an **EAS production** build: run both checks and `npx expo start --clear` on a **development** client.

## Safe way to add features

1. Keep `App.tsx` as the full provider + navigator shell.
2. Add screens/services via normal imports — avoid new cycles (run `check:cycles`).
3. Cherry-pick one concern at a time; test on dev client + Metro after each.
4. Commit `inAppNotifyTypes.ts` and guardrail scripts with boot changes.

## Related docs

- `RECOVERY_BASELINE.md` — git commits vs EAS build numbers
- `STACK_OVERFLOW_EXPLAINED.md` — why `importAll` blew the stack
- `PREVIEW_ON_WINDOWS.md` — Metro + internal dev build
