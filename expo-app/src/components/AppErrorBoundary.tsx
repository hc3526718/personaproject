import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DS } from '../designSystem';
import { hideNativeSplash } from '../boot/nativeSplashGate';

type Props = {
  children: ReactNode;
  /** Called when user taps Retry (remounts children). */
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

/**
 * Catches render errors after the native splash so TestFlight builds show a recovery UI
 * instead of closing immediately (common when a child throws during first navigation mount).
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    hideNativeSplash();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../monitoring/sentryBoot').captureException(error, {
        componentStack: info.componentStack ?? '',
        area: 'app_error_boundary',
      });
    } catch {
      /* non-fatal */
    }
    if (__DEV__) {
      console.error('[AppErrorBoundary]', error, info.componentStack);
    }
  }

  private retry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    const message =
      this.state.error.message?.trim() ||
      'Something went wrong while loading the app.';

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Could not open Dalton</Text>
        <Text style={styles.body}>{message}</Text>
        <Pressable accessibilityRole="button" onPress={this.retry} style={styles.btn}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.space.xl,
    gap: DS.space.md,
  },
  title: {
    fontFamily: DS.font.heading,
    fontSize: 24,
    color: DS.color.white,
    textAlign: 'center',
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 14,
    lineHeight: 21,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
  btn: {
    marginTop: DS.space.sm,
    backgroundColor: DS.color.gold,
    paddingVertical: 12,
    paddingHorizontal: DS.space.xl,
    borderRadius: 12,
  },
  btnText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.background,
    fontWeight: '700',
  },
});
