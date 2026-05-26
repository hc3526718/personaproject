export type ProfileHighlight = {
  title: string;
  video_url: string;
};

export function parseProfileHighlights(value: unknown): ProfileHighlight[] {
  if (!Array.isArray(value)) return [];
  const out: ProfileHighlight[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const title = item.trim();
      if (title) out.push({ title, video_url: '' });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as { title?: unknown; video_url?: unknown; videoUrl?: unknown };
    const title = String(row.title ?? '').trim();
    const video_url = String(row.video_url ?? row.videoUrl ?? '').trim();
    if (title || video_url) out.push({ title: title || 'Highlight', video_url });
  }
  return out.slice(0, 12);
}

export function highlightsToJson(rows: ProfileHighlight[]): ProfileHighlight[] {
  return rows
    .map((r) => ({
      title: r.title.trim(),
      video_url: r.video_url.trim(),
    }))
    .filter((r) => r.title.length > 0)
    .slice(0, 12);
}

export function isPlayableVideoUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
