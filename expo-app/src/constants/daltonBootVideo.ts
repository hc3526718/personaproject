/** Match the video letterbox background. */
export const DALTON_BOOT_VIDEO_BG = '#000000';

export function getDaltonBootVideoWebPath(): string {
  const env = process.env.EXPO_PUBLIC_BOOT_VIDEO_URL?.trim();
  if (env) return env;
  const base = (process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? '/app').replace(/\/$/, '');
  return `${base}/VideoP.mp4`;
}
