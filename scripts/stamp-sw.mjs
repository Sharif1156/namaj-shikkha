#!/usr/bin/env node
/**
 * stamp-sw.mjs — write a content hash into sw.js's VERSION constant.
 *
 *   node scripts/stamp-sw.mjs          stamp sw.js in place
 *   node scripts/stamp-sw.mjs --check  exit 1 if the stamp is stale (CI)
 *
 * The hash covers every file in the precache list, so any change to the app
 * produces a new cache name and old caches are dropped on activate.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const swPath = join(ROOT, 'sw.js');
const sw = readFileSync(swPath, 'utf8');

const core = sw.match(/const\s+CORE\s*=\s*\[([\s\S]*?)\];/);
if (!core) {
  console.error('✗ Could not find the CORE precache array in sw.js');
  process.exit(1);
}
const entries = [...core[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

const hash = createHash('sha256');
for (const entry of entries) {
  const rel = entry.replace(/^\.\//, '') || 'index.html';
  const file = join(ROOT, rel === '' || rel === '.' ? 'index.html' : rel);
  hash.update(entry);
  if (existsSync(file)) hash.update(readFileSync(file));
}
const version = hash.digest('hex').slice(0, 10);

const current = sw.match(/const VERSION = '([^']*)';/)?.[1];
if (process.argv.includes('--check')) {
  if (current !== version) {
    console.error(`✗ sw.js VERSION is stale (${current} → ${version}). Run: npm run stamp`);
    process.exit(1);
  }
  console.log(`✓ sw.js VERSION is current (${version}).`);
} else {
  writeFileSync(swPath, sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`));
  console.log(`Stamped sw.js VERSION = ${version}`);
}
