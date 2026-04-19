import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { StyleProp } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { DaltonBootRiveError } from './DaltonBootRivePlayer';
import { BOOT_USE_RIVE, getDaltonBootRiveDisplayMode } from '../constants/riveBoot';
import { DaltonBootRivePlayer } from './DaltonBootRivePlayer';

type Props = {
  style: StyleProp<ViewStyle>;
  onNativeError: (e: DaltonBootRiveError) => void;
  /** @deprecated Retained for call-site compatibility; WebView embed was removed. */
  onEmbedError?: () => void;
  /** Optional: e.g. first frame telemetry (native splash is dismissed from parent for snappier UX). */
  onBootVisualReady?: () => void;
};

/**
 * Native Rive only (bundled or hosted `.riv`). Expo Go → bounce path in parent (`bundled` + no module).
 */
export function DaltonBootRiveDisplay({ style, onNativeError, onBootVisualReady }: Props) {
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const mode = getDaltonBootRiveDisplayMode();

  if (!BOOT_USE_RIVE) return null;
  if (expoGo && mode === 'bundled') {
    return null;
  }

  return (
    <DaltonBootRivePlayer
      style={style}
      onError={onNativeError}
      onVisualReady={onBootVisualReady}
    />
  );
}
