import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

/** Tap outside focused inputs to dismiss the keyboard app-wide. */
export function KeyboardDismissShell({ children }: Props) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
