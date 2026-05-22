import { DS } from '../designSystem';
import type { AccessibilityPrefs } from './accessibilityPrefs';

export type AccessibleColors = typeof DS.color & {
  /** Stronger borders when differentiating without color alone. */
  emphasisBorder: string;
};

const CONTRAST = {
  text: '#F2EFE8',
  textMuted: '#B8B3AB',
  textSubtle: '#9A958E',
  border: 'rgba(255,255,255,0.16)',
  borderStrong: 'rgba(255,255,255,0.28)',
  panel: 'rgba(255,255,255,0.07)',
  panelStrong: 'rgba(255,255,255,0.11)',
};

export function buildAccessibleColors(prefs: AccessibilityPrefs): AccessibleColors {
  const base = { ...DS.color };
  if (prefs.sufficientContrast) {
    return {
      ...base,
      text: CONTRAST.text,
      textMuted: CONTRAST.textMuted,
      textSubtle: CONTRAST.textSubtle,
      border: CONTRAST.border,
      borderStrong: CONTRAST.borderStrong,
      panel: CONTRAST.panel,
      panelStrong: CONTRAST.panelStrong,
      emphasisBorder: CONTRAST.borderStrong,
    };
  }
  return {
    ...base,
    emphasisBorder: prefs.differentiateWithoutColor ? DS.color.borderStrong : DS.color.border,
  };
}

/** Text scale multiplier applied to typography tokens. */
export function textScaleForPrefs(prefs: AccessibilityPrefs): number {
  return prefs.largerText ? 1.14 : 1;
}

export function scaledFontSize(size: number, prefs: AccessibilityPrefs): number {
  return Math.round(size * textScaleForPrefs(prefs));
}
