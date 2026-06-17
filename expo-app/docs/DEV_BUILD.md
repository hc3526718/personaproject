# Development build — test auth on a real device

Use a **development client** (not Expo Go) to test email/password, Google, Apple, and deep links on your phone while loading JS from Metro on your PC.

## One-time setup

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app

# Log in to Expo (if needed)
npx eas login

# Copy env and fill Supabase keys
copy .env.example .env
# Edit .env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, etc.
```

### Supabase redirect URLs (required for Google + deep links)

In **Supabase → Authentication → URL Configuration → Redirect URLs**, add:

- `dalton-demo://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (simulator / USB)
- `exp://YOUR_LAN_IP:8081/--/auth/callback` (physical device on Wi‑Fi)

Get your dev redirect URL after Metro starts:

```powershell
npx expo start
# In another terminal, or add temporarily to App.tsx __DEV__:
node -e "const Linking=require('expo-linking'); console.log(Linking.createURL('auth/callback'))"
```

Add every URL printed to Supabase redirect allowlist.

## Build the dev client (install once on iPhone)

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app

# iOS dev client (internal distribution — install via EAS link or TestFlight internal)
eas build --platform ios --profile development

# Android APK (optional)
eas build --platform android --profile development
```

When the build finishes, open the EAS build page QR/link and install on your device.

## Run Metro and connect the dev client

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app

# Start dev server (LAN — phone and PC on same Wi‑Fi)
npx expo start --dev-client

# Or tunnel if LAN is blocked:
# npx expo start --dev-client --tunnel
```

On the phone: open **The Dalton Grant Academy** dev build → scan QR or enter Metro URL.

## What you can test

| Flow | Dev client |
|------|------------|
| Email sign-up / log in | Yes |
| Email confirm deep link | Yes (add `exp://…/--/auth/callback` to Supabase) |
| Password reset deep link | Yes |
| Google sign-in | Yes (not in Expo Go) |
| Apple sign-in | Yes on real iOS device (not in Expo Go) |

## Quick web test (no device build)

```powershell
cd C:\Users\haydn\Downloads\DaltonProject\expo-app
npx expo start --web
```

Open `http://localhost:8081` — good for email/password only; OAuth uses `/app/auth/callback`.

## After auth fixes — ship to TestFlight

```powershell
eas build --platform ios --profile production
eas submit --platform ios --latest
```
