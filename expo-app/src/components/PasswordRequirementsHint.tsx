import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { validateSignupPassword } from '../auth/passwordValidation';
import { DS } from '../designSystem';

type Props = {
  password: string;
};

const RULES = [
  { key: 'lowercase' as const, label: 'Lowercase letter' },
  { key: 'uppercase' as const, label: 'Uppercase letter' },
  { key: 'digit' as const, label: 'Digit' },
];

/** Live checklist for Supabase password strength rules. */
export function PasswordRequirementsHint({ password }: Props) {
  if (!password) return null;
  const validation = validateSignupPassword(password);

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.title}>Password requirements</Text>
      <Text style={styles.sub}>
        Lowercase, uppercase letters and digits. Passwords missing any of these are rejected as weak.
      </Text>
      {RULES.map((rule) => {
        const met = !validation.missing.includes(rule.key);
        return (
          <View key={rule.key} style={styles.row}>
            <FontAwesome
              name={met ? 'check-circle' : 'circle-o'}
              size={14}
              color={met ? DS.color.gold : DS.color.textMuted}
            />
            <Text style={[styles.rule, met && styles.ruleMet]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: DS.space.sm,
    marginBottom: DS.space.md,
    padding: DS.space.md,
    borderRadius: DS.radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  title: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sub: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 17,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rule: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
  },
  ruleMet: {
    color: DS.color.text,
  },
});
