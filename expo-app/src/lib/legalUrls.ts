import { Linking, Platform } from 'react-native';
import { getDaltonWebUrl } from './env';

export function legalPageUrl(
  path: '/terms' | '/privacy' | '/athlete-agreement' | '/cookies' | '/cookie-policy',
): string {
  const normalized = path === '/cookies' ? '/cookie-policy' : path;
  const base = getDaltonWebUrl().replace(/\/$/, '');
  if (!base) return '';
  return `${base}${normalized}`;
}

export async function openLegalPage(
  path: '/terms' | '/privacy' | '/athlete-agreement' | '/cookies' | '/cookie-policy',
): Promise<boolean> {
  const url = legalPageUrl(path);
  if (!url) return false;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  await Linking.openURL(url);
  return true;
}
