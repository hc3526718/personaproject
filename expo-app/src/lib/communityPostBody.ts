import type { ProfileRow } from '../roadmap/types';

/** Parses trailing `#event:{uuid}` tag appended by the post composer. */
export function parsePostBody(body: string | null): { displayBody: string; eventId: string | null } {
  const raw = body ?? '';
  const re = /\n\n#event:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\s*$/i;
  const m = raw.match(re);
  if (!m?.[1]) return { displayBody: raw, eventId: null };
  const displayBody = raw.slice(0, m.index).trimEnd();
  return { displayBody, eventId: m[1] };
}

/** Prefer real name parts, then display_name; avoid showing email-local as the primary label when we have better data. */
export function formatAuthorDisplayName(
  p: Pick<ProfileRow, 'display_name' | 'first_name' | 'last_name' | 'username'> | null | undefined,
): string {
  const u = (p as any)?.username;
  if (typeof u === 'string' && u.trim()) return `@${u.trim()}`;
  const first = p?.first_name?.trim();
  const last = p?.last_name?.trim();
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  const dn = p?.display_name?.trim();
  if (dn) {
    if (dn.includes('@')) return dn.split('@')[0]?.trim() || 'Member';
    return dn;
  }
  return 'Member';
}
