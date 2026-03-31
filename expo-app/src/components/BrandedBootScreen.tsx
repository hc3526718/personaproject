import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_LOGO } from '../constants/brandLogo';
import { DS } from '../designSystem';

export function BrandedBootScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Dalton Grant brand" />
        <Text style={styles.tagline}>Grant Access</Text>
        <ActivityIndicator size="large" color={DS.color.gold} style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.space.xl,
  },
  logo: {
    width: 220,
    height: 220,
    maxWidth: '72%',
  },
  tagline: {
    marginTop: DS.space.lg,
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    letterSpacing: 2,
    color: DS.color.textMuted,
    textTransform: 'uppercase',
  },
  spinner: {
    marginTop: DS.space.xl,
  },
});
