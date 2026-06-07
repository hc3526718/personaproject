#!/usr/bin/env node
/**
 * Prevents regressions that caused Metro stack overflows and boot crashes.
 * Run: npm run check:boot
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/** Walk .ts / .tsx (skip node_modules). */
function* walkTs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.expo') continue;
      yield* walkTs(p);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      yield p;
    }
  }
}

// --- 1. UTF-16 / BOM (breaks Babel: Unexpected character '') ---
for (const file of walkTs(ROOT)) {
  const buf = fs.readFileSync(file);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    fail(`UTF-16 LE encoding (save as UTF-8): ${path.relative(ROOT, file)}`);
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    fail(`UTF-16 BE encoding (save as UTF-8): ${path.relative(ROOT, file)}`);
  }
}

// --- 2. Required stable boot files ---
const required = [
  'index.ts',
  'RootGate.tsx',
  'App.tsx',
  'src/lib/inAppNotifyTypes.ts',
  'src/constants/daltonBootVideo.ts',
  'src/constants/daltonBootVideoNativeAsset.native.ts',
];
for (const f of required) {
  if (!exists(f)) fail(`Missing required file: ${f}`);
}

if (exists('src/constants/daltonBootVideo.native.ts')) {
  fail(
    'Remove src/constants/daltonBootVideo.native.ts — it causes a Metro self-cycle on iOS (use daltonBootVideo.ts + daltonBootVideoNativeAsset.native.ts).',
  );
}

// --- 3. Entry contract ---
const indexSrc = exists('index.ts') ? read('index.ts') : '';
if (!indexSrc.includes('RootGate')) {
  fail('index.ts must register RootGate (not App directly).');
}
if (/import\s+App\s+from\s+['"]\.\/App['"]/.test(indexSrc)) {
  fail('index.ts must not import App — RootGate loads it after the native runtime is ready.');
}
if (/initSentryFromEnv\s*\(\s*\)/.test(indexSrc)) {
  fail('index.ts must not call initSentryFromEnv() at module scope — defer via RootGate dynamic import.');
}

const rootGate = exists('RootGate.tsx') ? read('RootGate.tsx') : '';
if (!rootGate.includes("require('./App')")) {
  fail('RootGate.tsx must defer-load App via require("./App") in useEffect.');
}

// --- 4. Forbidden boot experiments in live entry ---
for (const rel of ['index.ts', 'App.tsx', 'RootGate.tsx']) {
  const s = exists(rel) ? read(rel) : '';
  if (/BootAppGate|AuthBootShell|ProductionAppShell/.test(s)) {
    fail(`${rel} must not reference staged boot shells (BootAppGate / AuthBootShell / ProductionAppShell).`);
  }
}

// --- 5. Notify prefs cycle ---
const notifyAccess = exists('src/lib/notifyPrefsAccess.ts') ? read('src/lib/notifyPrefsAccess.ts') : '';
if (/from\s+['"]\.\/notificationBannerPrefs['"]/.test(notifyAccess)) {
  fail('notifyPrefsAccess.ts must import types from inAppNotifyTypes.ts only (never notificationBannerPrefs).');
}

// --- 6. Platform .native.ts must not re-export from a basename Metro can alias to itself ---
for (const file of walkTs(SRC)) {
  if (!file.endsWith('.native.ts')) continue;
  const text = fs.readFileSync(file, 'utf8');
  const base = path.basename(file, '.native.ts');
  const bad = new RegExp(`from\\s+['"]\\.\\/${base}['"]`);
  if (bad.test(text)) {
    fail(
      `Platform cycle risk in ${path.relative(ROOT, file)}: do not re-export from './${base}' — use a .shared.ts or separate asset file.`,
    );
  }
}

// --- 7. Optional circular dependency scan (madge) ---
const runMadge = process.argv.includes('--cycles') || process.env.CHECK_CYCLES === '1';
if (runMadge) {
  const r = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['madge', '--circular', '--extensions', 'ts,tsx', 'index.ts'],
    { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
  );
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.status !== 0) {
    fail(`madge failed (install: npm i -D madge):\n${out}`);
  } else if (/Circular Dependencies/i.test(out) && !/no circular dependency/i.test(out)) {
    fail(`Circular dependencies detected:\n${out}`);
  }
} else {
  warnings.push('Skipped madge cycle scan (run: npm run check:cycles).');
}

// --- Report ---
if (warnings.length) {
  console.warn('\nWarnings:');
  for (const w of warnings) console.warn(`  • ${w}`);
}

if (errors.length) {
  console.error('\nBoot guardrails FAILED:\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('\nSee docs/BOOT_GUARDRAILS.md\n');
  process.exit(1);
}

console.log('Boot guardrails OK (encoding, entry path, notify prefs, platform files).');
