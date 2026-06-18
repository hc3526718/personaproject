import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DS } from '../designSystem';
import { openLegalPage } from '../lib/legalUrls';

const STORAGE_KEY = 'dga_cookie_consent_v1';

function readConsent(): boolean {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'accepted';
  } catch {
    return true;
  }
}

function saveConsent(): void {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, 'accepted');
  } catch {
    /* private mode */
  }
}

/** UK PECR / GDPR — essential cookies only until user accepts. Web only. */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setVisible(!readConsent());
  }, []);

  if (Platform.OS !== 'web' || !visible) return null;

  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Text style={styles.text}>
        We use essential cookies to keep you signed in and secure the app. See our{' '}
        <Text style={styles.link} onPress={() => void openLegalPage('/cookie-policy')}>
          Cookie Policy
        </Text>{' '}
        and{' '}
        <Text style={styles.link} onPress={() => void openLegalPage('/privacy')}>
          Privacy Policy
        </Text>
        .
      </Text>
      <Pressable
        accessibilityRole="button"
        style={styles.btn}
        onPress={() => {
          saveConsent();
          setVisible(false);
        }}
      >
        <Text style={styles.btnText}>Accept</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: DS.space.md,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    backgroundColor: 'rgba(10, 10, 10, 0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderHairline,
  },
  text: {
    flex: 1,
    minWidth: 220,
    fontFamily: DS.font.body,
    fontSize: 12,
    lineHeight: 18,
    color: DS.color.textMuted,
  },
  link: {
    color: DS.color.gold,
    textDecorationLine: 'underline',
  },
  btn: {
    backgroundColor: DS.color.gold,
    paddingHorizontal: DS.space.lg,
    paddingVertical: 10,
    borderRadius: DS.apple.radiusButton,
  },
  btnText: {
    fontFamily: DS.font.bodyBold,
    fontSize: 14,
    color: DS.color.background,
  },
});
