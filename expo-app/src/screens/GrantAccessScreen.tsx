import type { ReactNode } from 'react';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from '../auth/AuthContext';
import { BrandLogoMark } from '../components/BrandLogoMark';
import { DS } from '../designSystem';
import type { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type GrantRoute = RouteProp<AuthStackParamList, 'GrantAccess'>;

/** Sign-up form only. Opened from Welcome hub with `{ startAt: 'signup' }`. */
export default function GrantAccessScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<GrantRoute>();
  const { login, signInWithGoogle, signInWithApple, oAuthBusy } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (route.params?.startAt !== 'signup') {
        navigation.replace('LogIn');
      }
    }, [navigation, route.params?.startAt]),
  );

  const tryEnterApp = useCallback(async () => {
    const ok = await login(email.trim(), password);
    if (ok) return;
    Alert.alert(
      'Demo account',
      `Use ${DEMO_EMAIL} and password: ${DEMO_PASSWORD}`,
    );
  }, [email, password, login]);

  const goWelcome = useCallback(() => {
    navigation.navigate('WelcomeHub');
  }, [navigation]);

  if (route.params?.startAt !== 'signup') {
    return <View style={styles.hold} />;
  }

  const signupScrollPad = {
    paddingBottom: insets.bottom + DS.space.xxl,
  };

  return (
    <View style={[styles.signupRoot, { paddingTop: insets.top }]}>
      <View style={styles.signupHeader}>
        <Pressable onPress={goWelcome} hitSlop={12} style={styles.signupBack}>
          <FontAwesome name="arrow-left" size={22} color={DS.color.text} />
        </Pressable>
        <Text style={styles.signupHeading}>Create Account</Text>
        <View style={styles.signupHeaderSpacer} />
      </View>
      <KeyboardAvoidingView
        style={styles.signupKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.signupScroll, signupScrollPad]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            <BrandLogoMark width={96} height={96} />
          </View>
          <Field label="Email">
            <View style={styles.inputShell}>
              <TextInput
                style={styles.textInput}
                placeholder="athlete@example.com"
                placeholderTextColor={DS.color.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </Field>
          <Field label="Password">
            <View style={styles.inputShellRow}>
              <TextInput
                style={[styles.textInput, styles.textInputFlex]}
                placeholder="••••••••"
                placeholderTextColor={DS.color.textMuted}
                secureTextEntry={!passwordVisible}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setPasswordVisible((v) => !v)} hitSlop={8}>
                <FontAwesome
                  name={passwordVisible ? 'eye-slash' : 'eye'}
                  size={18}
                  color={DS.color.textMuted}
                />
              </Pressable>
            </View>
          </Field>
          <AppleHeroButton variant="ghost" style={{ marginTop: DS.space.lg }} onPress={() => void tryEnterApp()}>
            Continue
          </AppleHeroButton>
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>
          {Platform.OS === 'ios' ? (
            <AppleHeroButton
              variant="social"
              loading={oAuthBusy}
              onPress={() => void signInWithApple()}
              style={styles.socialBtnMargin}
            >
              <View style={styles.socialInner}>
                <FontAwesome5 name="apple" size={20} color={DS.color.text} brand />
                <Text style={styles.socialLabel}>Continue with Apple</Text>
              </View>
            </AppleHeroButton>
          ) : null}
          <AppleHeroButton
            variant="social"
            loading={oAuthBusy}
            onPress={() => void signInWithGoogle()}
            style={styles.socialBtnMargin}
          >
            <View style={styles.socialInner}>
              <FontAwesome5 name="google" size={18} color={DS.color.text} brand />
              <Text style={styles.socialLabel}>Continue with Google</Text>
            </View>
          </AppleHeroButton>
          <View style={styles.loginRow}>
            <Text style={styles.loginMuted}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('LogIn')}>
              <Text style={styles.loginGold}>Log In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hold: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  signupRoot: {
    flex: 1,
    backgroundColor: DS.color.background,
    paddingHorizontal: DS.space.lg,
  },
  signupKeyboard: {
    flex: 1,
  },
  signupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.space.lg,
    paddingTop: DS.space.base,
  },
  signupBack: { width: 40 },
  signupHeaderSpacer: { width: 40 },
  signupHeading: {
    flex: 1,
    fontFamily: DS.font.heading,
    textAlign: 'center',
    fontSize: 26,
    color: DS.color.text,
    letterSpacing: DS.type.headingLetterSpacing,
    marginRight: -8,
  },
  signupScroll: {
    flexGrow: 1,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: DS.space.xl,
  },
  fieldBlock: {
    marginBottom: DS.space.lg,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: DS.type.labelUppercaseSize,
    fontWeight: '700',
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: DS.space.sm,
  },
  inputShell: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInput: {
    fontFamily: DS.font.body,
    fontSize: 16,
    color: DS.color.text,
    padding: 0,
  },
  inputShellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInputFlex: {
    flex: 1,
    marginRight: DS.space.sm,
  },
  socialBtnMargin: {
    marginBottom: DS.space.base,
  },
  socialInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  socialLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    fontWeight: '600',
    color: DS.color.text,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.base,
    marginVertical: DS.space.lg,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: DS.color.border,
    opacity: 0.3,
  },
  orText: {
    fontSize: 14,
    color: DS.color.textMuted,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: DS.space.lg,
  },
  loginMuted: {
    fontFamily: DS.font.body,
    color: DS.color.textMuted,
    fontSize: 15,
  },
  loginGold: {
    fontFamily: DS.font.bodyMedium,
    color: DS.color.gold,
    fontSize: 15,
    fontWeight: '600',
  },
});
