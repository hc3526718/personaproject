import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
          Demo totals for your flagship session. Replace with Supabase aggregates (tickets sold, free
          RSVPs, check-ins, attendee list).
        </Text>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>128</Text>
            <Text style={styles.statLbl}>Tickets / RSVPs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>42</Text>
            <Text style={styles.statLbl}>Checked in</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>$4.2k</Text>
            <Text style={styles.statLbl}>Gross (demo)</Text>
          </View>
        </View>
        <Text style={styles.section}>Recent sign-ups</Text>
        {['Alex J.', 'Samira K.', 'Jordan P.'].map((n) => (
          <View key={n} style={styles.row}>
            <Text style={styles.rowTxt}>{n}</Text>
            <Text style={styles.rowMeta}>Paid</Text>
          </View>
        ))}
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
    marginBottom: DS.space.xl,
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
  section: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.screenTitle,
    marginBottom: DS.space.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  rowTxt: { fontFamily: DS.font.body, fontSize: 15, color: DS.color.text },
  rowMeta: { fontFamily: DS.font.body, fontSize: 13, color: DS.color.textMuted },
});
