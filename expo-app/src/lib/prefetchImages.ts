import { Image } from 'expo-image';

/** Warm the image cache for upcoming list/feed thumbnails (best-effort). */
export async function prefetchImageUris(uris: string[], limit = 16): Promise<void> {
  const unique = [...new Set(uris.map((u) => u.trim()).filter(Boolean))].slice(0, limit);
  if (!unique.length) return;
  await Promise.allSettled(unique.map((uri) => Image.prefetch(uri, { cachePolicy: 'memory-disk' })));
}
