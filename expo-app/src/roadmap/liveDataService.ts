import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  getScreenshotEventById,
  getScreenshotOfferPageById,
  getScreenshotSampleCommunityPosts,
  getScreenshotSampleEvents,
  getScreenshotSampleMediaAssets,
  getScreenshotSampleOfferPages,
  mergeScreenshotCommunityPosts,
  mergeScreenshotEvents,
  mergeScreenshotMedia,
  mergeScreenshotSubscriptionPages,
  isScreenshotSampleEventId,
  isScreenshotSampleMediaId,
  isScreenshotSampleOfferPageId,
} from '../data/appStoreScreenshotSamples';
import { formatAuthorDisplayName } from '../lib/communityPostBody';
import { isAppStoreScreenshotMode } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import type {
  EventRow,
  MediaAssetRow,
  PostRow,
  ProfileRow,
  SubscriptionOfferPageRow,
} from './types';

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
    .select('display_name, first_name, last_name, username, avatar_url')
    .eq('id', row.author_id)
    .maybeSingle();
  const withAuthor: CommunityPostFeedRow = {
    ...row,
    author_display_name: data
      ? formatAuthorDisplayName({
          display_name: data.display_name,
          first_name: data.first_name,
          last_name: data.last_name,
              username: (data as any).username,
        })
      : null,
    author_avatar_url: data?.avatar_url ?? null,
  };
  const [withMedia] = await attachMediaForPosts([withAuthor]);
  return withMedia ?? { ...withAuthor, attachments: [] };
}

export async function listRecentCommunityPosts(limit = 30): Promise<CommunityPostFeedRow[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return isAppStoreScreenshotMode()
      ? (getScreenshotSampleCommunityPosts() as CommunityPostFeedRow[]).slice(0, limit)
      : [];
  }
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  if (!posts?.length) {
    if (isAppStoreScreenshotMode()) {
      return (getScreenshotSampleCommunityPosts() as CommunityPostFeedRow[]).slice(0, limit);
    }
    return [];
  }
  const rows = posts as PostRow[];
  const authorIds = [...new Set(rows.map((p) => p.author_id))];
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, display_name, first_name, last_name, username, avatar_url')
    .in('id', authorIds);
  type Prof = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    username?: string | null;
    avatar_url: string | null;
  };
  const map = new Map(
    (profs ?? []).map((r: Prof) => [
      r.id,
      {
        display_name: formatAuthorDisplayName({
          display_name: r.display_name,
          first_name: r.first_name,
          last_name: r.last_name,
          username: (r as any).username,
        }),
        avatar_url: r.avatar_url,
      },
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
  const withMedia = await attachMediaForPosts(withAuthors);
  if (!isAppStoreScreenshotMode()) return withMedia;
  return (mergeScreenshotCommunityPosts(withMedia) as CommunityPostFeedRow[]).slice(0, limit);
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

/** Deletes a post (RLS: author or master — see migrations 003 + 008). */
export async function deleteCommunityPost(postId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  // PostgREST often returns `{ error: null }` when RLS denies delete (0 rows);
  // only treat delete as successful when we get a returning row back.
  const { data, error } = await supabase.from('posts').delete().eq('id', postId).select('id');
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Full-text-ish search on post body (live Supabase). */
export async function searchCommunityPosts(query: string, limit = 40): Promise<CommunityPostFeedRow[]> {
  const supabase = getSupabase();
  const q = query.trim();
  if (!q) return [];
  if (!supabase) {
    if (!isAppStoreScreenshotMode()) return [];
    const samples = getScreenshotSampleCommunityPosts() as CommunityPostFeedRow[];
    const qLower = q.toLowerCase();
    return samples.filter((row) => (row.body ?? '').toLowerCase().includes(qLower)).slice(0, limit);
  }
  const pattern = `%${escapeIlike(q)}%`;
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .ilike('body', pattern)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  const qLower = q.toLowerCase();
  if (!posts?.length) {
    if (!isAppStoreScreenshotMode()) return [];
    const samples = getScreenshotSampleCommunityPosts() as CommunityPostFeedRow[];
    return samples.filter((row) => (row.body ?? '').toLowerCase().includes(qLower)).slice(0, limit);
  }
  const rows = posts as PostRow[];
  const authorIds = [...new Set(rows.map((p) => p.author_id))];
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, display_name, first_name, last_name, username, avatar_url')
    .in('id', authorIds);
  type Prof = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    username?: string | null;
    avatar_url: string | null;
  };
  const map = new Map(
    (profs ?? []).map((r: Prof) => [
      r.id,
      {
        display_name: formatAuthorDisplayName({
          display_name: r.display_name,
          first_name: r.first_name,
          last_name: r.last_name,
          username: (r as Prof).username,
        }),
        avatar_url: r.avatar_url,
      },
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
  const withMedia = await attachMediaForPosts(withAuthors);
  if (!isAppStoreScreenshotMode()) return withMedia;
  const merged = mergeScreenshotCommunityPosts(withMedia) as CommunityPostFeedRow[];
  return merged.filter((row) => (row.body ?? '').toLowerCase().includes(qLower)).slice(0, limit);
}

export async function getEventsByIds(ids: string[]): Promise<Map<string, Pick<EventRow, 'id' | 'title'>>> {
  const out = new Map<string, Pick<EventRow, 'id' | 'title'>>();
  if (isAppStoreScreenshotMode()) {
    for (const id of ids) {
      const ev = getScreenshotEventById(id);
      if (ev) out.set(id, { id: ev.id, title: ev.title });
    }
  }
  const supabase = getSupabase();
  if (!supabase || ids.length === 0) return out;
  const unique = [...new Set(ids)];
  const { data, error } = await supabase.from('events').select('id, title').in('id', unique);
  if (error || !data) return out;
  for (const row of data as { id: string; title: string }[]) {
    out.set(row.id, { id: row.id, title: row.title });
  }
  return out;
}

export async function listUpcomingEvents(limit = 30): Promise<EventRow[]> {
  const sortAsc = (rows: EventRow[]) =>
    [...rows].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const supabase = getSupabase();
  if (!supabase) {
    return isAppStoreScreenshotMode() ? sortAsc(getScreenshotSampleEvents()).slice(0, limit) : [];
  }
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })
    .limit(limit);
  if (error) return isAppStoreScreenshotMode() ? sortAsc(getScreenshotSampleEvents()).slice(0, limit) : [];
  const rows = (data ?? []) as EventRow[];
  const merged = isAppStoreScreenshotMode() ? mergeScreenshotEvents(rows) : rows;
  return sortAsc(merged).slice(0, limit);
}

/** All events for browse / filters (newest first — client can re-sort). */
export async function listAllEvents(limit = 80): Promise<EventRow[]> {
  const sortDesc = (rows: EventRow[]) =>
    [...rows].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  const supabase = getSupabase();
  if (!supabase) {
    return isAppStoreScreenshotMode() ? sortDesc(getScreenshotSampleEvents()).slice(0, limit) : [];
  }
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(limit);
  if (error) return isAppStoreScreenshotMode() ? sortDesc(getScreenshotSampleEvents()).slice(0, limit) : [];
  const rows = (data ?? []) as EventRow[];
  const merged = isAppStoreScreenshotMode() ? mergeScreenshotEvents(rows) : rows;
  return sortDesc(merged).slice(0, limit);
}

export async function getEventById(id: string): Promise<EventRow | null> {
  if (isAppStoreScreenshotMode()) {
    const sample = getScreenshotEventById(id);
    if (sample) return sample;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as EventRow;
}

export type InsertCommunityEventInput = {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  venue?: string | null;
  hero_image_url?: string | null;
  requires_payment: boolean;
  stripe_price_id?: string | null;
  created_by: string;
};

/** Host publish — requires `events_insert_authenticated` (and Dalton verification in app). */
export async function insertCommunityEvent(row: InsertCommunityEventInput): Promise<EventRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: row.title.trim(),
      description: row.description.trim() || null,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      venue: row.venue?.trim() || null,
      hero_image_url: row.hero_image_url?.trim() || null,
      requires_payment: row.requires_payment,
      stripe_price_id: row.stripe_price_id?.trim() || null,
      created_by: row.created_by,
    })
    .select()
    .single();
  if (error || !data) return null;
  return data as EventRow;
}

export async function deleteCommunityEvent(eventId: string): Promise<boolean> {
  if (isAppStoreScreenshotMode() && isScreenshotSampleEventId(eventId)) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  return !error;
}

export async function listSubscriptionOfferPages(limit = 100): Promise<SubscriptionOfferPageRow[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return isAppStoreScreenshotMode() ? getScreenshotSampleOfferPages().slice(0, limit) : [];
  }
  const { data, error } = await supabase
    .from('subscription_offer_pages')
    .select('*')
    .order('sort_order', { ascending: true })
    .limit(limit);
  if (error) {
    return isAppStoreScreenshotMode() ? getScreenshotSampleOfferPages().slice(0, limit) : [];
  }
  const rows = (data ?? []) as SubscriptionOfferPageRow[];
  if (!isAppStoreScreenshotMode()) return rows;
  return mergeScreenshotSubscriptionPages(rows).slice(0, limit);
}

export async function getSubscriptionOfferPageById(id: string): Promise<SubscriptionOfferPageRow | null> {
  if (isAppStoreScreenshotMode()) {
    const sample = getScreenshotOfferPageById(id);
    if (sample) return sample;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('subscription_offer_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as SubscriptionOfferPageRow;
}

export type InsertSubscriptionOfferPageInput = {
  created_by: string;
  business_name: string;
  description?: string | null;
  hero_image_url?: string | null;
  video_url?: string | null;
  website_url?: string | null;
  social_links?: unknown;
};

export async function insertSubscriptionOfferPage(
  row: InsertSubscriptionOfferPageInput,
): Promise<SubscriptionOfferPageRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('subscription_offer_pages')
    .insert({
      created_by: row.created_by,
      business_name: row.business_name.trim(),
      description: row.description?.trim() || null,
      hero_image_url: row.hero_image_url?.trim() || null,
      video_url: row.video_url?.trim() || null,
      website_url: row.website_url?.trim() || null,
      social_links: row.social_links ?? [],
    })
    .select()
    .single();
  if (error || !data) return null;
  return data as SubscriptionOfferPageRow;
}

export async function deleteSubscriptionOfferPage(id: string): Promise<boolean> {
  if (isAppStoreScreenshotMode() && isScreenshotSampleOfferPageId(id)) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('subscription_offer_pages').delete().eq('id', id);
  return !error;
}

export async function deleteMediaAsset(assetId: string): Promise<boolean> {
  if (isAppStoreScreenshotMode() && isScreenshotSampleMediaId(assetId)) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('media_assets').delete().eq('id', assetId);
  return !error;
}

/** Latest media visible under RLS (public + own + master). */
export async function listBrowseMediaAssets(limit = 80): Promise<MediaAssetRow[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return isAppStoreScreenshotMode() ? getScreenshotSampleMediaAssets().slice(0, limit) : [];
  }
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    return isAppStoreScreenshotMode() ? getScreenshotSampleMediaAssets().slice(0, limit) : [];
  }
  const rows = (data ?? []) as MediaAssetRow[];
  if (!isAppStoreScreenshotMode()) return rows;
  return mergeScreenshotMedia(rows).slice(0, limit);
}

export async function listProfilesBrief(
  limit = 200,
): Promise<Pick<ProfileRow, 'id' | 'display_name' | 'avatar_url'>[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .order('id', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as Pick<ProfileRow, 'id' | 'display_name' | 'avatar_url'>[];
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
