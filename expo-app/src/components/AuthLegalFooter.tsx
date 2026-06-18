import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DS } from '../designSystem';
import { openLegalPage } from '../lib/legalUrls';

/** Terms / Privacy / Cookies on auth screens (web). */
export function AuthLegalFooter() {
  if (Platform.OS !== 'web') return null;

  const link = (label: string, path: '/terms' | '/privacy' | '/cookie-policy') => (
    <Pressable accessibilityRole="link" onPress={() => void openLegalPage(path)}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      {link('Terms of Use', '/terms')}
      <Text style={styles.sep}>·</Text>
      {link('Privacy Policy', '/privacy')}
      <Text style={styles.sep}>·</Text>
      {link('Cookies', '/cookie-policy')}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.lg,
  },
  link: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    textDecorationLine: 'underline',
  },
  sep: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
  },
});
