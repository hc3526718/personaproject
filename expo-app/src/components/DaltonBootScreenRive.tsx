import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Rive from 'rive-react-native';
import { Alignment, Fit, type RNRiveError } from 'rive-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DALTON_BOOT_ANIMATION,
  DALTON_BOOT_ARTBOARD,
  DALTON_BOOT_RIVE,
  DALTON_BOOT_STATE_MACHINE,
} from '../constants/riveBoot';
import { DS } from '../designSystem';
import { BootCircleLoader } from './BootCircleLoader';
import { BrandLogo } from './BrandLogo';

/** Rive boot UI — only loaded when not running inside Expo Go (dev / standalone builds). */
export function DaltonBootScreenRive() {
  const insets = useSafeAreaInsets();
  const [riveFailed, setRiveFailed] = useState(false);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const riveOptions = {
    ...(DALTON_BOOT_ARTBOARD ? { artboardName: DALTON_BOOT_ARTBOARD } : {}),
    ...(DALTON_BOOT_STATE_MACHINE ? { stateMachineName: DALTON_BOOT_STATE_MACHINE } : {}),
    ...(DALTON_BOOT_ANIMATION ? { animationName: DALTON_BOOT_ANIMATION } : {}),
  };

  if (riveFailed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.center}>
          <BrandLogo width={160} height={160} />
          <Text style={styles.tagline}>Grant Access</Text>
          <BootCircleLoader />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Rive
          source={DALTON_BOOT_RIVE}
          style={styles.rive}
          autoplay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          {...riveOptions}
          onError={(_e: RNRiveError) => setRiveFailed(true)}
        />
        <Text style={styles.tagline}>Grant Access</Text>
        <BootCircleLoader />
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
  rive: {
    width: 280,
    height: 280,
    maxWidth: '90%',
  },
  tagline: {
    marginTop: DS.space.lg,
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    letterSpacing: 2,
    color: DS.color.textMuted,
    textTransform: 'uppercase',
  },
});
