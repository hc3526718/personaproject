import { Platform, type ViewStyle } from 'react-native';

/** Max width for primary content on Expo web — matches mobile-first column on large screens. */
export const WEB_MAX_CONTENT_WIDTH = 520;

export function isExpoWeb(): boolean {
  return Platform.OS === 'web';
}

export function webContentShellStyle(): ViewStyle {
  if (!isExpoWeb()) return {};
  return {
    width: '100%',
    maxWidth: WEB_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  };
}

export function webFeedColumnStyle(): ViewStyle {
  if (!isExpoWeb()) return { flex: 1 };
  return {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  };
}
