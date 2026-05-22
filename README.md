# Grant Access — website + product demo

This repository contains:

- **A presentable marketing website**: `index.html`
- **Legal pages**: `privacy.html` and `terms.html`
- **A clickable prototype hub**: `demo.html` (and the numbered mock screens)
- **An interactive Expo web export** under `web-deploy/app/` (built from `expo-app/`)

## Quick links

- Website: `index.html`
- Demo hub: `demo.html`
- Privacy: `privacy.html`
- Terms: `terms.html`

## Run on your computer

From this directory:

```bash
npx --yes serve -l 5173
```

Then open **http://localhost:5173** (or the URL printed in the terminal).

## Vercel deployment

This repo is pre-configured for Vercel with `vercel.json`.

- Build command: `npm run vercel-build`
- Output directory: `web-deploy`

After deploying, clean URLs are available:

- `/privacy` → `privacy.html`
- `/terms` → `terms.html`
- `/app` → interactive Expo web build (live product)
- `/demo` → redirects to `/app` (legacy URL)

## Test on a phone (same Wi‑Fi)

1. Find your PC’s LAN IP (e.g. `192.168.1.42`).
2. Start the server with host binding so the phone can reach it:

   ```bash
   npx --yes serve -l tcp://0.0.0.0:5173
   ```

3. On the phone, open `http://YOUR_IP:5173` (e.g. `http://192.168.1.42:5173`).

Allow the port through Windows Firewall if the page does not load.

## Demo wiring

- **Flows** chip (top-left) on every mockup except the hub links back to `demo.html`.
- **Shared tokens**: [shared/theme.css](shared/theme.css) (`:root` variables).
- **Route map** (for reference): [shared/routes.js](shared/routes.js) — the runtime copy is inlined in [shared/demo-shell.js](shared/demo-shell.js).
- Screens **without** a built-in tab bar get a **fallback dock** from `demo-shell.js` (Community / Media / Sponsors / Events / Profile).

## Expo Go / native shell

The **[expo-app/](expo-app/)** folder is an **Expo SDK 54** project (**React Native 0.81** / **React 19**; use a matching **Expo Go** or a dev build). By default it runs a **native React Native** shell with **bottom tabs** and **stacks** that mirror the HTML flows (community, media, events, sponsors, profile, onboarding, Grant Access signup), with **Bebas Neue + DM Sans** and tokens in `expo-app/src/designSystem.ts` — see `expo-app/src/navigation/AppNavigator.tsx` and `expo-app/src/data/` for HTML-derived copy where noted.

Set **`EXPO_PUBLIC_USE_WEBVIEW_DEMO=1`** to load the **static HTML demo** in a **WebView** instead. See **[expo-app/README.md](expo-app/README.md)** for run steps and SDK notes.

## Optional: Capacitor native shell

To wrap the same static files in a WebView app (after installing Node dependencies in a separate folder or this one):

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Dalton Demo" com.daltonproject.demo --web-dir .
npx cap add android
npx cap open android
```

Use [capacitor.config.json](capacitor.config.json) as a starting point; run `npx cap copy` after HTML changes.

## iOS / Android safe areas

Layouts use generous top padding (`pt-12` etc.). The **Flows** chip and fallback dock use `env(safe-area-inset-*)` from [shared/theme.css](shared/theme.css). On real devices, verify nothing is clipped under notches or home indicators.

## MCP (Cursor / IDE): Ruflo + reasoning notes

- **Ruflo** ([ruvnet/ruflo](https://github.com/ruvnet/ruflo)) is registered as an MCP server in `.vscode/mcp.json` and `config/mcporter.json` (`npx ruflo@latest mcp start`).
- See **[docs/MCP_RUFLO_AND_REASONING.md](docs/MCP_RUFLO_AND_REASONING.md)** for setup notes and a concise synthesis of **[gstack](https://github.com/garrytan/gstack)** patterns useful for future reasoning-based product work.
