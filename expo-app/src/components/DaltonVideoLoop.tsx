import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { DALTON_BOOT_VIDEO_BG, getDaltonBootVideoWebPath } from '../constants/daltonBootVideo';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Called once when the first frame is ready to show. */
  onReady?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
};

function useNativeVideoSource(): number | { uri: string } | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../constants/daltonBootVideo.native') as {
      DALTON_BOOT_VIDEO_NATIVE: number;
    };
    return mod.DALTON_BOOT_VIDEO_NATIVE;
  } catch {
    return null;
  }
}

/**
 * Looped Dalton brand video — replaces Rive boot / pull-refresh / welcome animations.
 * Web loads `/app/VideoP.mp4` statically (not Metro-bundled); native uses assets/VideoP.mp4.
 */
export function DaltonVideoLoop({
  style,
  onReady,
  onError,
  accessibilityLabel = 'Loading',
}: Props) {
  const readySent = useRef(false);
  const nativeSource = useNativeVideoSource();
  const webUri = Platform.OS === 'web' ? getDaltonBootVideoWebPath() : null;

  const fireReady = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    readySent.current = false;
  }, [webUri]);

  const onPlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if ('error' in status && status.error) onError?.();
        return;
      }
      if (status.isPlaying || status.positionMillis > 0) fireReady();
    },
    [fireReady, onError],
  );

  if (Platform.OS === 'web' && webUri) {
    return (
      <View
        style={[styles.outer, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
      >
        <video
          src={webUri}
          autoPlay
          loop
          muted
          playsInline
          style={styles.webVideo as object}
          onLoadedData={() => fireReady()}
          onCanPlay={() => fireReady()}
          onError={() => onError?.()}
        />
      </View>
    );
  }

  if (!nativeSource) {
    return (
      <View
        style={[styles.outer, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <View
      style={[styles.outer, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Video
        source={nativeSource}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay
        isMuted
        onPlaybackStatusUpdate={onPlaybackStatus}
        onError={() => onError?.()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
});
