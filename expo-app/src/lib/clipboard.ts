import { Platform } from 'react-native';

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
  try {
    const mod = require('react-native') as typeof import('react-native') & {
      Clipboard?: { setString: (s: string) => void };
    };
    if (mod.Clipboard?.setString) {
      mod.Clipboard.setString(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}
