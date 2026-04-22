/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

function loadEnv() {
  try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
  } catch {
    /* dotenv optional in some sandboxes */
  }
}

const EAS_PROJECT_ID = '8b3d97c5-6276-49b3-ab55-aa9b87e47047';

/**
 * Base config without Supabase `extra` — those are merged in `module.exports` on every evaluation
 * so Metro / EAS always pick up current `process.env` and `.env`.
 *
 * **Native splash:** `./assets/dalton_logo_final_img.png` on `#0A0A0A` (`resizeMode: 'contain'`, centered — same idea as the boot Rive slot). Rebuild native after changes.
 *
 * **App icons:** `icon` = 1024 master (store / Android base). `ios.icon` = smaller iOS home-screen source (152@2x).
 * Adaptive Android foreground + Web favicon from `dalton_logo_final_img-icons/`. iOS home-screen fill is the PNG itself; use `#0A0A0A` in the asset or keep adaptive-style padding in design.
 */
const ICON_1024 = './assets/dalton_logo_final_img-icons/iOS/Icon-1024.png';
const IOS_ICON_152 = './assets/dalton_logo_final_img-icons/iOS/Icon-76@2x.png';
const ADAPTIVE_FG = './assets/dalton_logo_final_img-icons/Android/mipmap-xxxhdpi/ic_launcher_foreground.png';
const WEB_FAVICON = './assets/dalton_logo_final_img-icons/Web/favicon-48x48.png';

const baseExpo = {
  name: 'Dalton Demo',
  slug: 'dalton-demo',
  scheme: 'dalton-demo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: ICON_1024,
  userInterfaceStyle: 'dark',
  /** Native splash — `dalton_logo_final_img.png` + `#0A0A0A` (centered `contain`, matches boot hero). */
  splash: {
    image: './assets/dalton_logo_final_img.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.hc111.daltondemo',
    /** Smaller raster than 1024; Expo uses this for the iOS app icon when set. */
    icon: IOS_ICON_152,
    /** Redundant with root `splash` — helps Xcode / prebuild pick the correct storyboard asset. */
    splash: {
      image: './assets/dalton_logo_final_img.png',
      resizeMode: 'contain',
      backgroundColor: '#0A0A0A',
    },
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          'rive.app': {
            NSIncludesSubdomains: true,
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSExceptionRequiresForwardSecrecy: true,
            NSExceptionMinimumTLSVersion: 'TLSv1.2',
          },
        },
      },
    },
  },
  android: {
    package: 'com.hc111.daltondemo',
    adaptiveIcon: {
      backgroundColor: '#0A0A0A',
      foregroundImage: ADAPTIVE_FG,
      /** Pack has no separate monochrome layer; reuse foreground (replace with silhouette if Android 13 themed icon matters). */
      monochromeImage: ADAPTIVE_FG,
    },
    splash: {
      image: './assets/dalton_logo_final_img.png',
      resizeMode: 'contain',
      backgroundColor: '#0A0A0A',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: WEB_FAVICON,
  },
  plugins: [
    /** Source maps / native symbols: set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` for EAS (see docs). */
    '@sentry/react-native/expo',
    'expo-font',
    'expo-web-browser',
    'expo-apple-authentication',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Dalton to access your photos and videos for uploads.',
        cameraPermission: 'Allow Dalton to use your camera for uploads.',
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
        },
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0A0A0A',
        image: './assets/dalton_logo_final_img.png',
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#0A0A0A',
          image: './assets/dalton_logo_final_img.png',
        },
      },
    ],
  ],
  owner: 'hc111',
};

module.exports = () => {
  loadEnv();

  const expo = { ...baseExpo };
  const baseUrl = (process.env.EXPO_WEB_BASE_PATH || '').trim();
  if (baseUrl) {
    expo.experiments = { ...(expo.experiments || {}), baseUrl };
  }

  const ios = { ...(expo.ios || {}) };
  ios.config = {
    usesNonExemptEncryption: false,
    ...(ios.config || {}),
  };
  const infoPlistMerged = {
    ITSAppUsesNonExemptEncryption: false,
    ...(ios.infoPlist || {}),
  };
  const existingUrlTypes = Array.isArray(infoPlistMerged.CFBundleURLTypes)
    ? infoPlistMerged.CFBundleURLTypes
    : [];
  /** Matches `config/google_ios_client.plist` (Google iOS OAuth client for this bundle). */
  const googleIosUrlScheme =
    'com.googleusercontent.apps.65998673081-1q0rhgc3v91banhml84srq1tktrfsmpd';
  const hasGoogleUrlScheme = existingUrlTypes.some(
    (e) =>
      e &&
      typeof e === 'object' &&
      Array.isArray(e.CFBundleURLSchemes) &&
      e.CFBundleURLSchemes.includes(googleIosUrlScheme),
  );
  ios.infoPlist = {
    ...infoPlistMerged,
    CFBundleURLTypes: hasGoogleUrlScheme
      ? existingUrlTypes
      : [
          ...existingUrlTypes,
          {
            CFBundleURLName: 'Google OAuth iOS client',
            CFBundleURLSchemes: [googleIosUrlScheme],
          },
        ],
  };
  expo.ios = ios;

  expo.extra = {
    eas: { projectId: EAS_PROJECT_ID },
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim(),
    supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    /** Direct HTTPS `.riv` URL for native Rive; same as `EXPO_PUBLIC_RIVE_URL`. */
    riveAnimationUrl: (process.env.EXPO_PUBLIC_RIVE_URL || '').trim(),
    riveEmbedUrl:
      (process.env.EXPO_PUBLIC_RIVE_EMBED_URL || '').trim() ||
      'https://rive.app/s/2b5r5odTC0qRPicJRWg9Kw/embed?runtime=rive-renderer',
  };

  return { expo };
};
