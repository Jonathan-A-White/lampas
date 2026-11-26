import { expect, test, type Page } from '@playwright/test';
import { cpus, loadavg } from 'node:os';
import { afterFrames } from '../support/settled';
import { openUnlocked } from './unlocked';

// The timeline strip's frame budget (mw-fnvjof.17.317.2, docs/timeline-design.md 'The budget check', items 1 and 2): on the built app at 390x844 and two device px to one, with the
// processor slowed four times (the usual stand-in for a mid phone), the strip's whole work for a frame (lanes, easing, drawing, a pixel read back) is at most 8 ms on average and 12 ms
// at the 95th frame, panning and zooming, at Isaiah 1 and at Luke 23 with every book loaded; and at rest it runs no frame at all. The run is the strip's own (`bench`, the prototype's):
// 240 frames of a pan across six widths at the chapter's zoom, then 240 of a zoom out to the whole Bible and in to a day. A loaded host makes a run slow without the strip's doing (the
// design holds the worst frame only on a quiet host): the best of three runs is held to the budget, and only on a calm host, one whose 1-minute load is under half its cores; on a busier
// one (a gate beside other work) every figure is still written to the log, the run is still made and its shape checked, and the test says the budget was not held to. Every run and its
// worst frame are in the log either way.
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const MEAN_MS = 8;
const P95_MS = 12;
const RUNS = 3;
/** A calm host: the 1-minute load under half the cores. */
const calm = (): boolean => loadavg()[0] < cpus().length / 2;

interface Timing {
  mean: number;
  p95: number;
  worst: number;
}
interface Bench {
  marks: number;
  width: number;
  height: number;
  ratio: number;
  pan: Timing;
  zoom: Timing;
}
type Root = HTMLElement & { timeline?: { bench(frames: number): Bench | null; toggleWhole(): void; stats: { frames: number } } };

async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

async function openDocked(page: Page, at: string) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { readerSplit: 'on', splitTimeline: 'on' });
  await page.goto(`/#/?${at}`);
  await page.reload();
  await expect(page.locator('[data-timeline-strip]')).toHaveAttribute('data-timeline-loaded', '');
}

const frames = (page: Page) => page.evaluate(() => (document.querySelector('[data-timeline-strip]') as Root).timeline!.stats.frames);
const fmt = (run: Timing) => `mean ${run.mean.toFixed(2)} ms, 95th ${run.p95.toFixed(2)} ms, worst ${run.worst.toFixed(2)} ms`;

for (const [name, at] of [
  ['Isaiah 1', 'b=isa&c=1'],
  ['Luke 23, AD 30, the busiest year', 'b=luk&c=23'],
] as const) {
  test(`${name}, every book loaded, the processor slowed 4x: the strip's work is at most ${MEAN_MS} ms a frame on average and ${P95_MS} ms at the 95th frame, panning and zooming`, async ({ page }) => {
    test.setTimeout(180_000);
    await openDocked(page, at);
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const runs: Bench[] = [];
    for (let i = 0; i < RUNS; i++) {
      const run = await page.evaluate(() => (document.querySelector('[data-timeline-strip]') as Root).timeline!.bench(240));
      expect(run, 'the strip has a canvas to time').not.toBeNull();
      runs.push(run!);
      console.log(`timeline-budget: ${name}, run ${i + 1}: ${run!.marks} marks, ${run!.width}x${run!.height} at ${run!.ratio} device px to one; pan ${fmt(run!.pan)}; zoom ${fmt(run!.zoom)}`);
    }
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    expect(runs[0].ratio).toBe(2);
    expect(runs[0].width).toBe(390);
    // every book is in: the whole Bible's events and dated lives
    expect(runs[0].marks).toBeGreaterThan(500);
    for (const run of runs) for (const what of ['pan', 'zoom'] as const) expect(run[what].mean).toBeGreaterThan(0);
    const quiet = calm();
    if (!quiet) {
      const said = `timeline-budget: ${name}: the host's 1-minute load is ${loadavg()[0].toFixed(1)} on ${cpus().length} cores, so the figures above are logged and not held to the budget`;
      console.log(said);
      test.info().annotations.push({ type: 'budget not held to', description: said });
      return;
    }
    for (const what of ['pan', 'zoom'] as const) {
      expect(Math.min(...runs.map((run) => run[what].mean)), `${what}: the mean of the best run`).toBeLessThanOrEqual(MEAN_MS);
      expect(Math.min(...runs.map((run) => run[what].p95)), `${what}: the 95th frame of the best run`).toBeLessThanOrEqual(P95_MS);
    }
  });
}

test('at rest the strip runs no frame: after a flight out to the whole Bible has landed and a second has passed, its frame count does not move for two seconds', async ({ page }) => {
  await openDocked(page, 'b=isa&c=1');
  const whole = page.locator('[data-dock-handle]').getByRole('button', { name: 'Whole Bible', exact: true });
  const began = await frames(page);
  await whole.click();
  await expect(whole).toHaveAttribute('aria-pressed', 'true');
  // the flight drew frames of its own
  expect(await frames(page)).toBeGreaterThan(began + 5);
  // the lanes ease into place for a moment after the landing: the count is looked at until it has stopped, then held to stay stopped while the browser draws two seconds of its own frames
  await expect
    .poll(async () => {
      const before = await frames(page);
      await afterFrames(page, 60);
      return (await frames(page)) - before;
    })
    .toBe(0);
  const landed = await frames(page);
  await afterFrames(page, 120);
  expect(await frames(page)).toBe(landed);
});
