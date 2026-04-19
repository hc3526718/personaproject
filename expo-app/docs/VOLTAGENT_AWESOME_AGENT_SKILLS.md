# VoltAgent / “awesome-agent-skills” and this repo

The GitHub repo **[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)** (often misspelled “Voltagent”) is a **curated index of links** to Agent Skills that live in **other repositories**. It does **not** ship a single installable bundle you can drop into an Expo app.

## What we did instead (mobile-relevant)

Aligned this project with common themes from that ecosystem **without** vendoring every linked skill:

| Theme | Change in `expo-app` |
|--------|----------------------|
| **Transport / Rive** | Boot uses **native** `rive-react-native` (bundled `.riv` or `EXPO_PUBLIC_RIVE_URL`); no Rive Cloud WebView embed. |
| **WebView boot** | *(Removed — boot no longer uses a Rive embed WebView.)* |
| **OAuth** | `isOAuthReturnUrlTrusted()` checks return URL **scheme** matches expected redirect before `exchangeCodeForSession`. |
| **Icons** | `ios.icon` uses **Icon-76@2x** (152px); root `icon` stays **Icon-1024** for store / tooling. **#0A0A0A** is already Android adaptive background; iOS icon “fill” is still the **PNG pixels** (bake background in design if needed). |

## How to use the curated list for real

1. Open the [README](https://github.com/VoltAgent/awesome-agent-skills/blob/main/README.md) and pick skills by category (security, Expo, React Native, etc.).  
2. Install only skills you need via **Cursor’s skill installer** or by copying each skill’s `SKILL.md` from its **own** repo.  
3. Re-run **Expo Doctor** / **EAS** after native config changes (`prebuild` / new build).

## Rive “ready right after splash”

Boot Rive is configured in `src/constants/riveBoot.ts`: **native** bundled `dalton_animated_logo.riv` or hosted `.riv` via `EXPO_PUBLIC_RIVE_URL`. Expo Go uses the bounce fallback (no native module). Native splash is dismissed in a **layout** effect so the dark shell appears immediately.
