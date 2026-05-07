import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { EventRow, MediaAssetRow, PostRow } from './types';

type Unsub = () => void;

function noopChannel(): Unsub {
  return () => undefined;
}

/** Post row plus author fields for community feed UI. */
export type CommunityPostFeedRow = PostRow & {
  author_display_name: string | null;
  author_avatar_url: string | null;
  /** Post media (resolved from `media_assets.post_id`) */
  attachments?: { kind: 'image' | 'video' | 'file'; uri: string; name?: string }[];
};

async function attachMediaForPosts(rows: CommunityPostFeedRow[]): Promise<CommunityPostFeedRow[]> {
  const supabase = getSupabase();
  if (!supabase) return rows;
  const postIds = [...new Set(rows.map((r) => r.id))];
  if (postIds.length === 0) return rows;
  const { data } = await supabase
    .from('media_assets')
    .select('kind, public_url, post_id, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });
  const assets = (data ?? []) as { kind: MediaAssetRow['kind']; public_url: string | null; post_id: string | null }[];
  const map = new Map<string, { kind: 'image' | 'video' | 'file'; uri: string }[]>();
  for (const a of assets) {
    if (!a.post_id) continue;
    const uri = a.public_url?.trim() || '';
    if (!uri) continue;
    const kind = a.kind === 'video' ? 'video' : a.kind === 'file' ? 'file' : 'image';
    const prev = map.get(a.post_id) ?? [];
    prev.push({ kind, uri });
    map.set(a.post_id, prev);
  }
  return rows.map((r) => ({ ...r, attachments: map.get(r.id) ?? [] }));
}

export type CommunityPostChange =
  | { event: 'INSERT' | 'UPDATE'; row: PostRow }
  | { event: 'DELETE'; id: string };

/** Subscribe to `public.posts` changes. Enable Realtime for `posts` in Supabase → Database → Replication. */
export function subscribeCommunityPosts(onPayload: (change: CommunityPostChange) => void): Unsub {
  const supabase = getSupabase();
  if (!supabase) return noopChannel();
  const channel: RealtimeChannel = supabase
    .channel('roadmap-posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (p) => {
        const ev = p.eventType;
        if (ev === 'DELETE') {
          const old = p.old;
          const id = old && typeof old === 'object' && 'id' in old ? String((old as { id: string }).id) : '';
          if (id) onPayload({ event: 'DELETE', id });
          return;
        }
        if ((ev === 'INSERT' || ev === 'UPDATE') && p.new && typeof p.new === 'object') {
          onPayload({ event: ev, row: p.new as PostRow });
        }
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

export async function enrichPostWithAuthor(row: PostRow): Promise<CommunityPostFeedRow> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ...row, author_display_name: null, author_avatar_url: null, attachments: [] };
  }
  const { data } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', row.author_id)
    .maybeSingle();
  const withAuthor: CommunityPostFeedRow = {
    ...row,
    author_display_name: data?.display_name ?? null,
    author_avatar_url: data?.avatar_url ?? null,
  };
  const [withMedia] = await attachMediaForPosts([withAuthor]);
  return withMedia ?? { ...withAuthor, attachments: [] };
}

export async function listRecentCommunityPosts(limit = 30): Promise<CommunityPostFeedRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !posts?.length) return [];
  const rows = posts as PostRow[];
  const authorIds = [...new Set(rows.map((p) => p.author_id))];
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', authorIds);
  const map = new Map(
    (profs ?? []).map((r: { id: string; display_name: string | null; avatar_url: string | null }) => [
      r.id,
      { display_name: r.display_name, avatar_url: r.avatar_url },
    ]),
  );
  const withAuthors = rows.map((p) => {
    const pr = map.get(p.author_id);
    return {
      ...p,
      author_display_name: pr?.display_name ?? null,
      author_avatar_url: pr?.avatar_url ?? null,
    };
  });
  return await attachMediaForPosts(withAuthors);
}

export async function insertCommunityPost(authorId: string, body: string): Promise<PostRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: authorId, body: trimmed })
    .select('*')
    .single();
  if (error || !data) return null;
  return data as PostRow;
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

/** All events for browse / filters (newest first — client can re-sort). */
export async function listAllEvents(limit = 80): Promise<EventRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as EventRow[];
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as EventRow;
}

export type BookingWithEvent = {
  bookingId: string;
  reference: string;
  userId: string;
  eventId: string;
  checkedInAt: string | null;
  event: EventRow | null;
};

export async function listBookingsWithEventsForUser(userId: string): Promise<BookingWithEvent[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: bk, error } = await supabase
    .from('bookings')
    .select('id, reference, user_id, event_id, checked_in_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !bk?.length) return [];

  const eventIds = [...new Set((bk as { event_id: string }[]).map((b) => b.event_id))];
  const { data: events } = await supabase.from('events').select('*').in('id', eventIds);
  const evMap = new Map((events as EventRow[] | null)?.map((e) => [e.id, e]) ?? []);

  return (bk as { id: string; reference: string; user_id: string; event_id: string; checked_in_at: string | null }[]).map(
    (r) => ({
      bookingId: r.id,
      reference: r.reference,
      userId: r.user_id,
      eventId: r.event_id,
      checkedInAt: r.checked_in_at,
      event: evMap.get(r.event_id) ?? null,
    }),
  );
}

export async function hostCheckInByReference(reference: string): Promise<{
  ok: boolean;
  reason?: string;
  alreadyCheckedIn?: boolean;
  eventTitle?: string;
  eventId?: string;
  attendeeUserId?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'no_client' };
  const { data, error } = await supabase.rpc('host_check_in_booking', {
    p_reference: reference.trim(),
  });
  if (error) return { ok: false, reason: error.message };
  const j = data as Record<string, unknown> | null;
  if (!j || j.ok !== true) {
    return { ok: false, reason: String(j?.reason ?? 'rpc_failed') };
  }
  return {
    ok: true,
    alreadyCheckedIn: j.already_checked_in === true,
    eventTitle: typeof j.title === 'string' ? j.title : undefined,
    eventId: typeof j.event_id === 'string' ? j.event_id : undefined,
    attendeeUserId: typeof j.user_id === 'string' ? j.user_id : undefined,
  };
}

function parseScheduleLineToParts(scheduleLine: string): { datePart: string; timeStart: string } {
  const sep = ' • ';
  const i = scheduleLine.indexOf(sep);
  const datePart = (i === -1 ? scheduleLine : scheduleLine.slice(0, i)).trim() || new Date().toDateString();
  const rest = i === -1 ? '10:00 AM' : scheduleLine.slice(i + sep.length).trim();
  const timeStart = rest.split('-')[0]?.trim() || '10:00 AM';
  return { datePart, timeStart };
}

function parseEventStartsAtIso(scheduleLine: string): string {
  const { datePart, timeStart } = parseScheduleLineToParts(scheduleLine);
  const d = new Date(`${datePart} ${timeStart}`);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  return fallback.toISOString();
}

function newBookingReference(): string {
  const p1 = Math.random().toString(36).slice(2, 8).toUpperCase();
  const p2 = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DG-${p1}-${p2}`;
}

/**
 * Creates an `events` row from the attendee UI flow plus a `bookings` row.
 * Host-authored events can supersede this later (pass `event_id` only).
 */
export async function createEventAndBooking(
  userId: string,
  opts: {
    title: string;
    scheduleLine: string;
    heroImageUrl?: string | null;
    venue?: string | null;
  },
): Promise<{ reference: string; eventId: string; bookingId: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const starts_at = parseEventStartsAtIso(opts.scheduleLine);
  const { data: ev, error: evErr } = await supabase
    .from('events')
    .insert({
      created_by: userId,
      title: opts.title.trim().slice(0, 500) || 'Event',
      starts_at,
      venue: (opts.venue?.trim() || 'TBA').slice(0, 500),
      hero_image_url: opts.heroImageUrl?.trim() || null,
    })
    .select('id')
    .single();
  if (evErr || !ev?.id) return null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const reference = newBookingReference();
    const { data: bk, error: bkErr } = await supabase
      .from('bookings')
      .insert({
        event_id: ev.id,
        user_id: userId,
        reference,
      })
      .select('id, reference')
      .single();
    if (!bkErr && bk?.id && bk.reference) {
      return { reference: bk.reference, eventId: ev.id, bookingId: bk.id };
    }
    const msg = bkErr?.message ?? '';
    if (!msg.toLowerCase().includes('unique') && !msg.toLowerCase().includes('duplicate')) break;
  }
  return null;
}
