import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { hostCheckInByReference, verifyTicketTokenOnServer } from '../booking/hostCheckIn';
import { verifyTicketToken } from '../booking/ticketToken';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import type { EventsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'StaffCheckIn'>;

export function StaffCheckInScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const expectedEventId = route.params?.eventId;
  const eventTitle = route.params?.eventTitle;
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const validate = () => {
    const token = raw.trim();
    if (!token) {
      Alert.alert('Paste token', 'Scan or paste the attendee Apple Wallet / QR payload.');
      return;
    }
    void (async () => {
      setBusy(true);
      setLastResult(null);
      try {
        let payloadRef: string | undefined;
        let payloadEventId: string | undefined;
        let verifiedVia: 'server' | 'local' = 'server';

        const server = await verifyTicketTokenOnServer(token);
        if (server.ok) {
          payloadRef = server.payload.ref;
          payloadEventId = server.payload.eventId;
        } else {
          // Offline / misconfig fallback — local HMAC (demo secret); prefer server in prod.
          const local = await verifyTicketToken(token);
          if (!local.ok) {
            Alert.alert('Invalid ticket', server.reason || local.reason);
            setLastResult(`Rejected: ${server.reason || local.reason}`);
            return;
          }
          verifiedVia = 'local';
          payloadRef = local.payload.ref;
          payloadEventId = local.payload.eventId;
        }

        if (expectedEventId && payloadEventId && payloadEventId !== expectedEventId) {
          Alert.alert(
            'Wrong event',
            'This Apple Wallet / QR ticket is for a different Dalton event.',
          );
          setLastResult('Rejected: ticket event mismatch');
          return;
        }

        if (!payloadRef) {
          Alert.alert('Invalid', 'Ticket has no booking reference.');
          return;
        }

        const checkIn = await hostCheckInByReference(payloadRef);
        if (!checkIn.ok) {
          Alert.alert(
            'Check-in failed',
            checkIn.reason === 'not_event_host'
              ? 'You must be the event host (or master) to check guests in.'
              : checkIn.reason || 'Could not record check-in.',
          );
          setLastResult(`Failed: ${checkIn.reason || 'unknown'}`);
          return;
        }

        const title = checkIn.title || eventTitle || 'Event';
        const msg = checkIn.already_checked_in
          ? `Already checked in for ${title}.\nRef ${payloadRef}`
          : `Checked in for ${title}.\nRef ${payloadRef}\nVerified via ${verifiedVia}.`;
        Alert.alert(checkIn.already_checked_in ? 'Already in' : 'Valid ticket', msg);
        setLastResult(msg);
        setRaw('');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Staff check-in" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.help}>
          Paste the QR string from the attendee&apos;s Apple Wallet pass (or in-app QR). We verify the
          signature on the server, confirm it matches{expectedEventId ? ' this event' : ' a Dalton event'},
          then record check-in.
        </Text>
        {eventTitle ? (
          <Text style={styles.eventLine}>Scanning for: {eventTitle}</Text>
        ) : null}
        <TextInput
          style={styles.input}
          value={raw}
          onChangeText={setRaw}
          placeholder="Ticket token from Wallet / QR…"
          placeholderTextColor={DS.color.textMuted}
          multiline
          autoCapitalize="none"
          editable={!busy}
        />
        <Pressable
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={validate}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={DS.color.background} />
          ) : (
            <Text style={styles.btnTxt}>Verify &amp; check in</Text>
          )}
        </Pressable>
        <Text style={styles.cameraNote}>
          Camera scanning needs a native rebuild with a barcode scanner module. Paste works for Wallet
          QR payloads today.
        </Text>
        {lastResult ? <Text style={styles.result}>{lastResult}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  body: { padding: DS.space.lg },
  help: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 21,
    marginBottom: DS.space.md,
  },
  eventLine: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.gold,
    marginBottom: DS.space.lg,
  },
  input: {
    minHeight: 120,
    backgroundColor: DS.color.input,
    borderRadius: 12,
    padding: DS.space.md,
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.text,
    textAlignVertical: 'top',
    marginBottom: DS.space.lg,
  },
  btn: {
    backgroundColor: DS.color.gold,
    paddingVertical: DS.space.base,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnTxt: { fontFamily: DS.font.bodyBold, color: DS.color.background, fontSize: 16 },
  cameraNote: {
    marginTop: DS.space.lg,
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
  },
  result: {
    marginTop: DS.space.lg,
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.screenTitle,
    lineHeight: 20,
  },
});
