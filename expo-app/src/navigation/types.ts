import type { NavigatorScreenParams } from '@react-navigation/native';

export type CommunityStackParamList = {
  CommunityFeed: undefined;
  CommunitySearch: undefined;
  CommunitySearchResults: { query?: string };
  Notifications: undefined;
  MessagesInbox: undefined;
  MessageThread: { name?: string };
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
  title?: string;
  imageUri?: string;
  recapDate?: string;
  recapTime?: string;
  venue?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  fitnessLevel?: string;
};

export type EventsStackParamList = {
  UpcomingEvents: undefined;
  EventDetails: { title?: string; imageUri?: string; dateShort?: string; sub?: string };
  ConfirmAttend: { title?: string; imageUri?: string; scheduleLine?: string };
  BookingConfirm: BookingConfirmParams | undefined;
  SavedEvents: undefined;
  MyBookings: undefined;
  StaffCheckIn: undefined;
  HostEventDashboard: undefined;
  CreateEvent: undefined;
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
  Settings: undefined;
  AccountSecurity: undefined;
  PrivacyVisibility: undefined;
  NotificationPrefs: undefined;
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
