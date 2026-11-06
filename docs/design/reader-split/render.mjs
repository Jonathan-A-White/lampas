// docs/design/reader-split/render.mjs (mw-5r3p30.1131): renders mockup.html's states into the PNGs beside it with Playwright's Chromium, the phone's 390x844 (sideways 844x390).
// Run from the repo root after `npm ci`: node docs/design/reader-split/render.mjs. Not app code and not in any build: the mockups are documents.
import { chromium } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const page_url = pathToFileURL(join(here, 'mockup.html')).href;
const SHOTS = [
  { name: 'map-split', state: 'map' },
  { name: 'text-linked', state: 'linked' },
  { name: 'text-unlinked', state: 'unlinked' },
  { name: 'closing', state: 'closing' },
  { name: 'chooser', state: 'chooser' },
  { name: 'text-sideways', state: 'sideways', viewport: { width: 844, height: 390 } },
];

const browser = await chromium.launch();
for (const { name, state, viewport = { width: 390, height: 844 } } of SHOTS) {
  const page = await browser.newPage({ viewport, colorScheme: 'light' });
  await page.goto(`${page_url}?state=${state}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(here, `${name}.png`), fullPage: false });
  await page.close();
  console.log(`${name}.png ${viewport.width}x${viewport.height}`);
}
await browser.close();
