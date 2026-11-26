// prototypes/timeline/render.mjs (mw-fnvjof.17.317.4): takes docs/timeline-design.md's pictures from the prototype with Playwright's Chromium at the phone's 390x844 (one sideways
// at 844x390, one wide at 1024x768), and runs the budget check (--bench): the strip's work per frame with the processor slowed four times.
// Run from the repo root after `npm ci`: node prototypes/timeline/render.mjs (the pictures), --bench (the budget), --check (the gestures, each run in the browser). Not app code and not in any build.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/timeline-design');
const PHONE = { width: 390, height: 844 };
const SHOTS = [
  { name: 'isaiah-1', query: 'theme=light' },
  { name: 'whole-bible', query: 'theme=light&view=bible' },
  { name: 'event-card', query: 'theme=light&card=e217' },
  { name: 'dark', query: 'theme=dark' },
  { name: 'person-card', query: 'theme=light&card=phezekiah_1512' },
  { name: 'crowded-luke-23', query: 'theme=light&book=luk&chapter=23' },
  { name: 'genesis-5', query: 'theme=dark&book=gen&chapter=5' },
  { name: 'away', query: 'theme=light&year=-1040' },
  { name: 'ruler-list', query: 'theme=light&tap=ribbon' },
  { name: 'small-dock', query: 'theme=light&dock=0.25' },
  { name: 'sideways', query: 'theme=light', viewport: { width: 844, height: 390 } },
  { name: 'wide', query: 'theme=light', viewport: { width: 1024, height: 768 } },
];

const { server, url } = await serve({ port: 0 });
const browser = await chromium.launch();
const open = async (query, viewport = PHONE, deviceScaleFactor = 1) => {
  const page = await browser.newPage({ viewport, deviceScaleFactor, colorScheme: 'light', reducedMotion: 'no-preference' });
  page.on('pageerror', (error) => console.error(`page error (${query}): ${error.message}`));
  await page.goto(`${url}?${query}`);
  await page.waitForSelector('html[data-ready]');
  return page;
};

if (process.argv.includes('--check')) {
  // the prototype does what the design says, in a browser, motion on: each line is run, never assumed
  const context = await browser.newContext({ viewport: PHONE, hasTouch: true, colorScheme: 'light' });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error(`page error: ${error.message}`));
  await page.goto(`${url}?theme=light`);
  await page.waitForSelector('html[data-ready]');
  const touch = await context.newCDPSession(page);
  const state = () => page.evaluate(() => ({ ...window.__timeline.view, frames: window.__timeline.stats.frames }));
  /** Wait until the strip has run no frame for 300 ms. */
  const still = async () => {
    for (let last = -1; ; ) {
      const { frames } = await state();
      if (frames === last) return state();
      last = frames;
      await page.waitForTimeout(300);
    }
  };
  let failed = 0;
  const check = (name, ok, detail = '') => {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  };
  const box = await page.locator('#strip').boundingBox();
  const y = box.y + 30;
  const home = await still();
  const px = (a, b) => Math.round((a.c - b.c) * b.k);

  // a slow drag of 20 px, the finger resting before it lifts: under SNAP_PX, so the strip settles back on the chapter
  const drag = async (from, to, { slow = false } = {}) => {
    await page.mouse.move(from, y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(from + ((to - from) * i) / 8, y);
      if (slow) await page.waitForTimeout(30);
    }
    if (slow) await page.waitForTimeout(200);
    await page.mouse.up();
  };
  await drag(200, 180, { slow: true });
  check('a slow drag of 20 px settles back on the chapter (snap)', Math.abs(px(await still(), home)) < 1);
  await drag(200, 120, { slow: true });
  const moved = await still();
  check('a slow drag of 80 px stays where it was left (no snap, no glide)', Math.abs(px(moved, home) - 80 + 8) <= 2, `${px(moved, home)} px`);
  await page.locator('#strip').press('Home');
  check('the Home key flies back to the chapter', Math.abs(px(await still(), home)) < 1);

  // a fling: the strip goes on after the finger has let go, and comes to rest
  await drag(300, 200);
  const let_go = await state();
  const rest = await still();
  check('a fling glides on after the finger lets go (momentum)', px(rest, let_go) > 100, `${px(rest, let_go)} px further`);
  const chip = page.locator('.tl-home');
  check('with the chapter out of view its name stands at the side it lies on', (await chip.isVisible()) && (await chip.textContent()).includes('Isaiah 1') && (await chip.getAttribute('data-side')) === 'left');
  await chip.click();
  check('a tap on it flies back to the chapter', Math.abs(px(await still(), home)) < 1 && !(await chip.isVisible()));

  await page.getByRole('button', { name: 'Zoom in' }).click();
  const closer = await still();
  check('Zoom in doubles the zoom about the middle', Math.abs(closer.k / home.k - 2) < 0.01 && Math.abs(px(closer, home)) < 2);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  check('Zoom out halves it', Math.abs((await still()).k / home.k - 1) < 0.01);

  const whole = page.getByRole('button', { name: 'Whole Bible' });
  await whole.click();
  const out = await still();
  check('Whole Bible flies out to the whole Bible and is pressed', out.k < home.k / 20 && (await whole.getAttribute('aria-pressed')) === 'true');
  await whole.click();
  const back = await still();
  check('pressed again it flies back to where he was', Math.abs(back.k / home.k - 1) < 0.01 && Math.abs(px(back, home)) < 1 && (await whole.getAttribute('aria-pressed')) === 'false');

  // the card, by the real button over the picture
  const title = await page.evaluate(() => fetch('/src/timeline/data/isa.json').then((answer) => answer.json()).then((file) => file.events[0].title));
  await page.getByRole('button', { name: new RegExp(`^${title}, about 759 to 697 BC`) }).click();
  const card = page.locator('.tl-card');
  check('a tap on the event opens its card: title, date with about, length, verses, people', (await card.isVisible()) && (await card.locator('h2').textContent()) === title && (await card.textContent()).includes('about 759 to 697 BC \u00b7 62 years') && (await card.getByRole('button', { name: 'Isaiah 1\u201366' }).isVisible()));
  await card.getByRole('button', { name: 'Close' }).click();
  check('Close shuts the card', !(await card.isVisible()));
  await still();

  await page.locator('#strip').press('ArrowRight');
  const later = await still();
  check('the right arrow moves 40% of the width later', Math.abs(px(later, home) - 156) <= 2, `${px(later, home)} px`);
  await page.locator('#strip').press('Home');
  await still();

  // a mouse's pinch: ctrl and the wheel, about the pointer
  await page.mouse.move(box.x + 100, y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -60);
  await page.keyboard.up('Control');
  const wheeled = await still();
  check('ctrl and the wheel zoom about the pointer', wheeled.k > home.k * 1.5 && wheeled.c < home.c);
  await page.locator('#strip').press('Home');
  await still();

  // two fingers: a pinch out zooms in about the place between them; one finger up and down scrolls the dock's body
  const fingers = (type, points) => touch.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, at], id) => ({ x, y: at, id })) });
  await fingers('touchStart', [[150, y], [240, y]]);
  for (let i = 1; i <= 6; i++) await fingers('touchMove', [[150 - 10 * i, y], [240 + 10 * i, y]]);
  await fingers('touchEnd', []);
  const pinched = await still();
  check('a pinch of two fingers zooms about the place between them', Math.abs(pinched.k / home.k - 210 / 90) < 0.15 && Math.abs(px(pinched, home)) < 4, `${(pinched.k / home.k).toFixed(2)} times`);
  await page.locator('#strip').press('Home');
  await still();
  await fingers('touchStart', [[195, y + 150]]);
  for (let i = 1; i <= 6; i++) await fingers('touchMove', [[195, y + 150 - 12 * i]]);
  await fingers('touchEnd', []);
  await page.waitForTimeout(400);
  const scrolled = await page.evaluate(() => document.getElementById('body').scrollTop);
  check("a finger drawn up the strip scrolls the dock's body to the credit and the link, and moves no time", scrolled > 20 && Math.abs(px(await still(), home)) < 1, `${scrolled} px`);

  const before = (await state()).frames;
  await page.waitForTimeout(1500);
  check('at rest the strip runs no frame', (await state()).frames === before);
  await context.close();
  if (failed) process.exitCode = 1;
} else if (process.argv.includes('--bench')) {
  // the budget: the strip's whole work for a frame, the processor slowed four times (a mid phone against this machine), on the open chapter and with every event drawn ten times
  for (const [label, query] of [
    ['Isaiah 1, the whole Bible loaded', 'still=1'],
    ['Luke 23 (AD 30, the busiest year)', 'still=1&book=luk&chapter=23'],
    ['Isaiah 1, every event ten times', 'still=1&stress=10'],
    ['Isaiah 1, every event forty times', 'still=1&stress=40'],
  ]) {
    // two device px to one, the most the strip ever draws at (LAYOUT.DPR_MAX): four times the pixels of the pictures
    const page = await open(query, PHONE, 2);
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const bench = await page.evaluate(() => window.__timeline.bench(240));
    const fmt = (run) => `mean ${run.mean.toFixed(2)} ms, 95th ${run.p95.toFixed(2)} ms, worst ${run.worst.toFixed(2)} ms`;
    console.log(`${label}: ${bench.marks} marks, ${bench.width}x${bench.height} at ${bench.ratio} device px to one\n  pan   ${fmt(bench.pan)}\n  zoom  ${fmt(bench.zoom)}`);
    if (!query.includes('stress')) {
      const flight = await open(query.replace('still=1', 'x=1'), PHONE, 2);
      const slowed = await flight.context().newCDPSession(flight);
      await slowed.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const cadence = await flight.evaluate(() => window.__timeline.cadence());
      // at rest: once the lanes have eased into place (a second), the strip must run no frame at all
      const idle = await flight.evaluate(() => new Promise((done) => setTimeout(() => { const from = window.__timeline.stats.frames; setTimeout(() => done(window.__timeline.stats.frames - from), 2000); }, 1000)));
      console.log(`  a flight out to the whole Bible and back: ${cadence.frames} frames, median ${cadence.median.toFixed(1)} ms apart, 95th ${cadence.p95.toFixed(1)} ms, worst ${cadence.worst.toFixed(1)} ms; the strip's work in them: mean ${cadence.work.toFixed(2)} ms, worst ${cadence.workWorst.toFixed(2)} ms; frames in 2 s at rest: ${idle}`);
      await flight.close();
    }
    await page.close();
  }
} else {
  mkdirSync(out, { recursive: true });
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  for (const { name, query, viewport = PHONE } of SHOTS) {
    if (only.length && !only.includes(name)) continue;
    const page = await open(`${query}&still=1`, viewport);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(out, `${name}.png`), fullPage: false });
    await page.close();
    console.log(`${name}.png ${viewport.width}x${viewport.height}`);
  }
}
await browser.close();
server.close();
