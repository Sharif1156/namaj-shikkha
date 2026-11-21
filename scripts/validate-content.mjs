#!/usr/bin/env node
/**
 * validate-content.mjs — CLI front-end for the content integrity checks.
 * Exits non-zero when a problem is found, so CI can gate on it.
 */

import { validateContent } from './content-checks.mjs';

const { problems, stats } = validateContent();

console.log('Content inventory');
for (const [key, value] of Object.entries(stats)) {
  console.log(`  ${key.padEnd(16)} ${value}`);
}
console.log('');

if (problems.length === 0) {
  console.log('✓ No content problems found.');
  process.exit(0);
}

console.error(`✗ ${problems.length} content problem(s):`);
for (const p of problems) console.error(`  - ${p}`);
process.exit(1);
