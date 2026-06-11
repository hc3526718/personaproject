import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { DS } from '../designSystem';
import {
  EVENT_IN_PERSON_PAYMENT_TITLE,
  EVENT_PLATFORM_PAYMENT_DISCLAIMER,
} from '../lib/eventEntryPayment';

type Props = {
  hostNotice?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function EventInPersonPaymentBanner({ hostNotice, compact, style }: Props) {
  const hostLine = hostNotice?.trim() || null;

  if (compact) {
    return (
      <Text style={[styles.compact, style]}>
        {EVENT_PLATFORM_PAYMENT_DISCLAIMER}
        {hostLine ? `\n\n${hostLine}` : ''}
      </Text>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <FontAwesome name="handshake-o" size={18} color={DS.color.gold} style={styles.icon} />
      <View style={styles.copy}>
        <Text style={styles.title}>{EVENT_IN_PERSON_PAYMENT_TITLE}</Text>
        <Text style={styles.body}>{EVENT_PLATFORM_PAYMENT_DISCLAIMER}</Text>
        {hostLine ? <Text style={styles.host}>{hostLine}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.space.sm,
    padding: DS.space.md,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.color.goldTint10,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
  },
  icon: { marginTop: 2 },
  copy: { flex: 1 },
  title: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: DS.color.gold,
    marginBottom: 6,
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 14,
    lineHeight: 20,
    color: DS.color.text,
  },
  host: {
    marginTop: 8,
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: DS.color.text,
  },
  compact: {
    fontFamily: DS.font.body,
    fontSize: 13,
    lineHeight: 18,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
});
