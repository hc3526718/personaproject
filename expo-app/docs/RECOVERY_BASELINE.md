# Recovery baseline (return to a working app, then re-apply changes)

EAS build numbers (17, 18, 29, 30) are **not stored in git**. We use **git commits** as the source of truth and map them approximately to when preview/TestFlight worked.

## Recommended baseline commit

| Commit | Date (approx) | Why |
|--------|----------------|-----|
| **`40f6e30`** | Before TestFlight boot refactors | Full `App.tsx`, no staged boot / `import()` shells. Includes VideoP, push, notification settings. |
| `91c4eb4` | Slightly earlier | Same simple `App.tsx` pattern if you need to go further back. |

**Avoid as baseline:** `b5bf812` and `c848a8d` — introduced `AppErrorBoundary` + boot hardening that correlated with production `importAll` / stack overflows (keep *parts* of those commits selectively).

## What broke after the baseline

1. **`b5bf812`** — Large feature commit + `AppErrorBoundary` + boot/video changes (mostly good; keep files outside `App.tsx`).
2. **`c848a8d`** — Staged boot in `App.tsx`, deferred push, OTA flags (revert `App.tsx` / `index.ts` from this).
3. **Uncommitted boot experiments** — `BootAppGate`, `AuthBootShell`, `ProductionAppShell`, etc. (not used after recovery).
4. **Circular notify prefs** — Fixed by `src/lib/inAppNotifyTypes.ts` (must stay).

## Current stable state (post-recovery)

- **`index.ts`** → `RootGate` only (no sync Sentry / no direct `App` import)
- **`RootGate.tsx`** → loads `App` after native runtime is ready
- **`App.tsx`** → full providers + `AppNavigator` (same logic as **`40f6e30`** shell)
- **`inAppNotifyTypes.ts`** + split boot video assets (no `daltonBootVideo.native.ts` re-export cycle)
- Automated checks: **`npm run check:boot`** / **`npm run check:cycles`** — see **`BOOT_GUARDRAILS.md`**
- `revenueCat.ts` guards from **`b5bf812`** remain (block `test_` keys in release)
- Legacy boot experiments under `src/boot/` (e.g. `BootAppGate`) are **unused** — do not wire back into `App.tsx`

## Re-apply changes safely (order)

When you have EAS builds again, cherry-pick or merge **one area at a time**, then test **preview + Metro** before a production build:

1. **Keep** — everything already on `main` except boot entry (migrations, wallet, community, VideoP, etc.).
2. **Re-add** `AppErrorBoundary` wrapper in `App.tsx` only (from `b5bf812`) — test preview.
3. **Re-add** splash/auth timing tweaks from `b5bf812` (`BootVideoWarmup`, `nativeSplashGate`) — test preview.
4. **Do not re-add** — `BootAppGate`, `ProductionAppShell`, lazy `import()` boot, or `production-minimal` until production is stable.
5. **Production-only** — RevenueCat `appl_` keys on EAS **production** env; never `test_` in store builds.

## Git commands (if you want a dedicated branch)

```powershell
cd c:\Users\haydn\Downloads\DaltonProject
git checkout -b recovery/40f6e30-baseline
# App.tsx and index.ts already at 40f6e30 in working tree
git add expo-app/App.tsx expo-app/index.ts expo-app/RootGate.tsx expo-app/scripts/boot-guardrails.mjs expo-app/docs/BOOT_GUARDRAILS.md expo-app/src/lib/inAppNotifyTypes.ts expo-app/src/constants/daltonBootVideoNativeAsset.native.ts
git commit -m "Recovery: restore 40f6e30 app entry and fix notify prefs cycle"
```

To see what you would re-apply later:

```powershell
git log 40f6e30..HEAD --oneline
git diff 40f6e30..HEAD --stat
```

## Install an old EAS build (17 / 18) on the phone

If Expo still lists builds 17 or 18:

1. [expo.dev](https://expo.dev) → **dalton-demo** → **Builds**
2. Open build **17** or **18** → install IPA (internal)
3. That binary is **frozen** — it will not include recovery commits until you build again.

For **live JS** without a new build: use **preview/dev** app + `npx expo start` (see `PREVIEW_ON_WINDOWS.md`).

## Test after recovery

```powershell
cd expo-app
Remove-Item -Recurse -Force node_modules\.cache, .expo -ErrorAction SilentlyContinue
npx expo start --clear
```

Open the **preview/development** app on the phone (not TestFlight production).
