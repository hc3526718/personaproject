import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { DS } from '../designSystem';
import { WEB_MAX_CONTENT_WIDTH } from '../layout/webLayout';

/** Centers the RN app column on wide web viewports (same shell as mobile). */
export function WebAppFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return (
    <View style={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: DS.color.background,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_CONTENT_WIDTH,
  },
});
