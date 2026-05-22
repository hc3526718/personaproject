import { getSupabase } from './supabase';

function inferImageExt(uri: string): string {
  const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = m?.[1]?.toLowerCase();
  if (ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) return ext;
  return 'jpg';
}

function inferImageContentType(uri: string): string {
  const ext = inferImageExt(uri);
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/** Upload profile avatar or banner to `media_assets` and return public URL. */
export async function uploadProfileImage(
  userId: string,
  uri: string,
  kind: 'avatar' | 'banner',
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const blob = await (await fetch(uri)).blob();
    const ext = inferImageExt(uri);
    const contentType = inferImageContentType(uri);
    const rand = Math.random().toString(36).slice(2, 8);
    const storage_path = `profiles/${userId}/${kind}-${Date.now()}-${rand}.${ext}`;
    const { error } = await supabase.storage
      .from('media_assets')
      .upload(storage_path, blob, { contentType, upsert: false });
    if (error) return null;
    const pub = supabase.storage.from('media_assets').getPublicUrl(storage_path);
    return pub.data.publicUrl ?? null;
  } catch {
    return null;
  }
}
