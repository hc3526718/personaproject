import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dalton_accessibility_prefs_v2';

/** In-app accessibility toggles (App Store declaration subset). */
export type AccessibilityPrefs = {
  largerText: boolean;
  differentiateWithoutColor: boolean;
  sufficientContrast: boolean;
};

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPrefs = {
  largerText: false,
  differentiateWithoutColor: false,
  sufficientContrast: false,
};

const KEYS: (keyof AccessibilityPrefs)[] = [
  'largerText',
  'differentiateWithoutColor',
  'sufficientContrast',
];

/** Cloud `user_settings.preferences.accessibility` shape (snake_case). */
export type AccessibilityPrefsCloud = {
  larger_text?: boolean;
  differentiate_without_color?: boolean;
  sufficient_contrast?: boolean;
};

export function prefsToCloud(p: AccessibilityPrefs): AccessibilityPrefsCloud {
  return {
    larger_text: p.largerText,
    differentiate_without_color: p.differentiateWithoutColor,
    sufficient_contrast: p.sufficientContrast,
  };
}

export function prefsFromCloud(c: AccessibilityPrefsCloud | undefined): Partial<AccessibilityPrefs> {
  if (!c) return {};
  const out: Partial<AccessibilityPrefs> = {};
  if (typeof c.larger_text === 'boolean') out.largerText = c.larger_text;
  if (typeof c.differentiate_without_color === 'boolean') {
    out.differentiateWithoutColor = c.differentiate_without_color;
  }
  if (typeof c.sufficient_contrast === 'boolean') out.sufficientContrast = c.sufficient_contrast;
  return out;
}

function migrateLegacy(raw: Record<string, unknown>): Partial<AccessibilityPrefs> {
  const out: Partial<AccessibilityPrefs> = {};
  if (typeof raw.largerText === 'boolean') out.largerText = raw.largerText;
  if (typeof raw.differentiateWithoutColor === 'boolean') {
    out.differentiateWithoutColor = raw.differentiateWithoutColor;
  }
  if (typeof raw.sufficientContrast === 'boolean') out.sufficientContrast = raw.sufficientContrast;
  return out;
}

export async function loadAccessibilityPrefs(): Promise<AccessibilityPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      const legacy = await AsyncStorage.getItem('dalton_accessibility_prefs_v1');
      if (!legacy) return { ...DEFAULT_ACCESSIBILITY_PREFS };
      const o = JSON.parse(legacy) as Record<string, unknown>;
      const migrated = migrateLegacy(o);
      const merged = { ...DEFAULT_ACCESSIBILITY_PREFS, ...migrated };
      await AsyncStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
    }
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: AccessibilityPrefs = { ...DEFAULT_ACCESSIBILITY_PREFS };
    for (const k of KEYS) {
      if (typeof o[k] === 'boolean') out[k] = o[k] as boolean;
    }
    return out;
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFS };
  }
}

export async function saveAccessibilityPrefs(prefs: Partial<AccessibilityPrefs>): Promise<AccessibilityPrefs> {
  const cur = await loadAccessibilityPrefs();
  const next = { ...cur, ...prefs };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
