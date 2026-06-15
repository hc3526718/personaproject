import { useEffect, useState } from 'react';
import { Image as RNImage, type ImageStyle, type StyleProp } from 'react-native';
import { getExpoImageModule } from '../lib/expoImageSafe';

const BLUR_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F9DwADhgGAWjR9awAAAABJRU5ErkJggg==';

type ContentFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

type Props = {
  uri: string;
  fallbackUri?: string;
  style?: StyleProp<ImageStyle>;
  /** Lower numbers load sooner in lists (expo-image priority). */
  priority?: 'low' | 'normal' | 'high';
  contentFit?: ContentFit;
  onError?: (event: { error: string }) => void;
};

function contentFitToResizeMode(contentFit: ContentFit): 'cover' | 'contain' | 'stretch' | 'center' {
  switch (contentFit) {
    case 'contain':
      return 'contain';
    case 'fill':
      return 'stretch';
    case 'none':
    case 'scale-down':
      return 'center';
    default:
      return 'cover';
  }
}

/** Cached remote image with blur placeholder; falls back to RN Image when ExpoImage is not in the native build. */
export function RemoteImage({
  uri,
  fallbackUri,
  style,
  priority = 'normal',
  onError,
  contentFit = 'cover',
}: Props) {
  const primary = uri.trim();
  const fallback = fallbackUri?.trim() ?? '';
  const [activeUri, setActiveUri] = useState(primary || fallback);

  useEffect(() => {
    setActiveUri(primary || fallback);
  }, [fallback, primary]);

  if (!primary && !fallback) return null;

  const expoImage = getExpoImageModule();
  if (expoImage) {
    const { Image } = expoImage;
    return (
      <Image
        style={style}
        source={activeUri ? { uri: activeUri } : undefined}
        placeholder={BLUR_PLACEHOLDER}
        placeholderContentFit="cover"
        contentFit={contentFit}
        cachePolicy="memory-disk"
        recyclingKey={activeUri}
        priority={priority}
        transition={150}
        onError={(e) => {
          onError?.(e);
          if (fallback && activeUri !== fallback) {
            setActiveUri(fallback);
          }
        }}
      />
    );
  }

  return (
    <RNImage
      style={style}
      source={activeUri ? { uri: activeUri } : undefined}
      resizeMode={contentFitToResizeMode(contentFit)}
      onError={() => {
        onError?.({ error: 'load_failed' });
        if (fallback && activeUri !== fallback) {
          setActiveUri(fallback);
        }
      }}
    />
  );
}
