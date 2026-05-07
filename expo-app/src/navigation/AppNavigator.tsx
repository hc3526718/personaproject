import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { DS } from '../designSystem';
import { getSupabase } from '../lib/supabase';
import { ensureProfileRow } from '../roadmap/profileService';
import { OnboardingNavigator } from '../onboarding/OnboardingNavigator';
import type {
  AuthStackParamList,
  CommunityStackParamList,
  EventsStackParamList,
  MainTabParamList,
  MediaStackParamList,
  ProfileStackParamList,
  RootStackParamList,
  SponsorsStackParamList,
} from './types';
import {
  BrandPartnerScreen,
  CommunityFeedScreen,
  CommunitySearchResultsScreen,
  CommunitySearchScreen,
  CreateCommunityPostScreen,
  DemoHubScreen,
  MessageThreadScreen,
  MessagesInboxScreen,
  NotificationsScreen,
} from '../screens/communityScreens';
import {
  MediaCommunityFeedScreen,
  MediaLibraryScreen,
  MediaPlayerScreen,
  MediaSearchResultsScreen,
  MediaSearchScreen,
  SavedMediaScreen,
} from '../screens/mediaScreens';
import {
  BookingConfirmScreen,
  ConfirmAttendScreen,
  EventDetailsScreen,
  EventsSearchScreen,
  UpcomingEventsScreen,
} from '../screens/eventsScreens';
import { HostAttendeeScanScreen } from '../screens/HostAttendeeScanScreen';
import { HostScanPickEventScreen } from '../screens/HostScanPickEventScreen';
import { HostEventDashboardScreen } from '../screens/HostEventDashboardScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { CreateMediaContentScreen } from '../screens/CreateMediaContentScreen';
import { StaffCheckInScreen } from '../screens/StaffCheckInScreen';
import { SponsorListingsScreen } from '../screens/sponsorScreens';
import {
  AthleteProfileScreen,
  EditAthleteScreen,
  EditBasicScreen,
  EditProfilePhotoScreen,
  EditProfileSectionDetailScreen,
  EditProfileSectionsScreen,
  SettingsScreen,
} from '../screens/profileScreens';
import { FollowRequestsScreen } from '../screens/FollowRequestsScreen';
import { QrTestLabScreen } from '../screens/QrTestLabScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { AdminToolsScreen } from '../screens/AdminToolsScreen';
import { AdminMediaUploadScreen } from '../screens/AdminMediaUploadScreen';
import {
  AccountSecurityScreen,
  AccessibilityScreen,
  LegalScreen,
  NotificationPrefsScreen,
  PrivacyVisibilityScreen,
  SupportScreen,
} from '../screens/settingsDetailScreens';
import {
  CreatePasswordScreen,
  ForgotPasswordScreen,
  LogInScreen,
  VerifyResetScreen,
  WelcomeHubScreen,
} from '../screens/onboardingScreens';
import GrantAccessScreen from '../screens/GrantAccessScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const CommunityStack = createNativeStackNavigator<CommunityStackParamList>();
const MediaStack = createNativeStackNavigator<MediaStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const SponsorsStack = createNativeStackNavigator<SponsorsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: DS.color.background,
    card: DS.color.background,
    text: DS.color.text,
    border: DS.color.borderHairline,
    primary: DS.color.gold,
  },
};

function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.color.background },
      }}
    >
      <CommunityStack.Screen name="CommunityFeed" component={CommunityFeedScreen} />
      <CommunityStack.Screen name="CreateCommunityPost" component={CreateCommunityPostScreen} />
      <CommunityStack.Screen name="CommunitySearch" component={CommunitySearchScreen} />
      <CommunityStack.Screen name="CommunitySearchResults" component={CommunitySearchResultsScreen} />
      <CommunityStack.Screen name="Notifications" component={NotificationsScreen} />
      <CommunityStack.Screen name="MessagesInbox" component={MessagesInboxScreen} />
      <CommunityStack.Screen name="MessageThread" component={MessageThreadScreen} />
      <CommunityStack.Screen name="BrandPartner" component={BrandPartnerScreen} />
      <CommunityStack.Screen name="DemoHub" component={DemoHubScreen} />
    </CommunityStack.Navigator>
  );
}

function MediaStackNavigator() {
  return (
    <MediaStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.color.background },
      }}
    >
      <MediaStack.Screen name="MediaLibrary" component={MediaLibraryScreen} />
      <MediaStack.Screen name="MediaSearch" component={MediaSearchScreen} />
      <MediaStack.Screen name="MediaSearchResults" component={MediaSearchResultsScreen} />
      <MediaStack.Screen name="MediaPlayer" component={MediaPlayerScreen} />
      <MediaStack.Screen name="SavedMedia" component={SavedMediaScreen} />
      <MediaStack.Screen name="MediaCommunityFeed" component={MediaCommunityFeedScreen} />
      <MediaStack.Screen name="CreateMediaContent" component={CreateMediaContentScreen} />
    </MediaStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.color.background },
      }}
    >
      <EventsStack.Screen name="UpcomingEvents" component={UpcomingEventsScreen} />
      <EventsStack.Screen name="EventsSearch" component={EventsSearchScreen} />
      <EventsStack.Screen name="EventDetails" component={EventDetailsScreen} />
      <EventsStack.Screen name="ConfirmAttend" component={ConfirmAttendScreen} />
      <EventsStack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <EventsStack.Screen name="StaffCheckIn" component={StaffCheckInScreen} />
      <EventsStack.Screen name="HostEventDashboard" component={HostEventDashboardScreen} />
      <EventsStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <EventsStack.Screen name="HostScanPickEvent" component={HostScanPickEventScreen} />
      <EventsStack.Screen name="HostAttendeeScan" component={HostAttendeeScanScreen} />
    </EventsStack.Navigator>
  );
}

function SponsorsStackNavigator() {
  return (
    <SponsorsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.color.background },
      }}
    >
      <SponsorsStack.Screen name="SponsorListings" component={SponsorListingsScreen} />
      <SponsorsStack.Screen name="BrandPartner" component={BrandPartnerScreen} />
    </SponsorsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      initialRouteName="AthleteProfile"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.color.background },
      }}
    >
      <ProfileStack.Screen name="AthleteProfile" component={AthleteProfileScreen} />
      <ProfileStack.Screen name="Paywall" component={PaywallScreen} />
      <ProfileStack.Screen name="AdminTools" component={AdminToolsScreen} />
      <ProfileStack.Screen name="AdminMediaUpload" component={AdminMediaUploadScreen} />
      <ProfileStack.Screen name="QrTestLab" component={QrTestLabScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Accessibility" component={AccessibilityScreen} />
      <ProfileStack.Screen name="AccountSecurity" component={AccountSecurityScreen} />
      <ProfileStack.Screen name="PrivacyVisibility" component={PrivacyVisibilityScreen} />
      <ProfileStack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
      <ProfileStack.Screen name="FollowRequests" component={FollowRequestsScreen} />
      <ProfileStack.Screen name="Support" component={SupportScreen} />
      <ProfileStack.Screen name="Legal" component={LegalScreen} />
      <ProfileStack.Screen name="EditBasic" component={EditBasicScreen} />
      <ProfileStack.Screen name="EditProfilePhoto" component={EditProfilePhotoScreen} />
      <ProfileStack.Screen name="EditAthlete" component={EditAthleteScreen} />
      <ProfileStack.Screen name="EditProfileSections" component={EditProfileSectionsScreen} />
      <ProfileStack.Screen name="EditProfileSectionDetail" component={EditProfileSectionDetailScreen} />
    </ProfileStack.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="LogIn"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.color.background },
      }}
    >
      <AuthStack.Screen name="GrantAccess" component={GrantAccessScreen} />
      <AuthStack.Screen name="WelcomeHub" component={WelcomeHubScreen} />
      <AuthStack.Screen name="LogIn" component={LogInScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="VerifyReset" component={VerifyResetScreen} />
      <AuthStack.Screen name="CreatePassword" component={CreatePasswordScreen} />
    </AuthStack.Navigator>
  );
}

const mainTabBarBase = {
  backgroundColor: DS.color.tabBarRaised,
  borderTopColor: DS.color.borderWhite5,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  overflow: 'hidden' as const,
  elevation: 20,
};

const TAB_BAR_CONTENT_MIN = 56;
const TAB_BAR_TOP_PAD = 12;
const TAB_BAR_EXTRA_BOTTOM = 8;

function AuthenticatedShell() {
  const { user } = useAuth();
  const supabase = getSupabase();
  const [gate, setGate] = useState<'loading' | 'onboarding' | 'app'>('loading');

  const refreshGate = useCallback(async () => {
    if (!user) {
      setGate('loading');
      return;
    }
    if (!supabase || user.id.startsWith('demo')) {
      setGate('app');
      return;
    }
    const row = await Promise.race([
      supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', user.id)
        .maybeSingle()
        .then((r) => r.data as { onboarding_completed_at: string | null } | null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (row) {
      setGate(row.onboarding_completed_at ? 'app' : 'onboarding');
      return;
    }
    void ensureProfileRow(user.id, user.email ?? null);
    setGate('app');
  }, [user, supabase]);

  useEffect(() => {
    void refreshGate();
  }, [refreshGate]);

  if (gate === 'loading') {
    return <View style={{ flex: 1, backgroundColor: DS.color.background }} />;
  }
  if (gate === 'onboarding') {
    return (
      <OnboardingNavigator
        onFinished={() => {
          setGate('loading');
          void refreshGate();
        }}
      />
    );
  }
  return <MainTabNavigator />;
}

function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarStyleVisible = useMemo(
    () => ({
      ...mainTabBarBase,
      minHeight: TAB_BAR_CONTENT_MIN + insets.bottom + TAB_BAR_EXTRA_BOTTOM,
      paddingTop: TAB_BAR_TOP_PAD,
      paddingBottom: insets.bottom + TAB_BAR_EXTRA_BOTTOM,
      paddingHorizontal: DS.space.xs,
    }),
    [insets.bottom],
  );

  return (
    <Tab.Navigator
      initialRouteName="Community"
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabBarStyleVisible,
        tabBarActiveTintColor: DS.color.gold,
        tabBarInactiveTintColor: DS.color.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen
        name="Community"
        component={CommunityStackNavigator}
        options={({ route }) => {
          const nested = getFocusedRouteNameFromRoute(route) ?? 'CommunityFeed';
          const hideTabBar = nested === 'CreateCommunityPost';
          return {
            tabBarLabel: 'Community',
            tabBarStyle: hideTabBar
              ? { display: 'none' as const, height: 0, overflow: 'hidden' as const }
              : tabBarStyleVisible,
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="users" size={Math.max(14, size - 2)} color={color} solid />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Media"
        component={MediaStackNavigator}
        options={({ route }) => {
          const nested = getFocusedRouteNameFromRoute(route) ?? 'MediaLibrary';
          const hideTabBar = nested === 'CreateMediaContent';
          return {
            tabBarLabel: 'Media',
            tabBarStyle: hideTabBar
              ? { display: 'none' as const, height: 0, overflow: 'hidden' as const }
              : tabBarStyleVisible,
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <FontAwesome name="play" size={Math.max(14, size - 2)} color={color} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Sponsors"
        component={SponsorsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="handshake" size={Math.max(14, size - 2)} color={color} solid />
          ),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsStackNavigator}
        options={({ route }) => {
          const nested = getFocusedRouteNameFromRoute(route) ?? 'UpcomingEvents';
          const hideTabBar =
            nested === 'EventDetails' ||
            nested === 'ConfirmAttend' ||
            nested === 'BookingConfirm' ||
            nested === 'StaffCheckIn' ||
            nested === 'HostEventDashboard' ||
            nested === 'CreateEvent' ||
            nested === 'HostAttendeeScan' ||
            nested === 'HostScanPickEvent' ||
            nested === 'EventsSearch';
          return {
            tabBarStyle: hideTabBar
              ? { display: 'none' as const, height: 0, overflow: 'hidden' as const }
              : tabBarStyleVisible,
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <FontAwesome name="calendar" size={Math.max(14, size - 2)} color={color} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user-o" size={Math.max(14, size - 2)} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        key={isAuthenticated ? 'root-app' : 'root-auth'}
        screenOptions={{ headerShown: false }}
      >
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={AuthenticatedShell} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
