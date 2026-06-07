/**
 * Hashtag completion while typing:
 * - `#tag` + space → complete (listed in tray, stays visible in text)
 * - `#tag1#tag2` → tag1 completes when the second `#` is typed
 * - Trailing `#tag` at end → draft until post submit (`finalizePending`)
 *
 * End-of-string alone does NOT complete (avoids one chip per keystroke).
 */
const COMPLETE_AFTER_SPACE = /(?:^|\s)#([a-zA-Z0-9_]{1,32})(?=\s|#)/g;
const COMPLETE_BEFORE_HASH = /#([a-zA-Z0-9_]{1,32})(?=#)/g;

/** Draft hashtag still being typed at end of caption (not yet completed). */
const PENDING_HASHTAG = /#([a-zA-Z0-9_]{0,32})$/;

export type HashtagPeelResult = {
  body: string;
  addedTags: string[];
  pendingTag: string | null;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function collectCompletedHashtags(input: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  const add = (tag: string) => {
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  };
  for (const m of input.matchAll(COMPLETE_AFTER_SPACE)) add(m[1]!);
  for (const m of input.matchAll(COMPLETE_BEFORE_HASH)) add(m[1]!);
  return tags;
}

function stripCompletedHashtags(input: string): string {
  let body = input;
  body = body.replace(COMPLETE_AFTER_SPACE, (m) => (/^\s/.test(m) ? ' ' : ''));
  body = body.replace(COMPLETE_BEFORE_HASH, ' ');
  return body;
}

/** Hashtag tray list from caption text (does not modify visible text). */
export function syncHashtagsFromCaption(input: string, finalizePending = false): string[] {
  const tags = collectCompletedHashtags(input);
  if (!finalizePending) return tags;
  const pending = input.match(PENDING_HASHTAG);
  const t = pending?.[1]?.trim();
  if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) tags.push(t);
  return tags;
}

/** Incomplete hashtag still being typed at the end of the caption. */
export function getPendingHashtagFromCaption(input: string): string | null {
  const pending = input.match(PENDING_HASHTAG);
  const tag = pending?.[1]?.trim() ?? '';
  return tag.length > 0 ? tag : null;
}

/** Remove one hashtag token from visible caption text (tray × button). */
export function removeHashtagFromText(text: string, tag: string): string {
  const escaped = escapeRegExp(tag);
  return text
    .replace(new RegExp(`(?:^|\\s)#${escaped}(?=\\s|#|$)`, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip completed hashtags from body (storage / feed formatting only).
 * Use `syncHashtagsFromCaption` while editing — keep hashtags inline in the text box.
 */
export function peelHashtagsFromCaption(input: string, finalizePending = false): HashtagPeelResult {
  const addedTags = syncHashtagsFromCaption(input, finalizePending);
  let body = stripCompletedHashtags(input);

  let pendingTag: string | null = null;
  const pending = body.match(PENDING_HASHTAG);
  if (pending) {
    const tag = pending[1] ?? '';
    if (finalizePending && tag.length > 0) {
      body = body.slice(0, pending.index ?? body.length);
    } else if (tag.length > 0) {
      pendingTag = tag;
      body = body.slice(0, pending.index ?? body.length);
    } else {
      body = body.slice(0, pending.index ?? body.length);
    }
  }

  body = body.replace(/\s+/g, ' ').trim();
  return { body, addedTags, pendingTag };
}

/** Plain caption for validation — avoids duplicating inline `#tags` on the tag line. */
export function buildCaptionPlainText(body: string, hashtags: string[]): string {
  const trimmed = body.trim();
  if (!hashtags.length) return trimmed;
  const missingFromBody = hashtags.filter(
    (t) => !new RegExp(`#${escapeRegExp(t)}(?=\\s|#|$)`, 'i').test(trimmed),
  );
  const tagLine = missingFromBody.map((t) => `#${t}`).join(' ');
  return [trimmed, tagLine].filter(Boolean).join('\n\n');
}

/** Normalize caption for post save (body without inline tags + tag line). */
export function buildCaptionForStorage(body: string): string {
  const hashtags = syncHashtagsFromCaption(body, true);
  const { body: stripped } = peelHashtagsFromCaption(body, true);
  return buildCaptionPlainText(stripped, hashtags);
}

export function removeHashtag(hashtags: string[], tag: string): string[] {
  return hashtags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
}

/** Merge stored caption body + tag line into one string for the composer text box. */
export function formatStoredCaptionForComposer(storedBody: string): { body: string; hashtags: string[] } {
  const parsed = parseStoredPostCaption(storedBody);
  if (!parsed.hashtags.length) return { body: parsed.body, hashtags: [] };
  const tagInline = parsed.hashtags.map((t) => `#${t}`).join(' ');
  const body = [parsed.body.trim(), tagInline].filter(Boolean).join(' ');
  return { body, hashtags: parsed.hashtags };
}

/** Split stored post body into composer fields (body + hashtag tray). */
export function parseStoredPostCaption(stored: string): { body: string; hashtags: string[] } {
  const trimmed = stored.trim();
  if (!trimmed) return { body: '', hashtags: [] };

  const parts = trimmed.split(/\n\n+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? '';
    const tagTokens = [...last.matchAll(/#([a-zA-Z0-9_]{1,32})/g)].map((m) => m[1]!);
    if (tagTokens.length > 0 && parts.slice(0, -1).join('\n\n').trim()) {
      return { body: parts.slice(0, -1).join('\n\n').trim(), hashtags: tagTokens };
    }
  }

  const inlineTags = collectCompletedHashtags(trimmed);
  return { body: trimmed, hashtags: inlineTags };
}
