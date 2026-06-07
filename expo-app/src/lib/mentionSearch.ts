import { getSupabase } from './supabase';

export type MentionCandidate = {
  id: string;
  name: string;
};

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Search profiles for @mention suggestions — username prefix match preferred. */
export async function searchMentionableUsers(keyword: string): Promise<MentionCandidate[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const q = keyword.trim();
  if (!q) return [];

  const pattern = `${escapeIlike(q)}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', pattern)
    .limit(20);

  if (error || !data) return [];

  const qLower = q.toLowerCase();
  return data
    .map((row) => {
      const username =
        typeof row.username === 'string' && row.username.trim() ? row.username.trim() : '';
      if (!username) return null;
      return { id: row.id as string, name: username };
    })
    .filter((r): r is MentionCandidate => r != null && r.name.toLowerCase().startsWith(qLower))
    .slice(0, 12);
}
