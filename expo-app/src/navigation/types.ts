import type { NavigatorScreenParams } from '@react-navigation/native';

export type CommunityStackParamList = {
  CommunityFeed: undefined;
  /** Composer: caption, optional linked event, media preview — single screen. */
  CreateCommunityPost: undefined;
  CommunitySearch: undefined;
  CommunitySearchResults: { query?: string };
  Notifications: undefined;
  MessagesInbox: undefined;
  MessageThread: {
    name?: string;
    conversationId?: string;
    peerUserId?: string;
    avatarUrl?: string;
  };
  BrandPartner: undefined;
  DemoHub: undefined;
};

export type MediaStackParamList = {
  MediaLibrary: undefined;
  MediaSearch: undefined;
  MediaSearchResults: { query?: string } | undefined;
  MediaPlayer: { title?: string };
  SavedMedia: undefined;
  MediaCommunityFeed: undefined;
  CreateMediaContent: undefined;
};

export type BookingConfirmParams = {
  reference?: string;
  eventId?: string;
  title?: string;
  imageUri?: string;
  recapDate?: string;
  recapTime?: string;
  venue?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  fitnessLevel?: string;
};

export type EventsBrowseFilterChip = 'all' | 'booked' | 'saved' | 'past' | 'my_events';

export type EventsStackParamList = {
  UpcomingEvents: { initialFilter?: EventsBrowseFilterChip } | undefined;
  EventsSearch: undefined;
  EventDetails: {
    title?: string;
    imageUri?: string;
    dateShort?: string;
    sub?: string;
    /** `db:{uuid}` or `html:title:dateHint` — used for Saved filter + bookmark persistence */
    eventStorageKey?: string;
    /** Real Supabase `events.id` when applicable */
    supabaseEventId?: string;
  };
  ConfirmAttend: { title?: string; imageUri?: string; scheduleLine?: string };
  BookingConfirm: BookingConfirmParams | undefined;
  StaffCheckIn: undefined;
  HostEventDashboard: undefined;
  CreateEvent: undefined;
  /** Lists events created by current user → opens scan with mandatory selection. */
  HostScanPickEvent: undefined;
  HostAttendeeScan: { selectedEventId: string };
};

export type SponsorsStackParamList = {
  SponsorListings: undefined;
  BrandPartner: undefined;
};

export type ProfileStackParamList = {
  AthleteProfile: undefined;
  Paywall: undefined;
  AdminTools: undefined;
  AdminMediaUpload: undefined;
  QrTestLab: undefined;
  Settings: undefined;
  Accessibility: undefined;
  AccountSecurity: undefined;
  PrivacyVisibility: undefined;
  NotificationPrefs: undefined;
  FollowRequests: undefined;
  Support: undefined;
  Legal: undefined;
  EditBasic: undefined;
  EditProfilePhoto: undefined;
  EditAthlete: undefined;
  EditProfileSections: undefined;
  EditProfileSectionDetail: {
    slug: 'highlights' | 'recentResults' | 'socialLinks' | 'bioDescription';
  };
};

/** Shown before sign-in — no tab bar. */
export type AuthStackParamList = {
  GrantAccess: { startAt?: 'signup' } | undefined;
  WelcomeHub: undefined;
  LogIn: undefined;
  ForgotPassword: undefined;
  VerifyReset: undefined;
  CreatePassword: undefined;
};

/** Post–sign-in profile questions (first session). */
export type OnboardingStackParamList = {
  OnboardingName: undefined;
  OnboardingRole: undefined;
  OnboardingSports: undefined;
  OnboardingDiscovery: undefined;
  OnboardingComplete: undefined;
};

export type MainTabParamList = {
  Community: NavigatorScreenParams<CommunityStackParamList>;
  Media: NavigatorScreenParams<MediaStackParamList>;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Sponsors: NavigatorScreenParams<SponsorsStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: undefined;
  /** Tabs or first-run onboarding — see `AuthenticatedShell` in `AppNavigator`. */
  Main: undefined;
};
