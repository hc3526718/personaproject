export function oauthNameHints(meta: Record<string, unknown> | undefined): { first: string; last: string } {
  const full = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  const given = typeof meta?.given_name === 'string' ? meta.given_name.trim() : '';
  const family = typeof meta?.family_name === 'string' ? meta.family_name.trim() : '';
  if (given || family) return { first: given, last: family };
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
  }
  return { first: full, last: '' };
}

export function resolveOAuthProfileNames(
  hints: { first: string; last: string },
  email: string | null,
): { firstName: string; lastName: string; displayName: string } {
  let fn = hints.first.trim();
  let ln = hints.last.trim();
  if (!fn && !ln) {
    const local = (email ?? '').split('@')[0]?.replace(/[._+]/g, ' ').trim() ?? '';
    const parts = local.split(/\s+/).filter(Boolean);
    fn = parts[0] ?? 'Member';
    ln = parts.slice(1).join(' ');
  } else if (!fn && ln) {
    fn = ln.split(/\s+/)[0] ?? 'Member';
  }
  const displayName = [fn, ln].filter(Boolean).join(' ') || fn;
  return { firstName: fn, lastName: ln, displayName };
}
