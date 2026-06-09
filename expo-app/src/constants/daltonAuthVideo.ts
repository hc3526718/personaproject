import { Platform } from 'react-native';

/**
 * Canonical auth hero video — always `expo-app/assets/VideoP.mp4`.
 * Auth screens must not use marketing `/VideoP.mp4` or `EXPO_PUBLIC_BOOT_VIDEO_URL`.
 */
export const DALTON_AUTH_VIDEO_ASSET = 'assets/VideoP.mp4';

/** Web URL for the auth video (static copy of `assets/VideoP.mp4` under the Expo web base path). */
export function getDaltonAuthVideoWebUri(): string {
  const base = (process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? '/app').replace(/\/$/, '');
  const path = `${base}/VideoP.mp4`;
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!origin) return path.startsWith('/') ? path : `/${path}`;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

let authWebWarmupStarted = false;

/** Preload auth hero video only (`expo-app/assets/VideoP.mp4` → `/app/VideoP.mp4` on web). */
export function warmDaltonAuthVideoCache(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (authWebWarmupStarted) return;
  authWebWarmupStarted = true;

  const uri = getDaltonAuthVideoWebUri();

  if (!document.querySelector('link[data-dga-auth-video-preload]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = uri;
    link.type = 'video/mp4';
    link.setAttribute('data-dga-auth-video-preload', '1');
    document.head.appendChild(link);
  }

  if (!document.querySelector('video[data-dga-auth-video-warmup]')) {
    const video = document.createElement('video');
    video.setAttribute('data-dga-auth-video-warmup', '1');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.src = uri;
    video.style.cssText =
      'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px';
    document.body.appendChild(video);
    const play = () => {
      void video.play().catch(() => {});
    };
    video.addEventListener('canplay', play, { once: true });
    video.load();
  }
}
