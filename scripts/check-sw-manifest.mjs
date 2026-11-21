#!/usr/bin/env node
/**
 * check-sw-manifest.mjs — verify that every asset listed in the service
 * worker's precache list actually exists on disk.
 *
 * A stale entry in `CORE` makes `cache.addAll` reject at install time, which
 * silently disables offline mode. This turns that into a build failure.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');

const match = sw.match(/const\s+CORE\s*=\s*\[([\s\S]*?)\];/);
if (!match) {
  console.error('✗ Could not find the CORE precache array in sw.js');
  process.exit(1);
}

const entries = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (entries.length === 0) {
  console.error('✗ The CORE precache array is empty');
  process.exit(1);
}

const missing = [];
for (const entry of entries) {
  // './index.html' → index.html; './' means the app shell.
  const rel = entry.replace(/^\.\//, '');
  const path = rel === '' || rel === '.' ? join(ROOT, 'index.html') : join(ROOT, rel);
  if (!existsSync(path)) missing.push(entry);
}

// Also flag app files that exist but were never precached.
const critical = [
  'index.html',
  'src/main.js',
  'src/state.js',
  'src/services.js',
  'src/core/prayer-times.js',
  'src/core/qibla.js',
  'src/core/hijri.js',
  'src/core/storage.js',
  'src/core/i18n.js',
  'src/core/location.js',
  'src/core/tasbih.js',
  'src/ui/dom.js',
  'src/views/home.js',
  'src/views/qibla.js',
  'src/views/salah.js',
  'src/views/duas.js',
  'src/views/tasbih.js',
  'src/views/more.js',
  'src/data/salah.json',
  'src/data/duas.json',
  'src/data/names99.json',
  'src/styles/main.css',
];
const missingCritical = critical.filter((f) => !entries.includes(`./${f}`));

console.log(`Precache entries: ${entries.length}`);

if (missing.length) {
  console.error(`\n✗ ${missing.length} precache entr${missing.length === 1 ? 'y is' : 'ies are'} missing from disk:`);
  for (const m of missing) console.error(`    ${m}`);
}
if (missingCritical.length) {
  console.error(`\n✗ ${missingCritical.length} app file(s) are not precached, so offline mode would break:`);
  for (const m of missingCritical) console.error(`    ${m}`);
}

if (missing.length || missingCritical.length) process.exit(1);

console.log('✓ Service-worker precache list matches the filesystem.');
