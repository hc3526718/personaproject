import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { EventRow, MediaAssetRow, PostRow } from './types';

type Unsub = () => void;

function noopChannel(): Unsub {
  return () => undefined;
}

/** Subscribe to `public.posts` inserts/updates (add RLS + replica identity on Supabase before production). */
export function subscribeCommunityPosts(onPayload: (row: PostRow) => void): Unsub {
  const supabase = getSupabase();
  if (!supabase) return noopChannel();
  const channel: RealtimeChannel = supabase
    .channel('roadmap-posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (p) => {
        if (p.new && typeof p.new === 'object') onPayload(p.new as PostRow);
      },
    )
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

export function subscribeEventsFeed(onPayload: (row: EventRow) => void): Unsub {
  const supabase = getSupabase();
  if (!supabase) return noopChannel();
  const channel = supabase
    .channel('roadmap-events')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      (p) => {
        if (p.new && typeof p.new === 'object') onPayload(p.new as EventRow);
      },
    )
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

export function subscribeMediaAssetsForOwner(ownerId: string, onPayload: (row: MediaAssetRow) => void): Unsub {
  const supabase = getSupabase();
  if (!supabase) return noopChannel();
  const channel = supabase
    .channel(`roadmap-media-${ownerId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'media_assets', filter: `owner_id=eq.${ownerId}` },
      (p) => {
        if (p.new && typeof p.new === 'object') onPayload(p.new as MediaAssetRow);
      },
    )
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

export async function listRecentPosts(limit = 30): Promise<PostRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as PostRow[];
}

export async function listUpcomingEvents(limit = 30): Promise<EventRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as EventRow[];
}
