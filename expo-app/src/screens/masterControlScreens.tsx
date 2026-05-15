import { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from '../auth/AuthContext';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppButton } from '../components/ui/AppButton';
import { DS } from '../designSystem';
import type { ProfileStackParamList } from '../navigation/types';
import { getSupabase } from '../lib/supabase';
import {
  deleteSubscriptionOfferPage,
  insertSubscriptionOfferPage,
  listProfilesBrief,
  listSubscriptionOfferPages,
} from '../roadmap/liveDataService';
import type { SubscriptionOfferPageRow } from '../roadmap/types';
import { masterDeleteUserAccount, setMasterPin, verifyMasterPin } from '../master/masterControlService';
import { clearMasterGate, isMasterGateUnlocked, setMasterGateUnlocked } from '../master/masterGateStorage';
import { MasterControlRecoverySteps } from '../components/MasterControlRecoverySteps';

type PProps<K extends keyof ProfileStackParamList> = NativeStackScreenProps<ProfileStackParamList, K>;

export function MasterGateScreen({ navigation }: PProps<'MasterGate'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const supabase = getSupabase();
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  /** Apple/Google-only accounts have no password identity — re-verify with email OTP instead. */
  const [gateLoading, setGateLoading] = useState(true);
  const [hasPasswordIdentity, setHasPasswordIdentity] = useState(true);

  const email = user?.email?.trim() ?? '';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) {
        if (!cancelled) {
          setHasPasswordIdentity(true);
          setGateLoading(false);
        }
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const ids = data.user?.identities ?? [];
      const emailIdentity = ids.some((i) => i.provider === 'email');
      setHasPasswordIdentity(emailIdentity);
      if (!emailIdentity && (data.user?.email ?? user?.email ?? '').trim().length > 0) {
        setStep(1);
      } else {
        setStep(0);
      }
      setGateLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.email, user?.id]);

  const runPassword = useCallback(async () => {
    if (!supabase || !email) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      Alert.alert('Password', error.message);
      return;
    }
    setStep(1);
  }, [supabase, email, password]);

  const sendEmailCode = useCallback(async () => {
    if (!supabase || !email) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) Alert.alert('Email code', error.message);
    else Alert.alert('Check email', 'Enter the 6-digit code from your inbox.');
  }, [supabase, email]);

  const verifyEmailCode = useCallback(async () => {
    if (!supabase || !email) return;
    const token = otp.replace(/\D/g, '').trim();
    if (token.length < 6) {
      Alert.alert('Code', 'Enter the 6-digit code from email.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    setBusy(false);
    if (error) {
      Alert.alert('Verification', error.message);
      return;
    }
    setStep(2);
  }, [supabase, email, otp]);

  const verifyPinStep = useCallback(async () => {
    if (!user?.id) return;
    const digits = pin.replace(/\D/g, '').trim();
    if (digits.length !== 6) {
      Alert.alert('PIN', 'Enter your 6-digit master PIN.');
      return;
    }
    setBusy(true);
    const ok = await verifyMasterPin(digits);
    setBusy(false);
    if (!ok) {
      Alert.alert(
        'PIN',
        'Incorrect PIN. Use Master → Change PIN if you have not created one yet.',
      );
      return;
    }
    await setMasterGateUnlocked(user.id);
    navigation.replace('MasterControlHub');
  }, [user?.id, pin, navigation]);

  const leadText = hasPasswordIdentity
    ? 'Three steps: password, email one-time code, then your 6-digit master PIN (stored hashed on the server).'
    : 'Google and Apple sign-in do not use an account password here. Confirm access with a code sent to your email, then enter your 6-digit master PIN.';

  if (gateLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, flex: 1 }]}>
        <ScreenHeader title="Master verification" onBack={() => navigation.goBack()} />
        <View style={styles.loadingGate}>
          <AppLoadingIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Master verification" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>{leadText}</Text>
        <MasterControlRecoverySteps
          style={{ marginBottom: DS.space.lg }}
          includesPasswordGate={hasPasswordIdentity}
        />
        {step === 0 && hasPasswordIdentity ? (
          <View style={styles.card}>
            <Text style={styles.label}>Account password</Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={DS.color.textMuted}
              style={styles.input}
              autoCapitalize="none"
            />
            <AppButton label={busy ? 'Checking…' : 'Continue'} onPress={() => void runPassword()} loading={busy} />
          </View>
        ) : null}
        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.label}>Email code</Text>
            <AppButton
              label={busy ? 'Sending…' : 'Send code to email'}
              onPress={() => void sendEmailCode()}
              variant="secondary"
            />
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="6-digit code"
              placeholderTextColor={DS.color.textMuted}
              keyboardType="number-pad"
              style={[styles.input, { marginTop: DS.space.md }]}
            />
            <AppButton
              label={busy ? 'Verifying…' : 'Verify email'}
              onPress={() => void verifyEmailCode()}
              loading={busy}
            />
          </View>
        ) : null}
        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.label}>Master PIN</Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder="6-digit PIN"
              placeholderTextColor={DS.color.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              style={styles.input}
            />
            <AppButton label={busy ? 'Checking…' : 'Unlock'} onPress={() => void verifyPinStep()} loading={busy} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function MasterControlHubScreen({ navigation }: PProps<'MasterControlHub'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        if (!user?.id || user.masterControl !== true) return;
        const ok = await isMasterGateUnlocked(user.id);
        if (alive && !ok) navigation.replace('MasterGate');
      })();
      return () => {
        alive = false;
      };
    }, [user?.id, user?.masterControl, navigation]),
  );

  if (!user?.masterControl) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Master control" onBack={() => navigation.goBack()} />
        <Text style={[styles.lead, styles.pad]}>This area is restricted.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Master control" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + 40 }]}>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate('MasterPartnerOffers')}>
          <FontAwesome name="building" size={18} color={DS.color.gold} />
          <Text style={styles.menuTxt}>Partner subscription pages</Text>
          <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate('MasterUserAccounts')}>
          <FontAwesome name="users" size={18} color={DS.color.gold} />
          <Text style={styles.menuTxt}>Accounts & deletion</Text>
          <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate('MasterSetPin')}>
          <FontAwesome name="lock" size={18} color={DS.color.gold} />
          <Text style={styles.menuTxt}>Change 6-digit PIN</Text>
          <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.menuRow, { marginTop: DS.space.lg }]}
          onPress={() => {
            void clearMasterGate();
            Alert.alert('Locked', 'Master tools require verification again.');
          }}
        >
          <FontAwesome name="sign-out" size={18} color={DS.color.textMuted} />
          <Text style={[styles.menuTxt, { color: DS.color.textMuted }]}>Lock master session</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function MasterSetPinScreen({ navigation }: PProps<'MasterSetPin'>) {
  const insets = useSafeAreaInsets();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const p1 = a.replace(/\D/g, '');
    const p2 = b.replace(/\D/g, '');
    if (p1.length !== 6 || p2.length !== 6) {
      Alert.alert('PIN', 'Use exactly 6 digits.');
      return;
    }
    if (p1 !== p2) {
      Alert.alert('PIN', 'PINs do not match.');
      return;
    }
    setBusy(true);
    const res = await setMasterPin(p1);
    setBusy(false);
    if (!res.ok) Alert.alert('Could not save', res.message);
    else {
      Alert.alert('Saved', 'Your master PIN is stored securely on the server.');
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Master PIN" onBack={() => navigation.goBack()} />
      <View style={[styles.pad, { gap: DS.space.md }]}>
        <Text style={styles.lead}>Choose a 6-digit PIN for master actions and unlock.</Text>
        <TextInput
          secureTextEntry
          keyboardType="number-pad"
          value={a}
          onChangeText={setA}
          placeholder="PIN"
          placeholderTextColor={DS.color.textMuted}
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          keyboardType="number-pad"
          value={b}
          onChangeText={setB}
          placeholder="Confirm PIN"
          placeholderTextColor={DS.color.textMuted}
          style={styles.input}
        />
        <AppButton label={busy ? 'Saving…' : 'Save PIN'} onPress={() => void save()} loading={busy} />
      </View>
    </View>
  );
}

export function MasterPartnerOffersScreen({ navigation }: PProps<'MasterPartnerOffers'>) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<SubscriptionOfferPageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setRows(await listSubscriptionOfferPages());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Partner pages" onBack={() => navigation.goBack()} />
      <View style={[styles.rowHead, styles.padH]}>
        <Pressable style={styles.plusBtn} onPress={() => navigation.navigate('CreatePartnerOffer')}>
          <FontAwesome name="plus" size={18} color={DS.color.text} />
        </Pressable>
      </View>
      {loading ? (
        <AppLoadingIndicator style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {rows.map((r) => (
            <View key={r.id} style={styles.offerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>{r.business_name}</Text>
                {r.description ? (
                  <Text style={styles.offerSub} numberOfLines={2}>
                    {r.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Delete page?', r.business_name, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () =>
                        void (async () => {
                          const ok = await deleteSubscriptionOfferPage(r.id);
                          if (ok) await reload();
                          else Alert.alert('Could not delete');
                        })(),
                    },
                  ])
                }
              >
                <FontAwesome name="trash" size={18} color={DS.color.textMuted} />
              </Pressable>
            </View>
          ))}
          {!rows.length ? <Text style={[styles.lead, styles.pad]}>No partner pages yet.</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

export function CreatePartnerOfferScreen({ navigation }: PProps<'CreatePartnerOffer'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [hero, setHero] = useState('');
  const [video, setVideo] = useState('');
  const [web, setWeb] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user?.id) return;
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setBusy(true);
    const row = await insertSubscriptionOfferPage({
      created_by: user.id,
      business_name: name,
      description: desc,
      hero_image_url: hero || null,
      video_url: video || null,
      website_url: web || null,
    });
    setBusy(false);
    if (!row) Alert.alert('Could not create');
    else navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="New partner page" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.label}>Business name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={DS.color.textMuted} />
        <Text style={[styles.label, { marginTop: DS.space.md }]}>Description</Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          style={[styles.input, styles.multi]}
          multiline
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={[styles.label, { marginTop: DS.space.md }]}>Hero image URL</Text>
        <TextInput value={hero} onChangeText={setHero} style={styles.input} placeholderTextColor={DS.color.textMuted} />
        <Text style={[styles.label, { marginTop: DS.space.md }]}>Video URL</Text>
        <TextInput value={video} onChangeText={setVideo} style={styles.input} placeholderTextColor={DS.color.textMuted} />
        <Text style={[styles.label, { marginTop: DS.space.md }]}>Website URL</Text>
        <TextInput value={web} onChangeText={setWeb} style={styles.input} placeholderTextColor={DS.color.textMuted} />
        <View style={{ height: DS.space.lg }} />
        <AppButton label={busy ? 'Publishing…' : 'Publish'} onPress={() => void submit()} loading={busy} />
      </ScrollView>
    </View>
  );
}

export function MasterUserAccountsScreen({ navigation }: PProps<'MasterUserAccounts'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Awaited<ReturnType<typeof listProfilesBrief>>>([]);
  const [pinDraft, setPinDraft] = useState('');

  const reload = useCallback(async () => {
    setProfiles(await listProfilesBrief(300));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const promptPinAndDelete = (id: string, label: string) => {
    if (id === user?.id) {
      Alert.alert('Not allowed', 'Use account settings to manage your own session.');
      return;
    }
    if (Platform.OS === 'ios') {
      Alert.prompt('Master PIN', `Deleting ${label}. Enter 6-digit PIN.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: (p) =>
            void (async () => {
              const digits = (p ?? '').replace(/\D/g, '');
              if (digits.length !== 6) return;
              const res = await masterDeleteUserAccount(id, digits);
              if (res.ok) {
                await reload();
                Alert.alert('Removed', 'Account deleted.');
              } else Alert.alert('Failed', res.message ?? '');
            })(),
        },
      ]);
      return;
    }
    Alert.alert(
      'Master PIN',
      `Android: enter PIN in the field below, then delete ${label}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              const digits = pinDraft.replace(/\D/g, '');
              if (digits.length !== 6) return;
              const res = await masterDeleteUserAccount(id, digits);
              if (res.ok) {
                await reload();
                Alert.alert('Removed', 'Account deleted.');
              } else Alert.alert('Failed', res.message ?? '');
            })(),
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Accounts" onBack={() => navigation.goBack()} />
      <Text style={[styles.lead, styles.pad]}>
        Deletes require the Edge Function master-delete-user with SUPABASE_SERVICE_ROLE_KEY set.
      </Text>
      {Platform.OS !== 'ios' ? (
        <View style={[styles.padH, { marginBottom: DS.space.sm }]}>
          <Text style={styles.label}>Master PIN (Android)</Text>
          <TextInput
            value={pinDraft}
            onChangeText={setPinDraft}
            keyboardType="number-pad"
            secureTextEntry
            style={styles.input}
            placeholder="6 digits"
            placeholderTextColor={DS.color.textMuted}
          />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {profiles.map((p) => (
          <Pressable
            key={p.id}
            style={styles.offerRow}
            onPress={() => promptPinAndDelete(p.id, p.display_name ?? p.id.slice(0, 8))}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.offerTitle}>{p.display_name ?? 'Member'}</Text>
              <Text style={styles.offerSub} numberOfLines={1}>
                {p.id}
              </Text>
            </View>
            <FontAwesome name="trash" size={16} color={DS.color.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  loadingGate: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: DS.space.xl },
  pad: { padding: DS.space.lg },
  padH: { paddingHorizontal: DS.space.lg },
  lead: { fontFamily: DS.font.body, fontSize: 14, color: DS.color.textMuted, lineHeight: 21 },
  card: { gap: DS.space.md, marginTop: DS.space.md },
  label: { fontFamily: DS.font.bodyMedium, fontSize: 13, color: DS.color.textMuted },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.cardBorder,
    borderRadius: DS.apple.radiusField,
    padding: 14,
    fontSize: 16,
    color: DS.color.text,
    backgroundColor: DS.apple.fillSecondary,
  },
  multi: { minHeight: 100, textAlignVertical: 'top' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.cardBorder,
  },
  menuTxt: { flex: 1, fontFamily: DS.font.body, fontSize: 16, color: DS.color.text },
  rowHead: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: DS.space.sm },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.apple.fillTertiary,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.cardBorder,
  },
  offerTitle: { fontFamily: DS.font.bodyBold, fontSize: 16, color: DS.color.gold },
  offerSub: { fontFamily: DS.font.body, fontSize: 13, color: DS.color.textMuted, marginTop: 4 },
});
