/**
 * Vercel build: static HTML demo at repo root + Expo web export under /app.
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
  execSync('npx expo export --platform web', {
    cwd: expoDir,
    env: {
      ...process.env,
      EXPO_WEB_BASE_PATH: '/app',
      EXPO_PUBLIC_WEB_BASE_PATH: '/app',
    },
    stdio: 'inherit',
  });
}

async function main() {
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
