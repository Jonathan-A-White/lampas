// The shared ready wait (tests/e2e/app-ready.ts, mw-fnvjof.17.113) holds a spec back until the app has finished its screen: a page that draws its content at once but takes its settings,
// busy mark and layout later is not ready until the last of them lands, and a page that never finishes is named by what is missing.
import { expect, test, type Page } from '@playwright/test';
import { appReady, expectInWindow, readiness } from './app-ready';

/** A Reader-shaped page: the chapter text is there at once; after `later` (a message from the test, not a timer) the busy mark goes, the Reader takes its weave and the header settles. */
async function lateReader(page: Page): Promise<void> {
  await page.setContent(`
    <header style="height:50px"><h1>Genesis 1</h1></header>
    <main data-reader data-weave="off" aria-busy="true"><div data-verse="1">In the beginning</div></main>
    <script>
      window.finish = () => {
        document.querySelector('main').removeAttribute('aria-busy');
        document.querySelector('main').setAttribute('data-weave', 'solid');
        document.querySelector('header').style.height = '80px';
        window.finished = true;
      };
    </script>`);
}

test('a page whose settings, busy mark and header land late is not ready until they have', async ({ page }) => {
  await lateReader(page);
  const early = await readiness(page, { reader: { weave: 'solid' } });
  expect(early.ready).toBe(false);
  expect(early.why).toContain('aria-busy');
  expect(early.why).toContain('data-weave is off, not solid');

  // the app finishes while the wait is running, as a loaded host's app does
  const waiting = appReady(page, { reader: { weave: 'solid' } });
  await page.evaluate(() => (window as unknown as { finish: () => void }).finish());
  await waiting;
  expect(await page.evaluate(() => (window as unknown as { finished?: boolean }).finished)).toBe(true);
  expect((await readiness(page, { reader: { weave: 'solid' } })).ready).toBe(true);
});

test('a layout still moving is not ready, and one that holds still is', async ({ page }) => {
  await page.setContent('<header style="height:40px"><h1>Title</h1></header><main data-reader><div data-verse="1">text</div></main>');
  await page.evaluate(() => {
    const header = document.querySelector('header') as HTMLElement;
    let n = 40;
    const grow = () => {
      n += 1;
      header.style.height = `${n}px`;
      requestAnimationFrame(grow);
    };
    grow();
  });
  const moving = await readiness(page);
  expect(moving.ready).toBe(false);
  expect(moving.why).toContain('the layout is still moving');
});

test('a page with no chapter text is named as missing it, and a page of another screen is ready by its own content', async ({ page }) => {
  await page.setContent('<main data-reader></main>');
  expect((await readiness(page)).why).toContain('no [data-verse]');
  await page.setContent('<main><h1 data-here>Settings</h1></main>');
  expect((await readiness(page, { content: '[data-here]' })).ready).toBe(true);
});

test('a measure that is on its way (above the window first, then in it) is waited for as one window', async () => {
  const seen = [-21.25, -21.25, 40, 3];
  let looks = 0;
  await expectInWindow(async () => seen[Math.min(looks++, seen.length - 1)], { min: -1, below: 20 });
  expect(looks).toBe(4);
});
