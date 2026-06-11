import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

let installed = false;

/** Globally scale `fontSize` in flattened styles when accessibility text scale > 1. */
export function installA11yStyleSheetPatch(scale: number): void {
  const clamped = scale <= 1 ? 1 : scale;
  const patched = StyleSheet.flatten as typeof StyleSheet.flatten & { __a11yScale?: number };

  if (!installed) {
    const original = StyleSheet.flatten.bind(StyleSheet);
    StyleSheet.flatten = ((style: StyleProp<TextStyle>) => {
      const flat = original(style);
      if (!flat || typeof flat !== 'object') return flat;
      const active = patched.__a11yScale ?? 1;
      if (active <= 1 || typeof flat.fontSize !== 'number') return flat;
      return { ...flat, fontSize: Math.round(flat.fontSize * active) };
    }) as typeof StyleSheet.flatten;
    installed = true;
  }

  patched.__a11yScale = clamped;
}
