import { createElement, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DaltonBootRiveError } from './DaltonBootRivePlayer';
import { RIVE_EMBED_LOAD_TIMEOUT_MS } from '../constants/bootTiming';
import {
  BOOT_PAGE_BACKGROUND,
  BOOT_USE_RIVE,
  getDaltonBootRiveDisplayMode,
  getDaltonBootRiveEmbedUri,
} from '../constants/riveBoot';
import { captureBootRiveIssue } from '../monitoring/sentryBoot';

type Props = {
  style: StyleProp<ViewStyle>;
  onNativeError: (e: DaltonBootRiveError) => void;
  onEmbedError?: () => void;
  onBootVisualReady?: () => void;
};

/** Web: Rive Cloud embed via iframe (react-native-webview is native-only). */
export function DaltonBootRiveDisplay({
  style,
  onEmbedError,
  onBootVisualReady,
}: Props) {
  const embedReady = useRef(false);
  const uri = getDaltonBootRiveEmbedUri();
  const mode = getDaltonBootRiveDisplayMode();

  const markEmbedReady = useCallback(() => {
    if (embedReady.current) return;
    embedReady.current = true;
    onBootVisualReady?.();
  }, [onBootVisualReady]);

  useEffect(() => {
    if (!BOOT_USE_RIVE) return;
    embedReady.current = false;
    const timer = setTimeout(() => {
      if (embedReady.current) return;
      captureBootRiveIssue('rive_embed_load_timeout', { uri });
      onEmbedError?.();
    }, RIVE_EMBED_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [uri, onEmbedError]);

  if (!BOOT_USE_RIVE) return null;

  if (mode !== 'embed') {
    captureBootRiveIssue('rive_web_bundled_fallback', { mode });
  }

  const flat = StyleSheet.flatten(style) as ViewStyle;
  const w = flat.width ?? '100%';
  const h = flat.height ?? 280;

  return (
    <View style={[styles.outer, style, { backgroundColor: BOOT_PAGE_BACKGROUND }]}>
      {createElement('iframe', {
        src: uri,
        title: 'Dalton animation',
        allow: 'autoplay; fullscreen',
        loading: 'eager',
        style: {
          border: 0,
          width: typeof w === 'number' ? w : '100%',
          height: typeof h === 'number' ? h : '100%',
          backgroundColor: BOOT_PAGE_BACKGROUND,
          display: 'block',
        },
        onLoad: () => markEmbedReady(),
        onError: () => {
          captureBootRiveIssue('rive_embed_web_iframe_error', { uri });
          onEmbedError?.();
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
