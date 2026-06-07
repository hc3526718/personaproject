import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hideNativeSplash } from './nativeSplashGate';
import { bootTrace } from './bootTrace';
import { AuthBootShell } from './AuthBootShell';
import { DS } from '../designSystem';

/**
 * Full app entry. AuthBootShell is a **static** import so Metro keeps it in the main bundle.
 * `require()` / `import()` of a split chunk calls `importAll` and can infinite-loop in release Hermes.
 */
export function BootAppGate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootTrace('BootAppGate: mount');
    hideNativeSplash();
    const id = requestAnimationFrame(() => {
      bootTrace('BootAppGate: render AuthBootShell');
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.hint}>Loading…</Text>
      </View>
    );
  }

  return <AuthBootShell />;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.color.background,
    paddingHorizontal: DS.space.xl,
  },
  hint: { fontSize: 18, color: DS.color.gold, textAlign: 'center' },
});
