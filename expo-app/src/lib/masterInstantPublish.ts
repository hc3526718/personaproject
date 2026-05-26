import { uploadProposalAttachment } from './proposalAttachmentUpload';
import { insertCommunityEvent, insertSubscriptionOfferPage } from '../roadmap/liveDataService';
import { getSupabase } from './supabase';
import { combineDateAndTime } from './scheduleValidation';
import type { ProposalKind } from '../roadmap/proposalService';

type EventPayload = {
  title?: string;
  pitch?: string;
  proposed_date?: string;
  venue?: string;
  level?: string;
  agenda?: { title: string; time: string }[];
  max_attendance?: number | string;
};

type SponsorPayload = {
  brand_name?: string;
  contact_email?: string;
  goals?: string;
};

type MediaPayload = {
  title?: string;
  pitch?: string;
  category?: string;
};

function parseProposedDate(proposedDate?: string): { starts: string; ends: string } | null {
  if (!proposedDate?.trim()) return null;
  const dt = new Date(proposedDate.trim());
  if (Number.isNaN(dt.getTime())) return null;
  const ends = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
  return { starts: dt.toISOString(), ends: ends.toISOString() };
}

function buildEventDescription(payload: EventPayload): string {
  const parts: string[] = [];
  if (payload.pitch?.trim()) parts.push(payload.pitch.trim());
  if (payload.level) parts.push('', `Level: ${payload.level}`);
  const agenda = Array.isArray(payload.agenda)
    ? payload.agenda.filter((a) => a.title?.trim() && a.time?.trim())
    : [];
  if (agenda.length) {
    parts.push('', 'Agenda:', ...agenda.map((a) => `• ${a.time.trim()} — ${a.title.trim()}`));
  }
  const cap = payload.max_attendance;
  if (cap != null && String(cap).trim() !== '') {
    parts.push('', `Capacity: ${String(cap).trim()}`);
  }
  return parts.join('\n').trim() || 'Community event';
}

export async function publishEventFromProposalPayload(
  userId: string,
  payload: EventPayload,
  attachmentUrls: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const schedule = parseProposedDate(payload.proposed_date);
  if (!schedule) {
    return { ok: false, error: 'Could not read event date and time.' };
  }
  const row = await insertCommunityEvent({
    title: (payload.title ?? 'Community event').trim(),
    description: buildEventDescription(payload),
    starts_at: schedule.starts,
    ends_at: schedule.ends,
    venue: payload.venue?.trim() || null,
    hero_image_url: attachmentUrls.find((u) => /\.(jpe?g|png|webp|gif)/i.test(u)) ?? null,
    requires_payment: false,
    created_by: userId,
  });
  if (!row) return { ok: false, error: 'Could not publish event.' };
  return { ok: true };
}

export async function publishSponsorFromProposalPayload(
  userId: string,
  payload: SponsorPayload,
  attachmentUrls: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const descParts = [
    payload.goals?.trim() ?? '',
    payload.contact_email?.trim() ? `Contact: ${payload.contact_email.trim()}` : '',
  ].filter(Boolean);
  const row = await insertSubscriptionOfferPage({
    created_by: userId,
    business_name: (payload.brand_name ?? 'Partner').trim(),
    description: descParts.join('\n\n') || null,
    hero_image_url: attachmentUrls[0] ?? null,
    website_url: null,
    video_url: null,
    social_links: [],
  });
  if (!row) return { ok: false, error: 'Could not publish sponsor page.' };
  return { ok: true };
}

export async function publishMediaFromProposalPayload(
  userId: string,
  payload: MediaPayload,
  attachmentUrls: string[],
  localFiles: { uri: string; name: string }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected.' };

  const title = (payload.title ?? 'Media').trim();
  const description = [payload.pitch?.trim(), payload.category ? `Category: ${payload.category}` : '']
    .filter(Boolean)
    .join('\n\n');

  let published = 0;
  for (let i = 0; i < localFiles.length; i++) {
    const f = localFiles[i]!;
    const publicUrl =
      attachmentUrls[i] ??
      (await uploadProposalAttachment(userId, 'media', f.uri, f.name));
    if (!publicUrl) continue;
    const isVideo = /\.(mp4|mov|webm|m4v)/i.test(f.name) || f.name.toLowerCase().includes('video');
    const { error } = await supabase.from('media_assets').insert({
      owner_id: userId,
      kind: isVideo ? 'video' : 'file',
      storage_path: `library/${userId}/${Date.now()}-${i}`,
      public_url: publicUrl,
      mime_type: isVideo ? 'video/mp4' : null,
      visibility: 'public',
    });
    if (!error) published += 1;
  }

  for (const url of attachmentUrls.slice(localFiles.length)) {
    const isVideo = /\.(mp4|mov|webm)/i.test(url);
    const { error } = await supabase.from('media_assets').insert({
      owner_id: userId,
      kind: isVideo ? 'video' : 'file',
      storage_path: `library/${userId}/${Date.now()}-link`,
      public_url: url,
      visibility: 'public',
    });
    if (!error) published += 1;
  }

  if (published === 0 && attachmentUrls.length === 0 && localFiles.length === 0) {
    const { error } = await supabase.from('media_assets').insert({
      owner_id: userId,
      kind: 'file',
      storage_path: `library/${userId}/${Date.now()}-meta`,
      public_url: null,
      visibility: 'public',
    });
    if (error) return { ok: false, error: 'Could not publish media entry.' };
  } else if (published === 0 && (attachmentUrls.length > 0 || localFiles.length > 0)) {
    return { ok: false, error: 'Could not publish media files.' };
  }

  void title;
  void description;
  return { ok: true };
}

export async function masterInstantPublish(
  userId: string,
  kind: ProposalKind,
  payload: Record<string, unknown>,
  attachmentUrls: string[],
  localFiles: { uri: string; name: string }[] = [],
): Promise<{ ok: true } | { ok: false; error: string }> {
  switch (kind) {
    case 'event':
      return publishEventFromProposalPayload(userId, payload as EventPayload, attachmentUrls);
    case 'sponsor':
      return publishSponsorFromProposalPayload(userId, payload as SponsorPayload, attachmentUrls);
    case 'media':
      return publishMediaFromProposalPayload(
        userId,
        payload as MediaPayload,
        attachmentUrls,
        localFiles,
      );
    default:
      return { ok: false, error: 'Unknown content type.' };
  }
}

/** Build ISO schedule string from separate date + time pickers. */
export function proposedDateIsoFromPickers(eventDate: Date, eventTime: Date): string {
  return combineDateAndTime(eventDate, eventTime).toISOString();
}
