import { Share, Platform } from 'react-native';

/**
 * Professional sharing utility for The Dalton Grant Academy.
 * Builds branded share payloads with consistent titles, messages, and deep links.
 */

const BRAND_NAME = 'The Dalton Grant Academy';
const WEB_DOMAIN = 'https://daltongrantacademy.uk';
const APP_SCHEME = 'dalton-demo://';

// App Store listing (replace with actual URL when published)
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/the-dalton-grant-academy/id123456789';
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.hc111.daltondemo';

function getAppStoreUrl(): string {
  return Platform.select({
    ios: IOS_APP_STORE_URL,
    android: ANDROID_PLAY_STORE_URL,
    default: WEB_DOMAIN,
  });
}

export type ShareEventOptions = {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  venue?: string;
};

export type ShareMediaOptions = {
  mediaId: string;
  mediaTitle: string;
  authorName?: string;
};

export type ShareSponsorOptions = {
  sponsorId: string;
  businessName: string;
  websiteUrl?: string;
};

/**
 * Share an event with professional branding and deep link.
 */
export async function shareEvent(options: ShareEventOptions): Promise<void> {
  const { eventTitle, eventDate, venue } = options;
  
  const title = `${eventTitle} · ${BRAND_NAME}`;
  
  let message = `${eventTitle}`;
  if (eventDate) {
    message += `\n${eventDate}`;
  }
  if (venue) {
    message += `\n📍 ${venue}`;
  }
  
  message += `\n\nView event details: ${WEB_DOMAIN}/app/events/${options.eventId}`;
  
  try {
    await Share.share({
      title,
      message,
      url: Platform.OS === 'ios' ? `${WEB_DOMAIN}/app/events/${options.eventId}` : undefined,
    });
  } catch (error) {
    // User cancelled or share failed
  }
}

/**
 * Share media content with professional branding and deep link.
 */
export async function shareMedia(options: ShareMediaOptions): Promise<void> {
  const { mediaTitle, authorName } = options;
  
  const title = `${mediaTitle} · ${BRAND_NAME}`;
  
  let message = mediaTitle;
  if (authorName) {
    message += ` by ${authorName}`;
  }
  
  message += `\n\nWatch on ${BRAND_NAME}: ${WEB_DOMAIN}/app/media/${options.mediaId}`;
  
  try {
    await Share.share({
      title,
      message,
      url: Platform.OS === 'ios' ? `${WEB_DOMAIN}/app/media/${options.mediaId}` : undefined,
    });
  } catch (error) {
    // User cancelled or share failed
  }
}

/**
 * Share a sponsor/partner page with professional branding.
 */
export async function shareSponsor(options: ShareSponsorOptions): Promise<void> {
  const { businessName, websiteUrl } = options;
  
  const title = `${businessName} · Partner of ${BRAND_NAME}`;
  
  let message = `${businessName}`;
  message += `\n\nOfficial partner of ${BRAND_NAME}`;
  
  if (websiteUrl) {
    message += `\n\n${websiteUrl}`;
  } else {
    message += `\n\n${WEB_DOMAIN}/app/sponsors/${options.sponsorId}`;
  }
  
  try {
    await Share.share({
      title,
      message,
      url: Platform.OS === 'ios' ? websiteUrl || `${WEB_DOMAIN}/app/sponsors/${options.sponsorId}` : undefined,
    });
  } catch (error) {
    // User cancelled or share failed
  }
}

/**
 * Invite someone to an event with a professional message.
 */
export async function shareEventInvite(options: ShareEventOptions): Promise<void> {
  const { eventTitle, eventDate, venue } = options;
  
  const title = `Join me at ${eventTitle} · ${BRAND_NAME}`;
  
  let message = `I'm going to ${eventTitle}`;
  if (eventDate) {
    message += ` on ${eventDate}`;
  }
  if (venue) {
    message += ` at ${venue}`;
  }
  
  message += `.\n\nJoin me at ${BRAND_NAME}!`;
  message += `\n\n${WEB_DOMAIN}/app/events/${options.eventId}`;
  
  try {
    await Share.share({
      title,
      message,
      url: Platform.OS === 'ios' ? `${WEB_DOMAIN}/app/events/${options.eventId}` : undefined,
    });
  } catch (error) {
    // User cancelled or share failed
  }
}

/**
 * Share the app itself - for friend invites or general promotion.
 */
export async function shareApp(): Promise<void> {
  const title = `Join ${BRAND_NAME}`;
  
  const message = 
    `Join ${BRAND_NAME} – the premier sports academy platform.\n\n` +
    `📅 Book exclusive training events\n` +
    `📸 Access behind-the-scenes content\n` +
    `🤝 Connect with the athletic community\n\n` +
    `Download now: ${getAppStoreUrl()}`;
  
  try {
    await Share.share({
      title,
      message,
      url: Platform.OS === 'ios' ? getAppStoreUrl() : undefined,
    });
  } catch (error) {
    // User cancelled or share failed
  }
}

/**
 * Share a community post (uses existing logic but with consistent branding).
 */
export async function shareCommunityPost(options: {
  authorName: string;
  bodySnippet: string;
  postId: string;
}): Promise<void> {
  const { authorName, bodySnippet, postId } = options;
  
  const title = `${authorName} · ${BRAND_NAME}`;
  
  const snippet = bodySnippet.trim().slice(0, 280);
  const message = `${authorName} on ${BRAND_NAME}\n\n${snippet}\n\n${WEB_DOMAIN}/app/posts/${postId}`;
  
  try {
    await Share.share({
      title,
      message,
      url: Platform.OS === 'ios' ? `${WEB_DOMAIN}/app/posts/${postId}` : undefined,
    });
  } catch (error) {
    // User cancelled or share failed
  }
}

/**
 * Generic fallback for simple shares with branding.
 */
export async function shareGeneric(content: string): Promise<void> {
  const title = BRAND_NAME;
  
  try {
    await Share.share({
      title,
      message: content,
    });
  } catch (error) {
    // User cancelled or share failed
  }
}
