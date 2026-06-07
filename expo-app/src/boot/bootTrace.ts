/**
 * Production-safe boot timeline — no imports from app code (avoids cycles).
 * Enable with EXPO_PUBLIC_BOOT_TRACE=1 (see production-diagnostic EAS profile).
 */

const MAX_LINES = 48;

const lines: string[] = [];
const listeners = new Set<(next: readonly string[]) => void>();

function emit(): void {
  const snap = [...lines];
  listeners.forEach((fn) => {
    try {
      fn(snap);
    } catch {
      /* ignore */
    }
  });
}

/** Record a boot step (shown on-screen when BOOT_TRACE is enabled). */
export function bootTrace(message: string): void {
  const t = ((Date.now() % 100_000) / 1000).toFixed(2);
  const line = `${t}s ${message}`;
  lines.push(line);
  if (lines.length > MAX_LINES) lines.shift();
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[boot] ${message}`);
  }
  emit();
  persistBootTrace(line);
}

function persistBootTrace(line: string): void {
  if (!BOOT_TRACE_ENABLED) return;
  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require('@react-native-async-storage/async-storage').default as {
        getItem: (k: string) => Promise<string | null>;
        setItem: (k: string, v: string) => Promise<void>;
      };
      const key = 'dalton_boot_trace';
      const prev = await AsyncStorage.getItem(key);
      const next = `${prev ? `${prev}\n` : ''}${line}`.slice(-4000);
      await AsyncStorage.setItem(key, next);
    } catch {
      /* non-fatal */
    }
  })();
}

/** Last boot trace (survives fast crashes) — read in Settings or dev tools. */
export async function readPersistedBootTrace(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default as {
      getItem: (k: string) => Promise<string | null>;
    };
    return await AsyncStorage.getItem('dalton_boot_trace');
  } catch {
    return null;
  }
}

export function subscribeBootTrace(listener: (next: readonly string[]) => void): () => void {
  listeners.add(listener);
  listener([...lines]);
  return () => listeners.delete(listener);
}

export function getBootTraceLines(): readonly string[] {
  return [...lines];
}

export const BOOT_TRACE_ENABLED = process.env.EXPO_PUBLIC_BOOT_TRACE === '1';
