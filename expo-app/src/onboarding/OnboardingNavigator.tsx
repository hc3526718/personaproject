import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { safeGetSession } from '../auth/authSessionRecovery';
import { isAccountGoneError, isAccountGonePostgrestError } from '../auth/invalidAccountSession';
import { showSupportError } from '../lib/appAlert';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { AuthWebBackBar } from '../components/AuthWebBackBar';
import { AuthWelcomeRiveHero } from '../components/AuthWelcomeRiveHero';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DS } from '../designSystem';
import { WEB_MAX_CONTENT_WIDTH } from '../layout/webLayout';
import { capitalizeProfileTag, capitalizeProfileTags } from '../lib/capitalizeProfileTags';
import { getSupabase } from '../lib/supabase';
import type { OnboardingStackParamList } from '../navigation/types';
import { UsernameSetupFields, canProceedWithUsername } from '../components/UsernameSetupFields';
import {
  allocateAutoUsername,
  checkUsernameAvailable,
  isValidUsernameFormat,
  normalizeUsernameTyping,
} from '../profile/usernameProfile';
import { useUsernameAvailability } from '../profile/useUsernameAvailability';
import {
  PERSONA_OPTIONS,
  SPORT_OPTIONS,
  roleNeedsSport,
  sportStepSubtitle,
  sportStepTitle,
} from './onboardingCopy';
import { oauthNameHints, resolveOAuthProfileNames } from './oauthProfileNames';
import { authScreenSharedStyles as authS } from '../screens/onboardingScreens';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export type OnboardingDraft = {
  firstName: string;
  lastName: string;
  username: string;
  usernameSkipped: boolean;
  primarySport: string;
  personaRole: string;
  sports: string[];
};

const defaultDraft = (): OnboardingDraft => ({
  firstName: '',
  lastName: '',
  username: '',
  usernameSkipped: false,
  primarySport: '',
  personaRole: '',
  sports: [],
});

type OnboardingCtx = {
  draft: OnboardingDraft;
  setDraft: (p: Partial<OnboardingDraft>) => void;
  onFinished: () => void;
  skipNameStep: boolean;
  stepTotal: number;
};

const Ctx = createContext<OnboardingCtx | null>(null);

function useOnboardingCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('Onboarding context missing');
  return v;
}

type Props = {
  onFinished: () => void;
  /** Apple / Google sign-in — skip name entry; names come from the provider. */
  skipNameStep?: boolean;
};

export function OnboardingNavigator({ onFinished, skipNameStep = false }: Props) {
  const [draft, setDraftState] = useState<OnboardingDraft>(defaultDraft);
  const { user } = useAuth();
  const stepTotal = skipNameStep ? 2 : 3;

  const setDraft = useCallback((p: Partial<OnboardingDraft>) => {
    setDraftState((d) => ({ ...d, ...p }));
  }, []);

  useEffect(() => {
    if (!skipNameStep || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const session = await safeGetSession(supabase);
      const sessionUser = session?.user;
      if (cancelled || !sessionUser) return;
      const hints = oauthNameHints(sessionUser.user_metadata as Record<string, unknown> | undefined);
      const resolved = resolveOAuthProfileNames(hints, sessionUser.email ?? user.email ?? null);
      setDraft({
        firstName: resolved.firstName,
        lastName: resolved.lastName,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [skipNameStep, setDraft, user?.email, user?.id]);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      onFinished,
      skipNameStep,
      stepTotal,
    }),
    [draft, setDraft, onFinished, skipNameStep, stepTotal],
  );

  return (
    <Ctx.Provider value={value}>
      <Stack.Navigator
        initialRouteName={skipNameStep ? 'OnboardingUsername' : 'OnboardingName'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: DALTON_BOOT_VIDEO_BG },
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="OnboardingName" component={NameStep} />
        <Stack.Screen name="OnboardingUsername" component={UsernameStep} />
        <Stack.Screen name="OnboardingRole" component={RoleStep} />
      </Stack.Navigator>
    </Ctx.Provider>
  );
}

type StepProps<K extends keyof OnboardingStackParamList> = NativeStackScreenProps<
  OnboardingStackParamList,
  K
>;

function StepChrome({
  title,
  subtitle,
  stepIndex,
  stepTotal,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  stepIndex: number;
  stepTotal: number;
  children: ReactNode;
  footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const topPad =
    Platform.OS === 'web' ? DS.space.xl : insets.top + DS.space.md;
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthWebBackBar />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          styles.scrollWeb,
          { paddingTop: topPad, paddingBottom: insets.bottom + DS.space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={authS.loginLogoRow}>
          <AuthWelcomeRiveHero variant="form" />
        </View>
        <Text style={styles.stepBadge}>
          Step {stepIndex} of {stepTotal}
        </Text>
        <Text style={styles.stepTitle}>{title}</Text>
        {subtitle ? <Text style={styles.stepSub}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + DS.space.md }]}>{footer}</View>
    </KeyboardAvoidingView>
  );
}

function NameStep({ navigation }: StepProps<'OnboardingName'>) {
  const { draft, setDraft, stepTotal } = useOnboardingCtx();
  const canNext = draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0;
  return (
    <StepChrome
      title="Welcome"
      subtitle="Tell us your name so the community knows who you are."
      stepIndex={1}
      stepTotal={stepTotal}
      footer={
        <AppleHeroButton
          disabled={!canNext}
          onPress={() => navigation.navigate('OnboardingUsername')}
        >
          Continue
        </AppleHeroButton>
      }
    >
      <Field label="First name">
        <TextInput
          style={authS.inputCompact}
          placeholder="First name"
          placeholderTextColor={DS.color.textMuted}
          value={draft.firstName}
          onChangeText={(t) => setDraft({ firstName: t })}
          autoCapitalize="words"
        />
      </Field>
      <Field label="Surname">
        <TextInput
          style={authS.inputCompact}
          placeholder="Surname"
          placeholderTextColor={DS.color.textMuted}
          value={draft.lastName}
          onChangeText={(t) => setDraft({ lastName: t })}
          autoCapitalize="words"
        />
      </Field>
    </StepChrome>
  );
}

function UsernameStep({ navigation }: StepProps<'OnboardingUsername'>) {
  const { draft, setDraft, skipNameStep, stepTotal } = useOnboardingCtx();
  const { user } = useAuth();
  const supabase = getSupabase();
  const availability = useUsernameAvailability(
    supabase,
    user?.id,
    draft.username,
    draft.usernameSkipped,
  );
  const canNext = canProceedWithUsername(draft.usernameSkipped, draft.username, availability);
  const stepIndex = skipNameStep ? 1 : 2;
  const welcomeName = draft.firstName.trim();

  return (
    <StepChrome
      title={skipNameStep && welcomeName ? `Welcome, ${welcomeName}` : 'Choose a username'}
      subtitle={
        skipNameStep
          ? 'Pick a username for your profile, or skip and we will assign one for you.'
          : "This is how you'll appear across Dalton. We check availability as you type — or skip for an auto-assigned name."
      }
      stepIndex={stepIndex}
      stepTotal={stepTotal}
      footer={
        <View style={styles.footerRow}>
          {!skipNameStep ? (
            <AppleHeroButton variant="ghost" style={styles.footerHalf} onPress={() => navigation.goBack()}>
              Back
            </AppleHeroButton>
          ) : null}
          <AppleHeroButton
            disabled={!canNext}
            style={skipNameStep ? styles.footerFull : styles.footerHalf}
            onPress={() => navigation.navigate('OnboardingRole')}
          >
            Continue
          </AppleHeroButton>
        </View>
      }
    >
      <UsernameSetupFields
        firstNameForPreview={draft.firstName || welcomeName}
        usernameInput={draft.username}
        onUsernameInputChange={(v) => setDraft({ username: v })}
        skipped={draft.usernameSkipped}
        onSkippedChange={(skipped) =>
          setDraft({
            usernameSkipped: skipped,
            username: skipped ? '' : draft.username,
          })
        }
        availability={availability}
      />
    </StepChrome>
  );
}

function RoleStep({ navigation }: StepProps<'OnboardingRole'>) {
  const { draft, setDraft, onFinished, skipNameStep, stepTotal } = useOnboardingCtx();
  const { user, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const needsSport = roleNeedsSport(draft.personaRole);
  const canNext =
    Boolean(draft.personaRole) && (!needsSport || Boolean(draft.primarySport.trim()));
  const stepIndex = skipNameStep ? 2 : 3;

  const saveAndEnter = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !user) {
      Alert.alert('Unable to save', 'Sign in again to finish setup.');
      return;
    }
    setSaving(true);
    let usernameFinal: string;
    try {
      if (draft.usernameSkipped) {
        const nameSeed = draft.firstName.trim() || 'member';
        usernameFinal = await allocateAutoUsername(supabase, nameSeed, user.id);
      } else {
        usernameFinal = normalizeUsernameTyping(draft.username);
        if (!isValidUsernameFormat(usernameFinal)) {
          setSaving(false);
          Alert.alert('Username', 'Choose a valid username from the previous step.');
          navigation.navigate('OnboardingUsername');
          return;
        }
        const avail = await checkUsernameAvailable(supabase, usernameFinal, user.id);
        if (!avail) {
          setSaving(false);
          Alert.alert('Username taken', 'Go back and pick a different username.');
          navigation.navigate('OnboardingUsername');
          return;
        }
      }
    } catch (e) {
      setSaving(false);
      if (isAccountGoneError(e)) {
        await logout();
        return;
      }
      showSupportError('Username', 'set your username');
      return;
    }

    let firstName = draft.firstName.trim();
    let lastName = draft.lastName.trim();
    if (skipNameStep && !firstName) {
      const session = await safeGetSession(supabase);
      const sessionUser = session?.user;
      const hints = oauthNameHints(sessionUser?.user_metadata as Record<string, unknown> | undefined);
      const resolved = resolveOAuthProfileNames(hints, sessionUser?.email ?? user.email ?? null);
      firstName = resolved.firstName;
      lastName = resolved.lastName;
    }

    const displayName = `${firstName} ${lastName}`.trim() || firstName || 'Member';
    const sports =
      needsSport && draft.primarySport
        ? capitalizeProfileTags(
            draft.sports.includes(draft.primarySport)
              ? draft.sports
              : [...draft.sports, draft.primarySport],
          )
        : [];

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        username: usernameFinal,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        persona_role: capitalizeProfileTag(draft.personaRole),
        sports,
        primary_sport: needsSport ? capitalizeProfileTag(draft.primarySport) : null,
        interests: [],
        discovery_source: null,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    setSaving(false);
    if (error) {
      if (error.code === '23505') {
        Alert.alert('Username taken', 'That username was just claimed. Go back and choose another.');
      } else if (isAccountGonePostgrestError(error)) {
        await logout();
      } else {
        showSupportError('Could not save profile', 'save your profile');
      }
      return;
    }
    onFinished();
  }, [draft, logout, navigation, needsSport, onFinished, skipNameStep, user]);

  return (
    <StepChrome
      title="Your role"
      subtitle="How do you mainly use Dalton? Athletes and coaches can add their sport on this step."
      stepIndex={stepIndex}
      stepTotal={stepTotal}
      footer={
        <View style={styles.footerRow}>
          <AppleHeroButton
            variant="ghost"
            style={styles.footerHalf}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            Back
          </AppleHeroButton>
          <AppleHeroButton
            disabled={!canNext}
            loading={saving}
            style={styles.footerHalf}
            onPress={() => void saveAndEnter()}
          >
            Continue
          </AppleHeroButton>
        </View>
      }
    >
      <View style={styles.chipGrid}>
        {PERSONA_OPTIONS.map((o) => {
          const on = draft.personaRole === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() =>
                setDraft({
                  personaRole: o.id,
                  primarySport: roleNeedsSport(o.id) ? draft.primarySport : '',
                  sports: roleNeedsSport(o.id) ? draft.sports : [],
                })
              }
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {needsSport ? (
        <View style={styles.sportBlock}>
          <Text style={styles.sportHeading}>{sportStepTitle(draft.personaRole)}</Text>
          <Text style={styles.sportSub}>{sportStepSubtitle(draft.personaRole)}</Text>
          <View style={styles.chipGrid}>
            {SPORT_OPTIONS.map((s) => {
              const on = draft.primarySport === s;
              return (
                <Pressable
                  key={s}
                  onPress={() =>
                    setDraft({
                      primarySport: s,
                      sports: draft.sports.includes(s) ? draft.sports : [...draft.sports, s],
                    })
                  }
                  style={[styles.chip, on && styles.chipPrimary]}
                >
                  <Text style={[styles.chipText, on && styles.chipPrimaryText]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </StepChrome>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={authS.field}>
      <Text style={authS.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DALTON_BOOT_VIDEO_BG },
  scroll: { paddingHorizontal: DS.space.lg, flexGrow: 1 },
  scrollWeb: Platform.OS === 'web' ? { maxWidth: WEB_MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' } : {},
  stepBadge: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: DS.color.gold,
    textTransform: 'uppercase',
    marginBottom: DS.space.sm,
  },
  stepTitle: {
    fontFamily: DS.font.heading,
    fontSize: 28,
    color: DS.color.text,
    letterSpacing: 1,
    marginBottom: DS.space.sm,
  },
  stepSub: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.xl,
  },
  sportBlock: { marginTop: DS.space.xl },
  sportHeading: {
    fontFamily: DS.font.bodyBold,
    fontSize: 16,
    color: DS.color.text,
    marginBottom: DS.space.xs,
  },
  sportSub: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 20,
    marginBottom: DS.space.md,
  },
  footer: {
    paddingHorizontal: DS.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.apple.separator,
    paddingTop: DS.space.md,
    backgroundColor: DALTON_BOOT_VIDEO_BG,
    ...(Platform.OS === 'web'
      ? { maxWidth: WEB_MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }
      : {}),
  },
  footerRow: { flexDirection: 'row', gap: DS.space.md },
  footerHalf: { flex: 1 },
  footerFull: { flex: 1, width: '100%' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.sm },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: DS.space.md,
    borderRadius: DS.apple.radiusButton,
    backgroundColor: DS.apple.fillSecondary,
    borderWidth: 1,
    borderColor: DS.apple.separator,
  },
  chipOn: {
    backgroundColor: DS.color.goldTint10,
    borderColor: DS.color.gold,
  },
  chipText: { fontFamily: DS.font.bodyMedium, fontSize: 15, color: DS.color.text },
  chipTextOn: { color: DS.color.gold },
  chipPrimary: {
    backgroundColor: DS.color.gold,
    borderColor: DS.color.gold,
  },
  chipPrimaryText: {
    color: DS.color.background,
    fontFamily: DS.font.bodyMedium,
  },
});
