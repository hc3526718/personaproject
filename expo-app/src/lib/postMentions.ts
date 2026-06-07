import { searchMentionableUsers } from './mentionSearch';

const MENTION_TOKEN = /@([A-Za-z0-9_]{1,32})/g;

export type PostTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; username: string; raw: string; userId?: string }
  | { kind: 'hashtag'; tag: string; raw: string };

/** Strip controlled-mentions markup and legacy `{@}` tokens for storage. */
export function normalizePostBodyForStorage(text: string): string {
  return text
    .replace(/\{@\}\[([^\]]+)\]\s*\([^)]+\)/g, '@$1')
    .replace(/@\[([^\]]+)\]\s*\([^)]+\)/g, '@$1');
}

/** Normalize markup before rendering in the feed. */
export function normalizePostBodyForDisplay(text: string): string {
  return normalizePostBodyForStorage(text);
}

export function parsePostTextSegments(text: string): PostTextSegment[] {
  const source = text ?? '';
  const re =
    /(\{@\}\[([^\]]+)\]\s*\(([^)]+)\))|(@\[([^\]]+)\]\s*\(([^)]+)\))|(@[A-Za-z0-9_]{1,32})|(#[A-Za-z0-9_]{1,32})/g;
  const out: PostTextSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const start = m.index;
    if (start > last) {
      out.push({ kind: 'text', value: source.slice(last, start) });
    }
    const raw = m[0];
    if ((m[1] || m[4]) && (m[2] || m[5])) {
      const username = (m[2] || m[5]!).trim();
      const userIdRaw = (m[3] || m[6] || '').trim();
      out.push({
        kind: 'mention',
        username,
        userId: /^[0-9a-f-]{36}$/i.test(userIdRaw) ? userIdRaw : undefined,
        raw: `@${username}`,
      });
    } else if (m[7]) {
      out.push({ kind: 'mention', username: m[7].slice(1), raw: m[7] });
    } else if (m[8]) {
      out.push({ kind: 'hashtag', tag: m[8].slice(1), raw: m[8] });
    }
    last = start + raw.length;
  }
  if (last < source.length) {
    out.push({ kind: 'text', value: source.slice(last) });
  }
  return out.length ? out : [{ kind: 'text', value: source }];
}

export function extractMentionUsernames(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/(\{@\}\[([^\]]+)\]\s*\(([^)]+)\))|(@\[([^\]]+)\]\s*\(([^)]+)\))/g)) {
    const u = (m[2] || m[4])?.trim();
    if (u) names.add(u);
  }
  for (const m of text.matchAll(MENTION_TOKEN)) {
    const u = m[1]?.trim();
    if (u) names.add(u);
  }
  return [...names];
}

export async function resolveUsernameToUserId(username: string): Promise<string | null> {
  const q = username.trim();
  if (!q) return null;
  const rows = await searchMentionableUsers(q);
  const exact = rows.find((r) => r.name.toLowerCase() === q.toLowerCase());
  return exact?.id ?? null;
}

/** Returns first validation error for unknown @mentions, or null if all resolve. */
export async function validateMentionsInText(text: string): Promise<string | null> {
  for (const m of text.matchAll(/(\{@\}\[([^\]]+)\]\s*\(([^)]+)\))|(@\[([^\]]+)\]\s*\(([^)]+)\))/g)) {
    const id = (m[3] || m[6] || '').trim();
    const name = (m[2] || m[5] || 'user').trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return `Invalid mention for @${name}. Pick a name from suggestions.`;
    }
  }
  const names = extractMentionUsernames(text);
  for (const name of names) {
    const id = await resolveUsernameToUserId(name);
    if (!id) {
      return `No account found for @${name}. Pick a matching username from suggestions.`;
    }
  }
  return null;
}
