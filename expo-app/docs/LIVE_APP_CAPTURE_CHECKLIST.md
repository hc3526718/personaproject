# LIVE APP CAPTURE CHECKLIST (local inventory)

**Label:** Built from Desktop `DaltonProject` source — verify every item against the **live App Store** app. Local may differ.

**Screenshot dump folder:** `C:\Users\haydn\Desktop\DGA-AppStore-Screens`

## Expo stack screens (from navigation types + screens/)

### Auth / onboarding
- GrantAccess, WelcomeHub, LogIn, ForgotPassword, VerifyReset, CreatePassword
- OnboardingName, OnboardingRole, OnboardingSports, OnboardingDiscovery, OnboardingComplete

### Community tab
- CommunityFeed, CommunitySearch, CommunitySearchResults, Notifications, MessagesInbox, MessageThread, BrandPartner, DemoHub

### Media tab
- MediaLibrary, MediaSearch, MediaSearchResults, MediaPlayer, SavedMedia, MediaCommunityFeed, CreateMediaContent

### Events tab
- UpcomingEvents, EventDetails, ConfirmAttend, BookingConfirm, SavedEvents, MyBookings, StaffCheckIn, HostEventDashboard, CreateEvent

### Sponsors tab
- SponsorListings, BrandPartner

### Profile tab
- AthleteProfile, Paywall, AdminTools, AdminMediaUpload, Settings, AccountSecurity, PrivacyVisibility, NotificationPrefs, Support, Legal, EditBasic, EditProfilePhoto, EditAthlete, EditProfileSections, EditProfileSectionDetail

## Screen files present in expo-app/src/screens
AdminMediaUploadScreen.tsx
AdminToolsScreen.tsx
communityScreens.tsx
CreateEventScreen.tsx
CreateMediaContentScreen.tsx
eventsScreens.tsx
GrantAccessScreen.tsx
HostEventDashboardScreen.tsx
mediaScreens.tsx
onboardingScreens.tsx
PaywallScreen.tsx
profileScreens.tsx
settingsDetailScreens.tsx
sponsorScreens.tsx
StaffCheckInScreen.tsx

## HTML mockups on Desktop DaltonProject
1-Onboarding Flow - Log In.html
10-Event Booking - Booking Confir.html
11-Event Booking - Saved Events.html
12-Event Booking - My Bookings.html
13-Upcoming Events.html
14-Profile Settings - Settings.html
15-Profile Settings - Edit Basic.html
16-Profile Settings - Edit Profil.html
17-Profile Settings - Edit Athlet.html
18-Media Library.html
19-Media Player - Media Search Re.html
2-Onboarding Flow - Verify Reset.html
20-Media Player - Media Player.html
21-Media Player - Saved Media.html
22-Athlete Profile.html
23-Media Player - Media Search.html
24-Media Player - Community Feed.html
25-Community Flow - Community Sea.html
26-Community Flow - Notifications.html
27-Community Flow - Messages Inbo.html
28-Community Flow - Message Threa.html
29-Community Flow - Community Sea.html
3-Onboarding Flow - Forgot Passw.html
30-Profile Settings - Edit Profil.html
31-Sponsor Listings.html
32-Grant Access.html
4-Onboarding Flow - Welcome & Ac.html
5-Onboarding Flow - Create New P.html
6-Brand Partner Detail.html
7-Community Feed.html
8-Event Booking - Event Details.html
9-Event Booking - Confirm Attend.html
index.html

## Capture script (for Haydn on live App Store app)
1. Cold open App Store DGA → screenshot splash/boot if any
2. Auth screens if logged out; else skip
3. Each bottom tab root (Community / Media / Events / Sponsors / Profile)
4. From each tab, open every primary CTA and list row once; screenshot destination + back
5. Full booking path on a real event
6. Profile → Settings → every sub-page
7. Admin/host/check-in if visible for your account
8. Paywall / Grant Access if shown
9. Message: screenshots ready

When screenshots land, map each file to a screen name, list visible buttons, and note navigation outcomes for Cursor.
