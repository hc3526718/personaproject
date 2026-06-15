import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
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
import type { AuthStackParamList } from '../navigation/types';
import { AuthWebBackBar } from '../components/AuthWebBackBar';
import { authBackHandler } from '../lib/authNavigation';
import { AuthFormField, authScreenSharedStyles as S } from './onboardingScreens';

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type GrantRoute = RouteProp<AuthStackParamList, 'GrantAccess'>;

/** Sign-up form only. Opened from Welcome hub with `{ startAt: 'signup' }`. */
export default function GrantAccessScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<GrantRoute>();
  const { login, signUp } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupConfirmEmail, setSignupConfirmEmail] = useState<string | null>(null);

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
    if (isSupabaseConfigured()) {
      const result = await signUp(trimmed, password);
      if (!result.ok) {
        Alert.alert('Create account', result.message);
        return;
      }
      if (result.needsEmailConfirmation) {
        setSignupConfirmEmail(trimmed);
        Alert.alert(
          'Confirm your email',
            `We sent a confirmation link to ${trimmed}. Open it on this device — you'll land on our website to confirm, then return to the app and tap "I've confirmed — continue" below.`,
        );
        return;
      }
      setSignupConfirmEmail(null);
    }
    const loginResult = await login(trimmed, password);
    if (loginResult.ok) return;
    if (loginResult.reason === 'email_not_confirmed') {
      setSignupConfirmEmail(trimmed);
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
  }, [email, password, confirmPassword, login, signUp]);

  const dismissConfirmBanner = useCallback(() => {
    setSignupConfirmEmail(null);
  }, []);

  const tryContinueAfterEmailConfirm = useCallback(async () => {
    const trimmed = (signupConfirmEmail ?? email).trim();
    if (!trimmed || !password) {
      Alert.alert('Missing details', 'Enter the same email and password you used to sign up.');
      return;
    }
    const loginResult = await login(trimmed, password);
    if (loginResult.ok) {
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
      <AuthWebBackBar />
      <ScreenHeader
        title="Create Account"
        onBack={Platform.OS === 'web' ? undefined : authBackHandler(navigation, goWelcome)}
      />
      <ScrollView
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
              <Text style={local.confirmBannerEm}>{signupConfirmEmail}</Text>. Open it on this phone
              — you&apos;ll see an &quot;Email confirmed&quot; page on daltongrantacademy.uk, then
              return here and tap the button below.
            </Text>
            <AppleHeroButton onPress={() => void tryContinueAfterEmailConfirm()}>
              I&apos;ve confirmed — continue
            </AppleHeroButton>
            <Pressable onPress={dismissConfirmBanner} hitSlop={10} style={{ marginTop: DS.space.sm }}>
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
        <AppleHeroButton style={{ marginTop: DS.space.sm }} onPress={() => void tryCreateAccount()}>
          Sign Up
        </AppleHeroButton>
        <AuthSocialSignIn />
        <View style={S.footerRow}>
          <Text style={S.muted}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('LogIn')}>
            <Text style={S.gold}>Log In</Text>
          </Pressable>
        </View>
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
});
