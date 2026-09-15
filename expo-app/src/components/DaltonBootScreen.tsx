import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../designSystem';
import { BootCircleLoader } from './BootCircleLoader';

/**
 * Full-screen boot. Expo Go cannot load Rive — minimal text + ring loader only.
 * Dev / release builds load `DaltonBootScreenRive` (your `.riv` logo animation).
 */
export function DaltonBootScreen() {
  const insets = useSafeAreaInsets();
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (isExpoGo) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.center}>
          <Text style={styles.tagline}>Grant Access</Text>
          <BootCircleLoader />
        </View>
      </View>
    );
  }

  const { DaltonBootScreenRive } = require('./DaltonBootScreenRive') as typeof import('./DaltonBootScreenRive');
  return <DaltonBootScreenRive />;
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
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    letterSpacing: 2,
    color: DS.color.textMuted,
    textTransform: 'uppercase',
  },
});
