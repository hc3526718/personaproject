import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DS } from '../designSystem';
import { openLegalPage } from '../lib/legalUrls';

type Props = {
  /** iOS / Android App Store auto-renewal disclosure. */
  showAutoRenewal?: boolean;
  /** Web Stripe checkout footnote instead of App Store copy. */
  stripeWeb?: boolean;
  /** Note that RevenueCat paywall template includes legal links when the sheet opens. */
  revenueCatSheetNote?: boolean;
};

const IOS_AUTO_RENEWAL =
  'Payment is charged to your Apple ID account at confirmation of purchase. The subscription renews automatically each month unless cancelled at least 24 hours before the end of the current period. Renewal is charged within 24 hours prior to the end of the current period. Manage or cancel anytime in iOS Settings → Subscriptions.';

const ANDROID_AUTO_RENEWAL =
  'Payment is charged to your Google Play account at confirmation of purchase. The subscription renews automatically each month unless cancelled before the renewal date. Manage or cancel anytime in Google Play → Subscriptions.';

export function SubscriptionLegalFooter({
  showAutoRenewal = Platform.OS !== 'web',
  stripeWeb = Platform.OS === 'web',
  revenueCatSheetNote = Platform.OS !== 'web',
}: Props) {
  const autoRenewalText =
    Platform.OS === 'android' ? ANDROID_AUTO_RENEWAL : IOS_AUTO_RENEWAL;

  return (
    <View style={styles.root}>
      {showAutoRenewal && !stripeWeb ? (
        <Text style={styles.disclosure}>{autoRenewalText}</Text>
      ) : null}
      {stripeWeb ? (
        <Text style={styles.disclosure}>
          You will complete payment on Stripe. Taxes and the final price are shown before you pay. Your subscription
          renews monthly until cancelled in the Stripe customer portal.
        </Text>
      ) : null}
      {revenueCatSheetNote && !stripeWeb ? (
        <Text style={styles.hint}>
          Privacy Policy and Terms links also appear on the App Store subscription sheet when you tap Subscribe.
        </Text>
      ) : null}
      <View style={styles.linkRow}>
        <Pressable accessibilityRole="link" onPress={() => void openLegalPage('/privacy')}>
          <Text style={styles.link}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.sep}>·</Text>
        <Pressable accessibilityRole="link" onPress={() => void openLegalPage('/terms')}>
          <Text style={styles.link}>Terms of Service</Text>
        </Pressable>
        <Text style={styles.sep}>·</Text>
        <Pressable accessibilityRole="link" onPress={() => void openLegalPage('/cookie-policy')}>
          <Text style={styles.link}>Cookie Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: DS.space.lg, gap: DS.space.sm },
  disclosure: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  hint: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    fontStyle: 'italic',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: DS.space.sm,
    flexWrap: 'wrap',
  },
  link: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.gold,
    textDecorationLine: 'underline',
  },
  sep: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
  },
});
