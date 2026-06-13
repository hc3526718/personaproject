import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'media_assets';

/** Recursively remove all objects under a storage prefix (service role). */
async function removeStoragePrefix(
  admin: SupabaseClient,
  prefix: string,
): Promise<void> {
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error || !data?.length) return;

  const filePaths: string[] = [];
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      await removeStoragePrefix(admin, path);
    } else {
      filePaths.push(path);
    }
  }
  if (filePaths.length) {
    const { error: delErr } = await admin.storage.from(BUCKET).remove(filePaths);
    if (delErr) {
      console.error('[purgeUserStorage] remove_failed', prefix, delErr.message);
    }
  }
}

/**
 * Best-effort purge of user-owned storage paths before auth deletion.
 * DB rows (posts, media_assets) cascade when auth.users is deleted; objects here may linger without this step.
 */
export async function purgeUserStorage(admin: SupabaseClient, userId: string): Promise<void> {
  const prefixes = [
    `profiles/${userId}`,
    `posts/${userId}`,
    `events/${userId}`,
    `proposals/${userId}`,
  ];

  for (const prefix of prefixes) {
    try {
      await removeStoragePrefix(admin, prefix);
    } catch (e) {
      console.error('[purgeUserStorage] prefix_error', prefix, e);
    }
  }

  const { data: convs } = await admin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);
  for (const row of convs ?? []) {
    const convId = row.conversation_id as string;
    if (!convId) continue;
    try {
      await removeStoragePrefix(admin, `messages/${convId}/${userId}`);
    } catch (e) {
      console.error('[purgeUserStorage] messages_prefix_error', convId, e);
    }
  }
}
