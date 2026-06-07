import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: '#0A0A0A' },
});

/**
 * Defers loading `App.tsx` until after the native runtime is ready.
 * Evaluating the full navigator + provider graph during `index.ts` caused
 * `[runtime not ready]` and Metro `importAll` stack overflows on device.
 */
function RootGate() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    try {
      const mod = require('./App') as { default?: ComponentType };
      if (typeof mod?.default !== 'function') {
        console.error(
          '[RootGate] App.tsx did not export a component (bundle evaluation likely failed — check Metro errors above).',
        );
        return;
      }
      setApp(() => mod.default!);
    } catch (e) {
      console.error('[RootGate] require("./App") failed', e);
      return;
    }
    void import('./src/monitoring/sentryBoot')
      .then(({ initSentryFromEnv }) => {
        try {
          initSentryFromEnv();
        } catch {
          /* non-fatal */
        }
      })
      .catch(() => {});
  }, []);

  if (!App) {
    return <View style={styles.gate} />;
  }
  return <App />;
}

export default RootGate;
