import { Platform } from 'react-native';
import { DS } from '../designSystem';
import type { AccessibilityPrefs } from './accessibilityPrefs';

/**
 * `DS.color` is defined `as const`, so `typeof DS.color` would otherwise infer
 * *literal* string types (e.g. `background` must be exactly "#0A0A0A").
 * For accessibility variants we intentionally widen these to plain strings.
 */
export type AccessibleColors = {
  [K in keyof typeof DS.color]: string;
} & {
  emphasisBorder: string;
  /** Used in some screens as a softer label color. */
  textSubtle: string;
  /** Stronger border for high-contrast mode. */
  borderStrong: string;
  /** Stronger panel fill for high-contrast mode. */
  panelStrong: string;
  /** Text on light surfaces (mono / high-contrast cards). */
  textOnLight: string;
};

/** Solid, opaque palette — no translucent rgba tints. */
const CONTRAST: Partial<AccessibleColors> = {
  background: '#000000',
  surface: '#141414',
  surfaceAlt: '#1A1A1A',
  input: '#2E2E2E',
  text: '#FFFFFF',
  textMuted: '#F0F0F0',
  textSubtle: '#E0E0E0',
  screenTitle: '#FFFFFF',
  border: '#B8B8B8',
  borderStrong: '#FFFFFF',
  borderHairline: '#787878',
  borderHairlineLight: '#5A5A5A',
  borderWhite5: '#3A3A3A',
  panel: '#1A1A1A',
  panelStrong: '#242424',
  gold: '#FFD54F',
  goldTint10: '#3D3520',
  goldTint30: '#665522',
  goldTint90: '#E8C96A',
  cardBorder: '#FFD54F',
  postBorderGold20: '#8A7340',
  emphasisBorder: '#FFFFFF',
  textOnLight: '#000000',
};

/**
 * Differentiate without colour: text/icons/borders only — images and logos keep natural colours.
 * Text on dark backgrounds is white; text on light surfaces is black.
 */
const MONO: Partial<AccessibleColors> = {
  background: '#000000',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F2',
  input: '#E8E8E8',
  text: '#FFFFFF',
  textMuted: '#F0F0F0',
  textSubtle: '#E0E0E0',
  screenTitle: '#FFFFFF',
  border: '#FFFFFF',
  borderStrong: '#FFFFFF',
  borderHairline: '#CCCCCC',
  borderHairlineLight: '#DDDDDD',
  borderWhite5: '#EEEEEE',
  gold: '#FFFFFF',
  goldTint10: '#333333',
  goldTint30: '#666666',
  goldTint90: '#FFFFFF',
  cardBorder: '#FFFFFF',
  postBorderGold20: '#CCCCCC',
  panel: '#1A1A1A',
  panelStrong: '#222222',
  emphasisBorder: '#FFFFFF',
  textOnLight: '#000000',
};

export function buildAccessibleColors(prefs: AccessibilityPrefs): AccessibleColors {
  const base: AccessibleColors = {
    ...DS.color,
    emphasisBorder: DS.color.borderStrong,
    textOnLight: '#000000',
  };

  if (prefs.differentiateWithoutColor) {
    return { ...base, ...MONO, emphasisBorder: MONO.emphasisBorder ?? '#FFFFFF' };
  }

  if (prefs.sufficientContrast) {
    return { ...base, ...CONTRAST, emphasisBorder: CONTRAST.emphasisBorder ?? '#FFFFFF' };
  }

  return base;
}

/** Text scale multiplier (1×, 2×, 3× lock positions). */
export function textScaleForPrefs(prefs: AccessibilityPrefs): number {
  const level = prefs.textScaleLevel ?? (prefs.largerText ? 2 : 1);
  if (level >= 3) return 1.42;
  if (level >= 2) return 1.28;
  return 1;
}

export function scaledFontSize(size: number, prefs: AccessibilityPrefs): number {
  return Math.round(size * textScaleForPrefs(prefs));
}

/** Apply CSS variables / classes on marketing + Expo web. */
export function applyAccessibilityWebSurface(prefs: AccessibilityPrefs): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  const scale = textScaleForPrefs(prefs);
  const mono = prefs.differentiateWithoutColor;
  const contrast = prefs.sufficientContrast;

  root.style.setProperty('--demo-bg', contrast || mono ? '#000000' : '#0a0a0a');
  root.style.setProperty('--demo-text', contrast || mono ? '#ffffff' : '#d4d0c8');
  root.style.setProperty(
    '--demo-gold',
    mono ? '#ffffff' : contrast ? '#ffd54f' : '#c8a84b',
  );
  root.style.setProperty('--dalton-text-scale', String(scale));
  root.classList.toggle('dalton-a11y-mono', mono);
  root.classList.toggle('dalton-a11y-contrast', contrast);
  root.classList.toggle('dalton-a11y-text-lg', scale > 1.05);

  const id = 'dalton-a11y-global';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = `
    html.dalton-a11y-text-lg [class*="css-text"], html.dalton-a11y-text-lg input, html.dalton-a11y-text-lg textarea {
      font-size: calc(1em * var(--dalton-text-scale, 1)) !important;
    }
    html.dalton-a11y-mono img, html.dalton-a11y-mono video, html.dalton-a11y-contrast img, html.dalton-a11y-contrast video {
      filter: none !important;
    }
  `;
}
