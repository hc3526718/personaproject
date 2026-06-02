import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DS } from '../designSystem';

type Props = {
  compact?: boolean;
};

/**
 * Boot-only spinner — avoids `react-native-svg` on the first paint after splash.
 * (SVG + Reanimated on some iOS release builds has caused native aborts before ErrorBoundary mounts.)
 */
export function BootSafeLoader({ compact = false }: Props) {
  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <ActivityIndicator size="large" color={DS.color.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: DS.space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapCompact: {
    marginTop: 0,
  },
});
