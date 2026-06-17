import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { MfaEnrolledNoticeModal } from '../components/MfaEnrolledNoticeModal';
import { DS } from '../designSystem';
import type { ProfileStackParamList } from '../navigation/types';
import {
  MFA_APP_LABEL,
  completeTotpEnrollment,
  fetchTotpFactors,
  startTotpEnrollment,
  type TotpEnrollStart,
} from '../auth/mfaService';
import { isStaffAccount } from '../auth/staffAccess';
import { useAuth } from '../auth/AuthContext';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { copyTextToClipboard } from '../lib/clipboard';

const QR_DISPLAY_SIZE = 140;

type Props = NativeStackScreenProps<ProfileStackParamList, 'MfaEnroll'>;

export function MfaEnrollScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useAccessibility();
  const [loading, setLoading] = useState(true);
  const [secretCopied, setSecretCopied] = useState(false);
  const [enroll, setEnroll] = useState<TotpEnrollStart | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const factors = await fetchTotpFactors();
    if (factors.length > 0) {
      setAlreadyEnrolled(true);
      setEnroll(null);
      setLoading(false);
      return;
    }
    if (startedRef.current && enroll) {
      setLoading(false);
      return;
    }
    const started = await startTotpEnrollment();
    setLoading(false);
    if (!started.ok) {
      Alert.alert('MFA setup', started.message);
      navigation.goBack();
      return;
    }
    startedRef.current = true;
    setEnroll(started.enroll);
  }, [enroll, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || user.id.startsWith('demo-')) {
        Alert.alert('Sign in required', 'MFA enrollment works for live accounts only.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return undefined;
      }
      if (!isStaffAccount(user)) {
        Alert.alert(
          'Staff only',
          'Two-factor authentication enrollment is for master and staff accounts.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
        return undefined;
      }
      void load();
      return undefined;
    }, [load, navigation, user]),
  );

  const finishEnrollment = () => {
    setNoticeVisible(false);
    navigation.goBack();
  };

  const copySecret = async () => {
    if (!enroll?.secret) return;
    const ok = await copyTextToClipboard(enroll.secret);
    if (ok) {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
      return;
    }
    Alert.alert('Copy', 'Could not copy automatically. Long-press the secret key to select it.');
  };

  const submit = async () => {
    if (!enroll || busy) return;
    setBusy(true);
    const result = await completeTotpEnrollment(enroll.factorId, code);
    setBusy(false);
    if (!result.ok) {
      Alert.alert('Verification failed', result.message);
      return;
    }
    setNoticeVisible(true);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Authenticator app" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isStaffAccount(user) && !alreadyEnrolled && !loading ? (
          <View style={styles.banner}>
            <FontAwesome name="shield" size={18} color={DS.color.gold} />
            <Text style={styles.bannerText}>
              Master and staff accounts should use two-factor authentication. We recommend setting it
              up to protect Master Control — you can also do this later in Settings → Security.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <AppLoadingIndicator size={32} />
        ) : alreadyEnrolled ? (
          <View style={styles.card}>
            <Text style={styles.title}>Already enrolled</Text>
            <Text style={styles.body}>
              This account has an authenticator app linked as{' '}
              <Text style={styles.strong}>{MFA_APP_LABEL}</Text>. You will be asked for a code when
              you sign in.
            </Text>
          </View>
        ) : enroll ? (
          <>
            <Text style={styles.body}>
              Scan the QR code with your authenticator app, or add the account manually using the
              steps below.
            </Text>
            <View style={styles.qrFrame}>
              <View style={styles.qrInner}>
                <SvgXml xml={enroll.qrSvg} width={QR_DISPLAY_SIZE} height={QR_DISPLAY_SIZE} />
              </View>
            </View>

            <View style={[styles.manualCard, { borderColor: colors.borderHairline }]}>
              <Text style={[styles.manualTitle, { color: colors.textOnLight }]}>Manual setup</Text>
              <Text style={[styles.manualStep, { color: colors.textOnLight }]}>1. Open your authenticator app.</Text>
              <Text style={[styles.manualStep, { color: colors.textOnLight }]}>
                2. Choose <Text style={[styles.strong, { color: colors.textOnLight }]}>Other</Text> (or equivalent).
              </Text>
              <Text style={[styles.manualStep, { color: colors.textOnLight }]}>
                3. Account name: <Text style={[styles.strong, { color: colors.textOnLight }]}>{MFA_APP_LABEL}</Text>
              </Text>
              <Text style={[styles.manualStep, { color: colors.textOnLight }]}>
                4. Secret key:{' '}
                <Pressable
                  onPress={() => void copySecret()}
                  accessibilityRole="button"
                  accessibilityLabel="Copy secret key"
                >
                  <Text selectable style={[styles.secretInline, { color: colors.textOnLight }]}>
                    {enroll.secret}
                  </Text>
                </Pressable>
              </Text>
              <Text style={[styles.copyHint, { color: colors.textOnLight }]}>
                {secretCopied ? 'Copied to clipboard' : 'Tap the secret key to copy'}
              </Text>
              <Text style={[styles.manualStep, { color: colors.textOnLight }]}>
                5. Press Finish / Save in your authenticator app.
              </Text>
              <Text style={[styles.manualStep, { color: colors.textOnLight }]}>
                6. When completed, press Continue below and enter your 6-digit code.
              </Text>
            </View>

            <Text style={styles.label}>Enter your 6-digit code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor={DS.color.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete={Platform.OS === 'web' ? 'one-time-code' : undefined}
            />
            <AppleHeroButton loading={busy} onPress={() => void submit()}>
              Continue
            </AppleHeroButton>
          </>
        ) : null}

        <Pressable style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>

      <MfaEnrolledNoticeModal visible={noticeVisible} onContinue={finishEnrollment} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  pad: { padding: DS.space.lg, gap: DS.space.md },
  banner: {
    flexDirection: 'row',
    gap: DS.space.sm,
    padding: DS.space.md,
    borderRadius: DS.apple.radiusCard,
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 75, 0.45)',
    backgroundColor: 'rgba(200, 168, 75, 0.1)',
    alignItems: 'flex-start',
  },
  bannerText: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
    lineHeight: 20,
  },
  card: {
    padding: DS.space.lg,
    borderRadius: DS.apple.radiusCard,
    backgroundColor: DS.color.panel,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
  },
  title: {
    fontFamily: DS.font.bodyBold,
    fontSize: 17,
    color: DS.color.text,
    marginBottom: DS.space.sm,
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    lineHeight: 22,
  },
  strong: {
    fontFamily: DS.font.bodyBold,
    color: DS.color.text,
  },
  qrFrame: {
    alignSelf: 'center',
    padding: DS.space.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  qrInner: {
    width: QR_DISPLAY_SIZE,
    height: QR_DISPLAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyHint: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 2,
  },
  manualCard: {
    padding: DS.space.md,
    borderRadius: DS.apple.radiusCard,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    gap: DS.space.xs,
  },
  manualTitle: {
    fontFamily: DS.font.bodyBold,
    fontSize: 15,
    color: DS.color.text,
    marginBottom: DS.space.xs,
  },
  manualStep: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 20,
  },
  secretInline: {
    fontFamily: DS.font.bodyMedium,
    color: DS.color.text,
    letterSpacing: 1,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
    marginTop: DS.space.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    borderRadius: DS.apple.radiusField,
    paddingHorizontal: DS.space.md,
    paddingVertical: 12,
    fontFamily: DS.font.body,
    fontSize: 18,
    color: DS.color.text,
    letterSpacing: 4,
    textAlign: 'center',
  },
  cancel: { alignSelf: 'center', marginTop: DS.space.md, padding: DS.space.sm },
  cancelText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.textMuted,
    textDecorationLine: 'underline',
  },
});
