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
 * When Dalton staff has set `profiles.dalton_verified` and the user has an active Premium
 * entitlement, mirror that into `auth.users.raw_user_meta_data` so the client session shows
 * "Dalton verified" without relying on insecure self-updates to `profiles`.
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

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (meta?.dalton_verified === true || meta?.daltonVerified === true) {
    return { updated: false };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('dalton_verified')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile?.dalton_verified) {
    return { updated: false };
  }

  const { error: updErr } = await supabase.auth.updateUser({
    data: { dalton_verified: true },
  });
  return { updated: !updErr };
}
