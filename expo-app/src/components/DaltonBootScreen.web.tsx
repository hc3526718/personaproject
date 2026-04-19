import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../designSystem';
import { BrandLogo } from './BrandLogo';

/** Web boot: static SVG logo + spinner (Rive native module not used on web). */
export function DaltonBootScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <BrandLogo width={200} height={200} />
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
  tagline: {
    marginTop: 24,
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    letterSpacing: 2,
    color: DS.color.textMuted,
    textTransform: 'uppercase',
  },
  spinner: {
    marginTop: 32,
  },
});
