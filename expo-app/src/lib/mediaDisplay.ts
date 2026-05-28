import type { MediaAssetRow } from '../roadmap/types';

/** Human-friendly title from DB title, storage path, or kind. */
export function formatMediaDisplayTitle(
  asset: Pick<MediaAssetRow, 'title' | 'storage_path' | 'kind'> | null | undefined,
  fallback = 'Media',
): string {
  const raw = (asset?.title?.trim() || asset?.storage_path?.split('/').pop() || '').trim();
  if (!raw) return fallback;
  if (raw.match(/\.(mp4|mov|m4v|webm)$/i) || raw.match(/^\d{10,}-/)) {
    const base = raw.replace(/\.(mp4|mov|m4v|webm)$/i, '');
    const human = base
      .replace(/^\d{10,}-/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (human.length >= 3) {
      return human.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return raw;
}

export function mediaThumbnailUri(
  asset: Pick<MediaAssetRow, 'thumbnail_url' | 'public_url' | 'kind'>,
): string | null {
  const thumb = asset.thumbnail_url?.trim();
  if (thumb) return thumb;
  const pub = asset.public_url?.trim() || '';
  if (pub && !pub.match(/\.(mp4|mov|m4v|webm)(\?|$)/i)) return pub;
  return null;
}

export function isVideoMediaAsset(asset: Pick<MediaAssetRow, 'kind' | 'public_url'>): boolean {
  if (asset.kind === 'video') return true;
  const pub = asset.public_url?.trim() || '';
  return !!pub.match(/\.(mp4|mov|m4v|webm)(\?|$)/i);
}
