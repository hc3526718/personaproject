import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  Alert,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollView as ScrollViewType,
} from 'react-native';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import {
  signupPasswordErrorMessage,
  validateSignupPassword,
} from '../auth/passwordValidation';
import { AuthSocialSignIn } from '../components/AuthSocialSignIn';
import { AuthWelcomeRiveHero } from '../components/AuthWelcomeRiveHero';
import { PasswordRequirementsHint } from '../components/PasswordRequirementsHint';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DS } from '../designSystem';
import { isSupabaseConfigured } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { safeGetSession } from '../auth/authSessionRecovery';
import { withTimeout } from '../lib/withTimeout';
import {
  clearSignupPendingEmail,
  readSignupPendingEmail,
  saveSignupPendingEmail,
} from '../auth/signupPendingStorage';
import type { AuthStackParamList } from '../navigation/types';
import { AuthFlowBlockingOverlay } from '../components/AuthFlowBlockingOverlay';
import { AuthWebBackBar } from '../components/AuthWebBackBar';
import { AuthLegalFooter } from '../components/AuthLegalFooter';
import { authBackHandler } from '../lib/authNavigation';
import { AuthFormField, authScreenSharedStyles as S } from './onboardingScreens';

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type GrantRoute = RouteProp<AuthStackParamList, 'GrantAccess'>;

/** Sign-up form only. Opened from Welcome hub with `{ startAt: 'signup' }`. */
export default function GrantAccessScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<GrantRoute>();
  const { login, signUp, resendSignupConfirmation } = useAuth();
  const scrollRef = useRef<ScrollViewType>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [signupConfirmEmail, setSignupConfirmEmail] = useState<string | null>(null);
  const [continueBusy, setContinueBusy] = useState(false);
  const [signupBusy, setSignupBusy] = useState(false);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const showPendingBanner = useCallback(
    (pendingEmail: string) => {
      setSignupConfirmEmail(pendingEmail);
      void saveSignupPendingEmail(pendingEmail);
      requestAnimationFrame(() => {
        scrollToTop();
      });
    },
    [scrollToTop],
  );

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const pending = await readSignupPendingEmail();
        if (pending) {
          setSignupConfirmEmail((prev) => prev ?? pending);
          if (!email.trim()) setEmail(pending);
        }
        const supabase = getSupabase();
        if (!supabase) return;
        const session = await safeGetSession(supabase);
        if (session?.user?.email_confirmed_at || session?.user?.confirmed_at) {
          await clearSignupPendingEmail();
          setSignupConfirmEmail(null);
        }
      })();
    }, [email]),
  );

  useFocusEffect(
    useCallback(() => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        void (async () => {
          const supabase = getSupabase();
          if (!supabase) return;
          const session = await safeGetSession(supabase);
          if (session?.user) {
            await clearSignupPendingEmail();
            setSignupConfirmEmail(null);
          }
        })();
      });
      return () => sub.remove();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.startAt !== 'signup') {
        navigation.replace('LogIn');
      }
    }, [navigation, route.params?.startAt]),
  );

  const tryCreateAccount = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    const strength = validateSignupPassword(password);
    if (!strength.ok) {
      Alert.alert('Weak password', signupPasswordErrorMessage(strength));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password', 'Passwords do not match.');
      return;
    }
    scrollToTop();
    Keyboard.dismiss();
    setSignupBusy(true);
    try {
      if (isSupabaseConfigured()) {
        const result = await signUp(trimmed, password);
        if (!result.ok) {
          Alert.alert('Create account', result.message);
          return;
        }
        if (result.needsEmailConfirmation) {
          showPendingBanner(trimmed);
          Alert.alert(
            'Confirm your email',
            Platform.OS === 'web'
              ? `We sent a confirmation link to ${trimmed}. Open it on this device — you'll land on our website to confirm, then return to the app and tap "I've confirmed — continue" below.`
              : `We sent a confirmation link to ${trimmed}. Open it on this device — you'll see an Email confirmed page on daltongrantacademy.uk, then return here and tap "I've confirmed — continue" below.`,
          );
          return;
        }
        setSignupConfirmEmail(null);
        void clearSignupPendingEmail();
      }
      const loginResult = await login(trimmed, password);
      if (loginResult.ok) return;
      if (loginResult.reason === 'email_not_confirmed') {
        showPendingBanner(trimmed);
        Alert.alert(
          'Confirm your email',
          `Please confirm your account using the link we sent to ${trimmed} before logging in.`,
        );
        return;
      }
      Alert.alert(
        'Could not finish sign-up',
        'Please check your details and internet connection. If you already have an account, use Log In.',
      );
    } finally {
      setSignupBusy(false);
    }
  }, [email, password, confirmPassword, login, scrollToTop, showPendingBanner, signUp]);

  const dismissConfirmBanner = useCallback(() => {
    setSignupConfirmEmail(null);
    void clearSignupPendingEmail();
  }, []);

  const resendConfirmationEmail = useCallback(async () => {
    const trimmed = (signupConfirmEmail ?? email).trim();
    if (!trimmed) {
      Alert.alert('Email required', 'Enter the email you used to sign up.');
      return;
    }
    setResendBusy(true);
    const result = await resendSignupConfirmation(trimmed);
    setResendBusy(false);
    if (!result.ok) {
      Alert.alert('Could not resend', result.message);
      return;
    }
    Alert.alert(
      'Email sent',
      `We sent a new confirmation link to ${trimmed}. Open it on this device and tap Confirm email.`,
    );
  }, [email, resendSignupConfirmation, signupConfirmEmail]);

  const tryContinueAfterEmailConfirm = useCallback(async () => {
    const trimmed = (signupConfirmEmail ?? email).trim();
    if (!trimmed || !password) {
      Alert.alert('Missing details', 'Enter the same email and password you used to sign up.');
      return;
    }
    setContinueBusy(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const session = await withTimeout(safeGetSession(supabase), {
          ms: 12000,
          timeoutMessage: 'Could not check your session. Please try again.',
        });
        if (session?.user) {
          await clearSignupPendingEmail();
          setSignupConfirmEmail(null);
          return;
        }
      }
      const loginResult = await withTimeout(login(trimmed, password), {
        ms: 15000,
        timeoutMessage: 'Could not continue right now. Check your connection and try again.',
      });
      if (loginResult.ok) {
        await clearSignupPendingEmail();
        setSignupConfirmEmail(null);
        return;
      }
      if (loginResult.reason === 'email_not_confirmed') {
        Alert.alert(
          'Not confirmed yet',
          `Open the link in the email we sent to ${trimmed} on this device, then try again.`,
        );
        return;
      }
      Alert.alert(
        'Could not continue',
        'Check your email and password. If you already confirmed, wait a moment and try again.',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Could not continue', msg);
    } finally {
      setContinueBusy(false);
    }
  }, [email, login, password, signupConfirmEmail]);

  const goWelcome = useCallback(() => {
    navigation.navigate('WelcomeHub');
  }, [navigation]);

  const showConfirmField = password.length > 0;
  const passwordsMismatch =
    showConfirmField && confirmPassword.length > 0 && password !== confirmPassword;

  if (route.params?.startAt !== 'signup') {
    return <View style={local.hold} />;
  }

  return (
    <KeyboardAvoidingView style={local.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthFlowBlockingOverlay
        visible={signupBusy || continueBusy}
        message={continueBusy ? 'Checking your confirmation…' : 'Creating your account…'}
      />
      <AuthWebBackBar />
      <ScreenHeader
        title="Create Account"
        onBack={Platform.OS === 'web' ? undefined : authBackHandler(navigation, goWelcome)}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[S.scrollPad, S.scrollPadCompact, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={S.loginLogoRow}>
          <AuthWelcomeRiveHero variant="form" />
        </View>
        {signupConfirmEmail ? (
          <View style={local.confirmBanner}>
            <Text style={local.confirmBannerTitle}>Check your email</Text>
            <Text style={local.confirmBannerBody}>
              We sent a confirmation link to{' '}
              <Text style={local.confirmBannerEm}>{signupConfirmEmail}</Text>.
              {Platform.OS === 'web'
                ? ' Open it on this device, confirm on daltongrantacademy.uk, then return here and tap the button below.'
                : ' Open the link on this device, confirm on daltongrantacademy.uk, then return here and tap the button below.'}
            </Text>
            <AppleHeroButton
              loading={continueBusy}
              onPress={() => void tryContinueAfterEmailConfirm()}
            >
              I&apos;ve confirmed — continue
            </AppleHeroButton>
            <Pressable
              onPress={() => void resendConfirmationEmail()}
              disabled={resendBusy}
              hitSlop={10}
              style={{ marginTop: DS.space.sm, alignSelf: 'center' }}
            >
              <Text style={local.confirmBannerDismiss}>
                {resendBusy ? 'Sending…' : 'Resend confirmation email'}
              </Text>
            </Pressable>
            <Pressable onPress={dismissConfirmBanner} hitSlop={10} style={{ marginTop: DS.space.xs }}>
              <Text style={local.confirmBannerDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}
        <AuthFormField label="Email">
          <TextInput
            style={S.inputCompact}
            placeholder="athlete@example.com"
            placeholderTextColor={DS.color.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </AuthFormField>
        <AuthFormField label="Password">
          <View style={S.inputRow}>
            <TextInput
              style={[S.inputCompact, S.inputFlex]}
              placeholder="••••••••"
              placeholderTextColor={DS.color.textMuted}
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setPasswordVisible((v) => !v)} hitSlop={8}>
              <FontAwesome
                name={passwordVisible ? 'eye-slash' : 'eye'}
                size={18}
                color={DS.color.textMuted}
              />
            </Pressable>
          </View>
        </AuthFormField>
        <PasswordRequirementsHint password={password} />
        {showConfirmField ? (
          <AuthFormField label="Confirm password">
            <View style={S.inputRow}>
              <TextInput
                style={[S.inputCompact, S.inputFlex, passwordsMismatch && local.inputMismatch]}
                placeholder="Repeat password"
                placeholderTextColor={DS.color.textMuted}
                secureTextEntry={!confirmVisible}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setConfirmVisible((v) => !v)} hitSlop={8}>
                <FontAwesome
                  name={confirmVisible ? 'eye-slash' : 'eye'}
                  size={18}
                  color={DS.color.textMuted}
                />
              </Pressable>
            </View>
            {passwordsMismatch ? (
              <Text style={local.mismatchHint}>Passwords do not match.</Text>
            ) : null}
          </AuthFormField>
        ) : null}
        <AppleHeroButton
          style={{ marginTop: DS.space.sm }}
          loading={signupBusy}
          onPress={() => void tryCreateAccount()}
        >
          Sign Up
        </AppleHeroButton>
        <AuthSocialSignIn />
        <View style={S.footerRow}>
          <Text style={S.muted}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('LogIn')}>
            <Text style={S.gold}>Log In</Text>
          </Pressable>
        </View>
        <Pressable style={local.resetLink} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={S.gold}>Reset password</Text>
        </Pressable>
        <AuthLegalFooter />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const local = StyleSheet.create({
  hold: {
    flex: 1,
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
  root: {
    flex: 1,
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
  inputMismatch: {
    borderWidth: 1,
    borderColor: 'rgba(220, 80, 80, 0.65)',
  },
  mismatchHint: {
    marginTop: 6,
    fontFamily: DS.font.body,
    fontSize: 12,
    color: '#e07070',
  },
  confirmBanner: {
    marginBottom: DS.space.md,
    padding: DS.space.md,
    borderRadius: DS.apple.radiusCard,
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 75, 0.45)',
    backgroundColor: 'rgba(200, 168, 75, 0.12)',
    gap: DS.space.sm,
  },
  confirmBannerTitle: {
    fontFamily: DS.font.bodyBold,
    fontSize: 15,
    color: DS.color.gold,
  },
  confirmBannerBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
    lineHeight: 21,
  },
  confirmBannerEm: {
    fontFamily: DS.font.bodyBold,
    color: DS.color.text,
  },
  confirmBannerDismiss: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.textMuted,
    textDecorationLine: 'underline',
  },
  resetLink: {
    alignSelf: 'center',
    marginTop: DS.space.md,
    paddingVertical: DS.space.xs,
  },
});
