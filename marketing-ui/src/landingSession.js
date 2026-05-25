/** Reads Supabase auth persisted by the Expo web app (same localStorage key). */
const SUPABASE_PROJECT_REF = 'txehbzyntvqpkkegjrwp';
const STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

export function readLandingSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession ?? parsed?.session ?? parsed;
    const user = session?.user;
    if (!user?.id) return null;

    const meta = user.user_metadata ?? {};
    const avatarUrl =
      meta.avatar_url ?? meta.picture ?? meta.avatar ?? null;
    const label =
      meta.full_name ??
      meta.name ??
      user.email?.split('@')[0] ??
      'Your profile';

    return { userId: user.id, avatarUrl, label, email: user.email ?? null };
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.DaltonLandingSession = { read: readLandingSession };
}
