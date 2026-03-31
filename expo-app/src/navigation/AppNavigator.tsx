import { StyleSheet } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { DS } from '../designSystem';
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
  MyBookingsScreen,
  SavedEventsScreen,
  UpcomingEventsScreen,
} from '../screens/eventsScreens';
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
import { PaywallScreen } from '../screens/PaywallScreen';
import { AdminToolsScreen } from '../screens/AdminToolsScreen';
import {
  AccountSecurityScreen,
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
      <EventsStack.Screen name="EventDetails" component={EventDetailsScreen} />
      <EventsStack.Screen name="ConfirmAttend" component={ConfirmAttendScreen} />
      <EventsStack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <EventsStack.Screen name="SavedEvents" component={SavedEventsScreen} />
      <EventsStack.Screen name="MyBookings" component={MyBookingsScreen} />
      <EventsStack.Screen name="StaffCheckIn" component={StaffCheckInScreen} />
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
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="AccountSecurity" component={AccountSecurityScreen} />
      <ProfileStack.Screen name="PrivacyVisibility" component={PrivacyVisibilityScreen} />
      <ProfileStack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
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
      initialRouteName="GrantAccess"
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

const mainTabBarStyle = {
  backgroundColor: DS.color.tabBarRaised,
  borderTopColor: DS.color.borderWhite5,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  overflow: 'hidden' as const,
  elevation: 20,
};

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={{
        headerShown: false,
        tabBarStyle: mainTabBarStyle,
        tabBarActiveTintColor: DS.color.gold,
        tabBarInactiveTintColor: DS.color.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Community"
        component={CommunityStackNavigator}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="users" size={size - 2} color={color} solid />
          ),
        }}
      />
      <Tab.Screen
        name="Media"
        component={MediaStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <FontAwesome name="play" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Sponsors"
        component={SponsorsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="handshake" size={size - 2} color={color} solid />
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
            nested === 'StaffCheckIn';
          return {
            tabBarStyle: hideTabBar
              ? { display: 'none' as const, height: 0, overflow: 'hidden' as const }
              : mainTabBarStyle,
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <FontAwesome name="calendar" size={size} color={color} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <FontAwesome name="user-o" size={size} color={color} />,
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
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
