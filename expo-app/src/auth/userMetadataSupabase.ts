import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures new and legacy users have an explicit `dalton_verified` key in auth user_metadata
 * (defaults to false). Server-side, prefer `backend/auth_default_dalton_verified.sql` on auth.users.
 */
export async function ensureDefaultDaltonVerifiedMetadata(supabase: SupabaseClient): Promise<void> {
  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) return;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    if (meta && Object.prototype.hasOwnProperty.call(meta, 'dalton_verified')) {
      return;
    }
    await supabase.auth.updateUser({
      data: { dalton_verified: false },
    });
  } catch {
    /* Session stays valid; metadata default is optional. */
  }
}

/**
 * When a user has active Premium (`is_pro`), mirror Dalton verified into auth metadata for the session.
 * Server trigger `subscription_state_sync_dalton_verified` also sets `profiles.dalton_verified`.
 *
 * One-way rule: every premium user becomes verified; verified users are not auto-premium.
 * Subscription expiry sets `is_pro = false` but does not clear `dalton_verified`.
 */
export async function syncDaltonVerifiedFromProfileIfPremium(
  supabase: SupabaseClient,
  isPro: boolean,
): Promise<{ updated: boolean }> {
  if (!isPro) return { updated: false };

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) return { updated: false };

  const { data: subRow, error: subErr } = await supabase
    .from('subscription_state')
    .select('is_pro')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subErr && subRow && subRow.is_pro === false) {
    return { updated: false };
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (meta?.dalton_verified === true || meta?.daltonVerified === true) {
    return { updated: false };
  }

  const { error: updErr } = await supabase.auth.updateUser({
    data: { dalton_verified: true },
  });
  return { updated: !updErr };
}
