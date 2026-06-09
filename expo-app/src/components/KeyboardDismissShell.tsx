import { View } from 'react-native';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

/**
 * App shell wrapper. Keyboard dismiss is handled per-screen via
 * `keyboardDismissMode="on-drag"` on ScrollViews — a global TouchableWithoutFeedback
 * blocks scroll gestures and many content taps.
 */
export function KeyboardDismissShell({ children }: Props) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
