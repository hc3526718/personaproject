import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import type { ImageProps as ExpoImageProps } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

const BLUR_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F9DwADhgGAWjR9awAAAABJRU5ErkJggg==';

type Props = Omit<ExpoImageProps, 'source'> & {
  uri: string;
  fallbackUri?: string;
  style?: StyleProp<ImageStyle>;
  /** Lower numbers load sooner in lists (expo-image priority). */
  priority?: 'low' | 'normal' | 'high';
};

/** Cached remote image with blur placeholder and fallback when URL is missing or broken. */
export function RemoteImage({
  uri,
  fallbackUri,
  style,
  priority = 'normal',
  onError,
  contentFit = 'cover',
  ...rest
}: Props) {
  const primary = uri.trim();
  const fallback = fallbackUri?.trim() ?? '';
  const [activeUri, setActiveUri] = useState(primary || fallback);

  useEffect(() => {
    setActiveUri(primary || fallback);
  }, [fallback, primary]);

  if (!primary && !fallback) return null;

  return (
    <Image
      {...rest}
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
