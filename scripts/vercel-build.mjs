/**
 * Vercel build: static HTML at repo root + Expo web export under /app.
 */
import { execSync } from 'node:child_process';
import { cp, mkdir, readdir } from 'node:fs/promises';
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
  runExpoExport();

  await mkdir(outDir, { recursive: true });
  await mkdir(appDir, { recursive: true });

  const dist = join(expoDir, 'dist');
  await copyDir(dist, appDir);

  const entries = await readdir(root, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.html')) continue;
    await cp(join(root, ent.name), join(outDir, ent.name));
  }

  await copyDir(join(root, 'shared'), join(outDir, 'shared'));

  const showcaseSrc = join(root, 'showcase');
  try {
    await copyDir(showcaseSrc, join(outDir, 'showcase'));
  } catch {
    console.warn('[vercel-build] No showcase/ folder — landing phone mockups skipped.');
  }

  console.log('[vercel-build] Output:', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
