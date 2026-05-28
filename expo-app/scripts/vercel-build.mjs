/**
 * Vercel build (personaproject): full marketing site at / + Expo web app at /app.
 * Marketing assets are vendored in expo-app/marketing/ (synced from repo root).
 */
import { execSync } from 'node:child_process';
import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const expoDir = process.cwd();
const marketingRoot = path.join(expoDir, 'marketing');
const distDir = path.join(expoDir, 'dist');
const appOutDir = path.join(distDir, 'app');

async function copyDir(src, dest) {
  await cp(src, dest, { recursive: true });
}

function run(cmd, cwd, env = process.env) {
  // eslint-disable-next-line no-console
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, env, stdio: 'inherit' });
}

function runExpoExport() {
  const env = {
    ...process.env,
    CI: 'true',
    EXPO_WEB_BASE_PATH: '/app',
    EXPO_PUBLIC_WEB_BASE_PATH: process.env.EXPO_PUBLIC_WEB_BASE_PATH || '/app',
    SENTRY_DISABLE_AUTO_UPLOAD: 'true',
    EXPO_NO_TELEMETRY: '1',
    NODE_OPTIONS: [process.env.NODE_OPTIONS ?? '', '--max-old-space-size=8192'].filter(Boolean).join(' '),
  };
  console.log('[vercel-build] expo export → dist/app');
  run(`npx -y expo export --platform web --output-dir "${appOutDir}"`, expoDir, env);
}

/** Serve boot video as static file (avoids bundling ~95MB into Metro on Vercel). */
async function stageBootVideoPublic() {
  const src = path.join(expoDir, 'assets', 'VideoP.mp4');
  const pubDir = path.join(expoDir, 'public');
  const dest = path.join(pubDir, 'VideoP.mp4');
  if (!existsSync(src)) {
    console.warn('[vercel-build] assets/VideoP.mp4 missing — skip public staging');
    return;
  }
  await mkdir(pubDir, { recursive: true });
  await cp(src, dest);
  console.log('[vercel-build] Staged VideoP.mp4 → public/ (static at /app/VideoP.mp4)');
}

async function copyMarketingSite() {
  if (!existsSync(path.join(marketingRoot, 'index.html'))) {
    throw new Error(
      `Missing ${path.join(marketingRoot, 'index.html')}. ` +
        'Run: copy repo-root index.html, shared/, showcase/, and legal pages into expo-app/marketing/.',
    );
  }

  const entries = await readdir(marketingRoot, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.html')) continue;
    await cp(path.join(marketingRoot, ent.name), path.join(distDir, ent.name));
  }

  await copyDir(path.join(marketingRoot, 'shared'), path.join(distDir, 'shared'));
  await copyDir(path.join(marketingRoot, 'showcase'), path.join(distDir, 'showcase'));

  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const supabaseAnon = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  await writeFile(
    path.join(distDir, 'shared', 'dalton-contact-config.js'),
    `window.__DALTON_CONTACT_CONFIG__=${JSON.stringify({ supabaseUrl, anonKey: supabaseAnon })};\n`,
    'utf8',
  );

  console.log('[vercel-build] Marketing site at / (index.html + shared + showcase)');
}

async function main() {
  const { rmSync, mkdirSync } = await import('node:fs');
  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
  mkdirSync(appOutDir, { recursive: true });

  await stageBootVideoPublic();
  runExpoExport();
  await copyMarketingSite();

  console.log('[vercel-build] Done:', distDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
