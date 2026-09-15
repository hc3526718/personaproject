import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import type { EventsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'HostEventDashboard'>;

/**
 * Host-facing stats for an event — wire to `bookings` / `events` with RLS when live.
 * Shown to Dalton-verified users with `manage_events` from Admin tools.
 */
export function HostEventDashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Event dashboard" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Host tools for your session. Use check-in to validate Apple Wallet / QR tickets and record
          attendance (you must be the event host).
        </Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('StaffCheckIn', undefined)}
        >
          <Text style={styles.primaryBtnTxt}>Scan / check in guests</Text>
        </Pressable>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>—</Text>
            <Text style={styles.statLbl}>Tickets / RSVPs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>—</Text>
            <Text style={styles.statLbl}>Checked in</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>—</Text>
            <Text style={styles.statLbl}>Live totals</Text>
          </View>
        </View>
        <Text style={styles.hint}>
          Tip: open check-in from a specific event later to enforce event-id matching on Wallet
          tickets.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  body: { padding: DS.space.lg },
  lead: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.lg,
  },
  primaryBtn: {
    backgroundColor: DS.color.gold,
    borderRadius: 10,
    paddingVertical: DS.space.base,
    alignItems: 'center',
    marginBottom: DS.space.xl,
  },
  primaryBtnTxt: {
    fontFamily: DS.font.bodyBold,
    color: DS.color.background,
    fontSize: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.md,
    marginBottom: DS.space.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  statVal: {
    fontFamily: DS.font.heading,
    fontSize: 22,
    color: DS.color.gold,
    letterSpacing: 1,
  },
  statLbl: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  hint: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
  },
});
