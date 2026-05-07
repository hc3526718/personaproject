import { useCallback, useEffect, useRef, type ElementType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { daltonRiveLayoutProps, getDaltonBootRiveAsset } from '../constants/riveBoot';

/** Same shape as `rive-react-native` `RNRiveError` — defined locally so we never import Rive at module scope (Expo Go). */
export type DaltonBootRiveError = { message: string; type: string };

type Props = {
  style: StyleProp<ViewStyle>;
  onError: (e: DaltonBootRiveError) => void;
  /** First `onPlay` — native splash can hide so the transition matches the running animation. */
  onVisualReady?: () => void;
};

/**
 * Lazy `require('rive-react-native')` so Expo Go never loads the Rive native module unless this mounts.
 */
export function DaltonBootRivePlayer({ style, onError, onVisualReady }: Props) {
  const played = useRef(false);
  const markReady = useCallback(() => {
    if (played.current) return;
    played.current = true;
    onVisualReady?.();
  }, [onVisualReady]);
  const handlePlay = useCallback(
    (_name: string, _sm: boolean) => {
      markReady();
    },
    [markReady],
  );

  useEffect(() => {
    if (!onVisualReady) return;
    const t = setTimeout(() => markReady(), 2200);
    return () => clearTimeout(t);
  }, [onVisualReady, markReady]);

  try {
    const mod = require('rive-react-native') as typeof import('rive-react-native');
    const Rive = mod.default as unknown as ElementType;
    const asset = getDaltonBootRiveAsset();
    const layout = daltonRiveLayoutProps();

    // #region agent log
    (async () => {
      let resolvedUri: string | undefined;
      let resolvedType: string | undefined;
      try {
        const expoAsset = require('expo-asset') as typeof import('expo-asset');
        if ('source' in asset) {
          const a = expoAsset.Asset.fromModule(asset.source);
          if (!a.localUri) {
            // Ensure downloads when needed (Android)
            await a.downloadAsync();
          }
          resolvedUri = a.localUri ?? a.uri;
          resolvedType = 'bundled-module';
        } else if ('url' in asset) {
          resolvedUri = asset.url;
          resolvedType = 'url';
        }
      } catch (e) {
        resolvedUri = undefined;
        resolvedType = `resolve_failed:${e instanceof Error ? e.name : 'unknown'}`;
      }
      fetch('http://127.0.0.1:7386/ingest/bab823b9-460d-4f52-948e-3e1cf5b36c4f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6e09fa' },
        body: JSON.stringify({
          sessionId: '6e09fa',
          runId: 'pre-fix',
          hypothesisId: 'H3',
          location: 'src/components/DaltonBootRivePlayer.tsx:DaltonBootRivePlayer',
          message: 'native player asset resolved',
          data: {
            assetKind: 'source' in asset ? 'source' : 'url',
            bundledModuleId: 'source' in asset ? asset.source : undefined,
            resolvedType,
            resolvedUri,
            layout,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    })();
    // #endregion

    return (
      <Rive
        {...asset}
        style={style}
        autoplay
        fit={mod.Fit.Contain}
        alignment={mod.Alignment.Center}
        {...layout}
        onError={onError}
        onPlay={handlePlay}
      />
    );
  } catch (e) {
    queueMicrotask(() =>
      onError({
        message: e instanceof Error ? e.message : 'rive-react-native require failed',
        type: 'MalformedFile',
      }),
    );
    return null;
  }
}
