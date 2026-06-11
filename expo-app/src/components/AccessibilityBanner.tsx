import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { DS } from '../designSystem';

function buildBannerMessage(prefs: ReturnType<typeof useAccessibility>['prefs']): string | null {
  const parts: string[] = [];
  const level = prefs.textScaleLevel ?? (prefs.largerText ? 2 : 1);
  if (level > 1) parts.push(`${level}× scale enabled`);
  if (prefs.sufficientContrast) parts.push('Sufficient contrast enabled');
  if (prefs.differentiateWithoutColor) parts.push('Differentiate without colour enabled');
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

/** Top-of-app banner when accessibility display options are active. */
export function AccessibilityBanner() {
  const insets = useSafeAreaInsets();
  const { prefs, colors } = useAccessibility();
  const message = buildBannerMessage(prefs);
  if (!message) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top > 0 ? insets.top : DS.space.sm,
          backgroundColor: colors.surfaceAlt,
          borderBottomColor: colors.emphasisBorder ?? colors.borderStrong,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={message}
    >
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
