import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Asset } from 'expo-asset';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { DALTON_BOOT_VIDEO, DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Called once when the first frame is ready to show. */
  onReady?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
};

/**
 * Looped Dalton brand video — replaces Rive boot / pull-refresh / welcome animations.
 */
export function DaltonVideoLoop({
  style,
  onReady,
  onError,
  accessibilityLabel = 'Loading',
}: Props) {
  const readySent = useRef(false);
  const [webUri, setWebUri] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    void (async () => {
      try {
        const asset = Asset.fromModule(DALTON_BOOT_VIDEO);
        if (!asset.localUri) await asset.downloadAsync();
        if (!cancelled) setWebUri(asset.localUri ?? asset.uri);
      } catch {
        if (!cancelled) onError?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const fireReady = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    readySent.current = false;
  }, []);

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

  if (Platform.OS === 'web') {
    if (!webUri) {
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

  return (
    <View
      style={[styles.outer, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Video
        source={DALTON_BOOT_VIDEO}
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
