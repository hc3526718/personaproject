import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dalton_accessibility_prefs_v1';

export type AccessibilityPrefs = {
  voiceOver: boolean;
  voiceControl: boolean;
  largerText: boolean;
  lightInterface: boolean;
  differentiateWithoutColor: boolean;
  sufficientContrast: boolean;
  reducedMotion: boolean;
  captions: boolean;
};

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPrefs = {
  voiceOver: false,
  voiceControl: false,
  largerText: false,
  lightInterface: false,
  differentiateWithoutColor: false,
  sufficientContrast: false,
  reducedMotion: false,
  captions: false,
};

const KEYS: (keyof AccessibilityPrefs)[] = [
  'voiceOver',
  'voiceControl',
  'largerText',
  'lightInterface',
  'differentiateWithoutColor',
  'sufficientContrast',
  'reducedMotion',
  'captions',
];

export async function loadAccessibilityPrefs(): Promise<AccessibilityPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_ACCESSIBILITY_PREFS };
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

export async function saveAccessibilityPrefs(prefs: Partial<AccessibilityPrefs>): Promise<void> {
  const cur = await loadAccessibilityPrefs();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, ...prefs }));
}

