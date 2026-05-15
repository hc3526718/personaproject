import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DaltonBootRiveDisplay } from './DaltonBootRiveDisplay';
import { BouncingBrandLogo } from './BouncingBrandLogo';
import { DS } from '../designSystem';

type Props = {
  /** Height of the hero slot (welcome / auth). */
  height?: number;
};

/**
 * Rive boot animation for auth welcome — embed on web, native/bundled on dev builds.
 * Falls back to bounce logo if Rive fails to load.
 */
export function AuthWelcomeRiveHero({ height = 220 }: Props) {
  const [useFallback, setUseFallback] = useState(false);
  const ready = useRef(false);

  const onReady = useCallback(() => {
    ready.current = true;
  }, []);

  const onEmbedError = useCallback(() => {
    if (!ready.current) setUseFallback(true);
  }, []);

  const onNativeError = useCallback(() => {
    setUseFallback(true);
  }, []);

  return (
    <View style={[styles.slot, { height }]}>
      {useFallback ? (
        <BouncingBrandLogo size={160} />
      ) : (
        <DaltonBootRiveDisplay
          style={styles.rive}
          onBootVisualReady={onReady}
          onEmbedError={onEmbedError}
          onNativeError={onNativeError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.color.background,
    overflow: 'hidden',
  },
  rive: {
    width: '100%',
    height: '100%',
    backgroundColor: DS.color.background,
  },
});
