/**
 * Shared DTO shapes for live Supabase-backed features (align rows with `backend/schema.sql`).
 * Screens should map these to UI models; keep transport types stable here.
 */

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  persona_role: string | null;
  sports: string[] | null;
  discovery_source: string | null;
  onboarding_completed_at: string | null;
  dalton_verified: boolean | null;
};

export type PostRow = {
  id: string;
  author_id: string;
  organization_id: string | null;
  body: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: string;
  organization_id: string | null;
  created_by?: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  hero_image_url: string | null;
  requires_payment: boolean;
  stripe_price_id: string | null;
  created_at: string;
};

export type MediaAssetRow = {
  id: string;
  owner_id: string;
  kind: 'image' | 'video' | 'audio' | 'file';
  storage_path: string;
  public_url: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  visibility: 'private' | 'followers' | 'public';
  created_at: string;
};

export type ConversationRow = { id: string; created_at: string };

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
};

export type SubscriptionStateRow = {
  user_id: string;
  is_pro: boolean;
  entitlement_ids: string[] | null;
  updated_at: string;
};

/** Server row for sponsorship *applications* (not public posts) — apply in `roadmap_extensions.sql`. */
export type SponsorshipSubmissionRow = {
  id: string;
  submitter_id: string;
  title: string;
  body: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type UserSettingsRow = {
  user_id: string;
  /** JSON blob for notification prefs, theme, etc. */
  preferences: Record<string, unknown>;
  updated_at: string;
};

export type PushDeviceRow = {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android' | 'web';
  updated_at: string;
};
