import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyTicketToken } from '../booking/ticketToken';
import { DS } from '../designSystem';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EventsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'StaffCheckIn'>;

export function StaffCheckInScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [raw, setRaw] = useState('');

  const validate = () => {
    const token = raw.trim();
    if (!token) {
      Alert.alert('Paste token', 'Scan or paste the attendee QR payload.');
      return;
    }
    void (async () => {
      const res = await verifyTicketToken(token);
      if (!res.ok) {
        Alert.alert('Invalid', res.reason);
        return;
      }
      Alert.alert(
        'Valid ticket',
        `Reference ${res.payload.ref}\nGuest id: ${res.payload.uid}\n(Production: POST to API to record check-in.)`,
      );
    })();
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Staff check-in</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.help}>
          Paste the string encoded in the attendee QR. On site you can replace this with a camera
          scanner in a dev build.
        </Text>
        <TextInput
          style={styles.input}
          value={raw}
          onChangeText={setRaw}
          placeholder="Ticket token…"
          placeholderTextColor={DS.color.textMuted}
          multiline
          autoCapitalize="none"
        />
        <Pressable style={styles.btn} onPress={validate}>
          <Text style={styles.btnTxt}>Validate locally</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  header: {
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  back: { marginBottom: 8 },
  backTxt: { color: DS.color.gold, fontFamily: DS.font.bodyMedium, fontSize: 16 },
  title: { fontFamily: DS.font.heading, fontSize: 28, color: DS.color.text, letterSpacing: 1 },
  body: { padding: DS.space.lg },
  help: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 21,
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
  },
  btnTxt: { fontFamily: DS.font.bodyBold, color: DS.color.background, fontSize: 16 },
});
