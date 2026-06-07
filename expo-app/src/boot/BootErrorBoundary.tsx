import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hideNativeSplash } from './nativeSplashGate';

type Props = {
  children: ReactNode;
  onRetry?: () => void;
};

type State = { error: Error | null };

/** Boot-only error boundary — no Sentry import at module load (avoids release init races). */
export class BootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    hideNativeSplash();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureException } = require('../monitoring/sentryBoot') as {
        captureException: (e: unknown, ctx?: Record<string, unknown>) => void;
      };
      captureException(error, {
        componentStack: info.componentStack ?? '',
        area: 'boot_error_boundary',
      });
    } catch {
      /* non-fatal */
    }
  }

  private retry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>{this.state.error.message}</Text>
          <Pressable onPress={this.retry} style={styles.btn}>
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
    padding: 24,
    gap: 12,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  body: { color: '#9A9690', fontSize: 13, textAlign: 'center' },
  btn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8A84B',
  },
  btnText: { color: '#C8A84B', fontSize: 15 },
});
