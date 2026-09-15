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
 * Base config without Supabase `extra` â€” those are merged in `module.exports` on every evaluation
 * so Metro / EAS always pick up current `process.env` and `.env`.
 */
const baseExpo = {
  name: 'Dalton Demo',
  slug: 'dalton-demo',
  scheme: 'dalton-demo',
  version: '1.0.2',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-pixel.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.hc111.daltondemo',
    buildNumber: '44',
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.hc111.daltondemo',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
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
        image: './assets/splash-pixel.png',
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#0A0A0A',
          image: './assets/splash-pixel.png',
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
  ios.infoPlist = {
    ITSAppUsesNonExemptEncryption: false,
    ...(ios.infoPlist || {}),
  };
  expo.ios = ios;

  expo.extra = {
    eas: { projectId: EAS_PROJECT_ID },
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim(),
    supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  };

  return { expo };
};


