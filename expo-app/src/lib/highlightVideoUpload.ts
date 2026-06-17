import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { getSupabase } from './supabase';
import { readLocalFileAsArrayBuffer } from './readLocalFileBytes';
import { coerceApiError } from './appAlert';

/** Supabase `media_assets` bucket — client-side size gate removed; server may still enforce limits. */
export const HIGHLIGHT_VIDEO_MAX_BYTES = Number.MAX_SAFE_INTEGER;

export type HighlightUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

function inferVideoExt(uri: string, fileName?: string): { ext: string; contentType: string } {
  const fromName = fileName?.match(/\.([a-z0-9]+)$/i)?.[1];
  const ext = (fromName ?? uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1] ?? 'mp4').toLowerCase();
  if (ext === 'mov') return { ext: 'mov', contentType: 'video/quicktime' };
  if (ext === 'webm') return { ext: 'webm', contentType: 'video/webm' };
  if (ext === 'm4v') return { ext: 'm4v', contentType: 'video/x-m4v' };
  return { ext: 'mp4', contentType: 'video/mp4' };
}

function formatPhotoLibraryError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/PHPhotosErrorDomain|3164|asset.*not available|cloud/i.test(msg)) {
    return (
      'This video could not be read from Photos. Try “Browse files” instead or download it to Files first.'
    );
  }
  if (/empty|ENOENT|not found/i.test(msg)) {
    return 'The selected file is empty or unavailable. Pick another video or use Browse files.';
  }
  return coerceApiError('upload your highlight video', msg || undefined);
}

async function measureLocalFileBytes(uri: string): Promise<number> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    return buf.byteLength;
  }
  try {
    const file = new File(uri);
    const buf = await file.arrayBuffer();
    return buf.byteLength;
  } catch {
    const buf = await readLocalFileAsArrayBuffer(uri);
    return buf.byteLength;
  }
}

/** Upload highlight clip to storage; returns public HTTPS URL. */
export async function uploadHighlightVideo(
  userId: string,
  uri: string,
  fileName?: string,
): Promise<HighlightUploadResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: 'Not connected to the server.' };
  }
  try {
    const byteLength = await measureLocalFileBytes(uri);
    if (byteLength === 0) {
      return { ok: false, error: 'The selected video file is empty.' };
    }

    const { ext, contentType } = inferVideoExt(uri, fileName);
    const body = await readLocalFileAsArrayBuffer(uri);
    if (body.byteLength === 0) {
      return { ok: false, error: 'Could not read video data from your device.' };
    }
    const storage_path = `profiles/${userId}/highlights/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('media_assets')
      .upload(storage_path, body, { contentType, upsert: false });
    if (error) {
      return { ok: false, error: coerceApiError('upload your highlight video', error.message) };
    }
    const url = supabase.storage.from('media_assets').getPublicUrl(storage_path).data.publicUrl;
    if (!url) {
      return { ok: false, error: 'Upload succeeded but public URL was missing.' };
    }
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: formatPhotoLibraryError(err) };
  }
}
