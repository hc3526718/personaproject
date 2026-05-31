import { Platform } from 'react-native';

/** Match the video letterbox background. */
export const DALTON_BOOT_VIDEO_BG = '#000000';

export function getDaltonBootVideoWebPath(): string {
  const env = process.env.EXPO_PUBLIC_BOOT_VIDEO_URL?.trim();
  if (env) return env;
  const base = (process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? '/app').replace(/\/$/, '');
  const path = `${base}/VideoP.mp4`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path;
}

let warmupStarted = false;

/**
 * Start loading VideoP early (auth stack / logged-out shell).
 * Web: `<link rel="preload">` + hidden `<video preload="auto">`. Native: relies on `BootVideoWarmup` mount.
 */
export function warmDaltonBootVideoCache(): void {
  if (warmupStarted) return;
  warmupStarted = true;

  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const uri = getDaltonBootVideoWebPath();

  if (!document.querySelector('link[data-dga-boot-video-preload]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = uri;
    link.type = 'video/mp4';
    link.setAttribute('data-dga-boot-video-preload', '1');
    document.head.appendChild(link);
  }

  if (!document.querySelector('video[data-dga-boot-video-warmup]')) {
    const video = document.createElement('video');
    video.setAttribute('data-dga-boot-video-warmup', '1');
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
