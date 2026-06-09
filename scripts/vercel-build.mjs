/**
 * Vercel build: static HTML at repo root + Expo web export under /app.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const expoDir = join(root, 'expo-app');
const outDir = join(root, 'web-deploy');
const appDir = join(outDir, 'app');

async function copyDir(src, dest) {
  await cp(src, dest, { recursive: true });
}

function runExpoExport() {
  const env = {
    ...process.env,
    CI: 'true',
    EXPO_WEB_BASE_PATH: '/app',
    EXPO_PUBLIC_WEB_BASE_PATH: '/app',
    /** Avoid Sentry source-map upload failing the build when SENTRY_AUTH_TOKEN is unset. */
    SENTRY_DISABLE_AUTO_UPLOAD: 'true',
    EXPO_NO_TELEMETRY: '1',
    /** Large RN web bundle — prevent OOM on Vercel builders. */
    NODE_OPTIONS: [
      process.env.NODE_OPTIONS ?? '',
      '--max-old-space-size=8192',
    ]
      .filter(Boolean)
      .join(' '),
  };

  console.log('[vercel-build] Running expo export (web) in', expoDir);

  try {
    execSync('npx expo export --platform web', {
      cwd: expoDir,
      env,
      stdio: 'inherit',
      encoding: 'utf8',
    });
  } catch (err) {
    console.error('[vercel-build] expo export failed.');
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    if (err.message) console.error(err.message);
    throw err;
  }
}

/** Auth hero video — always `expo-app/assets/VideoP.mp4` (served at `/app/VideoP.mp4`). */
async function stageAuthVideoForWeb() {
  const src = join(expoDir, 'assets', 'VideoP.mp4');
  if (!existsSync(src)) {
    console.warn('[vercel-build] assets/VideoP.mp4 missing — skip auth video staging');
    return null;
  }
  const pubDir = join(expoDir, 'public');
  await mkdir(pubDir, { recursive: true });
  await cp(src, join(pubDir, 'VideoP.mp4'));
  console.log('[vercel-build] Staged assets/VideoP.mp4 → public/VideoP.mp4');
  return src;
}

async function ensureAuthVideoInAppOutput(authVideoSrc) {
  if (!authVideoSrc || !existsSync(authVideoSrc)) return;
  await cp(authVideoSrc, join(appDir, 'VideoP.mp4'));
  console.log('[vercel-build] Ensured /app/VideoP.mp4 from assets/VideoP.mp4');
}

async function injectAuthVideoPreload() {
  const indexPath = join(appDir, 'index.html');
  if (!existsSync(indexPath)) {
    console.warn('[vercel-build] app/index.html missing — skip auth video preload');
    return;
  }
  const href = '/app/VideoP.mp4';
  let html = await readFile(indexPath, 'utf8');
  if (html.includes('data-dga-auth-video-preload')) return;
  const tag = `<link rel="preload" href="${href}" as="video" type="video/mp4" data-dga-auth-video-preload="1">`;
  html = html.replace('</head>', `  ${tag}\n</head>`);
  await writeFile(indexPath, html, 'utf8');
  console.log('[vercel-build] Injected auth VideoP preload into app/index.html');
}

function runMarketingUiBuild() {
  const marketingDir = join(root, 'marketing-ui');
  console.log('[vercel-build] Building marketing-ui (StaggeredMenu + CardSwap)');
  execSync('npm install && npm run build', {
    cwd: marketingDir,
    env: process.env,
    stdio: 'inherit',
    encoding: 'utf8',
  });
}

async function main() {
  runMarketingUiBuild();
  const authVideoSrc = await stageAuthVideoForWeb();
  runExpoExport();

  await mkdir(outDir, { recursive: true });
  await mkdir(appDir, { recursive: true });

  const dist = join(expoDir, 'dist');
  await copyDir(dist, appDir);
  await ensureAuthVideoInAppOutput(authVideoSrc);
  await injectAuthVideoPreload();

  const entries = await readdir(root, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.html')) continue;
    await cp(join(root, ent.name), join(outDir, ent.name));
  }

  await copyDir(join(root, 'shared'), join(outDir, 'shared'));

  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const supabaseAnon = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const contactCfgPath = join(outDir, 'shared', 'dalton-contact-config.js');
  await writeFile(
    contactCfgPath,
    `window.__DALTON_CONTACT_CONFIG__=${JSON.stringify({ supabaseUrl, anonKey: supabaseAnon })};\n`,
    'utf8',
  );
  if (!supabaseUrl || !supabaseAnon) {
    console.warn('[vercel-build] EXPO_PUBLIC_SUPABASE_* unset — marketing contact form will stay disabled.');
  }

  const showcaseSrc = join(root, 'showcase');
  try {
    await copyDir(showcaseSrc, join(outDir, 'showcase'));
  } catch {
    console.warn('[vercel-build] No showcase/ folder — landing phone mockups skipped.');
  }

  const logoSrc = join(expoDir, 'assets', 'dalton_logo_final_img.png');
  const brandDir = join(outDir, 'brand');
  try {
    await mkdir(brandDir, { recursive: true });
    await cp(logoSrc, join(brandDir, 'dalton_logo_final_img.png'));
    console.log('[vercel-build] Staged brand logo → /brand/dalton_logo_final_img.png');
  } catch {
    console.warn('[vercel-build] dalton_logo_final_img.png missing — skip brand/');
  }

  console.log('[vercel-build] Output:', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
