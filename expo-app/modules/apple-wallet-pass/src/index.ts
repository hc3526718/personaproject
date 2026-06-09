import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type AppleWalletPassNative = {
  canAddPasses: () => boolean;
  addPassFromBase64: (base64: string) => Promise<boolean>;
  addPassFromFile: (fileUri: string) => Promise<boolean>;
};

const native = requireOptionalNativeModule<AppleWalletPassNative>('AppleWalletPass');

export function isAppleWalletPassNativeAvailable(): boolean {
  return Platform.OS === 'ios' && native != null;
}

export function canAddAppleWalletPass(): boolean {
  if (!native) return false;
  try {
    return native.canAddPasses();
  } catch {
    return false;
  }
}

/** Returns null when the native module is not in this iOS build (needs EAS rebuild). */
export async function presentAppleWalletPassFromBase64(base64: string): Promise<boolean | null> {
  if (!native) return null;
  return native.addPassFromBase64(base64);
}

export async function presentAppleWalletPassFromFile(fileUri: string): Promise<boolean | null> {
  if (!native) return null;
  return native.addPassFromFile(fileUri);
}
