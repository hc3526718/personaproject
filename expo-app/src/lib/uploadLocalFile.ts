import type { SupabaseClient } from '@supabase/supabase-js';
import { readLocalFileAsArrayBuffer } from './readLocalFileBytes';
import { coerceApiError } from './appAlert';

/** Upload a local file URI to Supabase Storage (RN-safe: uses ArrayBuffer, not Blob). */
export async function uploadLocalUriToStorage(
  supabase: SupabaseClient,
  bucket: string,
  storagePath: string,
  localUri: string,
  contentType: string,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  try {
    const body = await readLocalFileAsArrayBuffer(localUri);
    if (body.byteLength === 0) {
      return { ok: false, error: 'File is empty.' };
    }
    const { error } = await supabase.storage.from(bucket).upload(storagePath, body, {
      contentType,
      upsert: false,
    });
    if (error) {
      return { ok: false, error: coerceApiError('upload this file', error.message) };
    }
    const pub = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = pub.data.publicUrl?.trim() || '';
    if (!publicUrl) {
      return { ok: false, error: 'Upload succeeded but public URL was missing.' };
    }
    return { ok: true, publicUrl };
  } catch (e) {
    return { ok: false, error: coerceApiError('upload this file', e instanceof Error ? e.message : undefined) };
  }
}
