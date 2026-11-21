#!/usr/bin/env node
/**
 * make-store-assets.mjs — render Play Store screenshots (1080×1920) and the
 * feature graphic (1024×500) from the running app.
 *
 *   npm i -D playwright && npx playwright install chromium   (once)
 *   npm run store:screenshots
 *
 * Output: store/screenshots/*.png and store/feature-graphic.png
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('✗ playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5199;
const OUT = join(ROOT, 'store', 'screenshots');
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, [join(ROOT, 'server.mjs')], {
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
  stdio: 'ignore',
});
const stop = () => server.kill();
process.on('exit', stop);
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  locale: 'bn-BD',
  timezoneId: 'Asia/Dhaka',
  serviceWorkers: 'block',
});
await context.addInitScript(() => {
  try {
    localStorage.setItem('namaj:settings', JSON.stringify({ locale: 'bn', theme: 'light' }));
    localStorage.setItem('namaj:tasbih', JSON.stringify({ count: 21, presetId: 'subhanallah', target: 33, rounds: 2 }));
  } catch {}
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const base = `http://127.0.0.1:${PORT}/index.html`;
const shot = async (name) => page.screenshot({ path: join(OUT, `${name}.png`) });

await page.goto(`${base}#home`);
await page.waitForSelector('.prayer-row');
await shot('01-times');

await page.click('[data-route="qibla"]');
await page.waitForSelector('.compass');
await shot('02-qibla');

await page.click('[data-route="salah"]');
await page.waitForTimeout(250);
await shot('03-salah');

await page.click('[data-route="duas"]');
await page.waitForTimeout(250);
await shot('04-duas');

await page.click('[data-route="more"]');
await page.click('[data-page="tasbih"]');
await page.waitForSelector('.tasbih-dial');
await shot('05-tasbih');

/* Feature graphic */
const icon = readFileSync(join(ROOT, 'assets', 'icon-512.png')).toString('base64');
const fg = await context.newPage();
await fg.setViewportSize({ width: 1024, height: 500 });
await fg.setContent(`<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;height:100%}
  body{display:flex;align-items:center;justify-content:center;gap:44px;
    background:radial-gradient(120% 140% at 15% 10%,#1a6b57 0%,#0f3d33 55%,#0b1512 100%);
    font-family:"Noto Sans Bengali","Noto Sans",system-ui,sans-serif;color:#eafaf3}
  img{width:200px;height:200px;border-radius:44px;box-shadow:0 18px 50px #0008}
  h1{margin:0;font-size:68px;line-height:1.1;font-weight:700}
  p{margin:10px 0 0;font-size:28px;opacity:.85}
</style><img src="data:image/png;base64,${icon}"><div>
  <h1>নামাজ শিক্ষা</h1><p>Prayer times · Qibla · Salah guide</p><p>অফলাইন · বিজ্ঞাপনমুক্ত</p></div>`);
await fg.screenshot({ path: join(ROOT, 'store', 'feature-graphic.png'), scale: 'css' });

await browser.close();
stop();
if (errors.length) {
  console.error('✗ Page errors while rendering:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('✓ Wrote store/screenshots/*.png and store/feature-graphic.png');
