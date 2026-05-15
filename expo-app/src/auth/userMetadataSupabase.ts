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
 * When a user has an active Premium entitlement, mirror that into `auth.users.raw_user_meta_data`
 * so the client session shows "Dalton verified" (used as a gate for creator tools in this build).
 *
 * If `subscription_state` has a row with `is_pro = false`, metadata is not updated (avoids spoofing
 * when the server mirror disagrees). When no row exists yet (webhook not wired), caller `isPro`
 * still drives the sync as before.
 *
 * Note: enforce premium on sensitive paths server-side (RevenueCat webhook → `subscription_state`, RLS).
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
