import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The engine is bsv-kit's honest fake (tests/support/honest-fakes.ts): a verse takes the time it takes to say, so it goes on
// by itself. A slow reader (300 ms a word) keeps a verse on the bar long enough to look at, and the page's clock (Playwright's
// page.clock) runs ahead to get through the verses between; how a real phone's voices sound is only a phone check
// (docs/pwa-best-practices.md section 12).
async function withVoices(page: Page) {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 300 });
  await page.clock.install();
}

/** Lets the reading go on, a second of the page's time at a time, until the bar says it is on verse `n`. */
const readUntilVerse = (page: Page, n: number) =>
  expect
    .poll(
      async () => {
        await page.clock.runFor(1000);
        return page.locator('[data-reading-bar]').textContent();
      },
      { timeout: 30_000, intervals: [20] },
    )
    .toContain(`Reading verse ${n}`);

async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.scrollingElement?.scrollTop ?? 0,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

test('Read from the top reads the chapter on, with a bar, a highlight kept in view, Pause and Stop', async ({ page }) => {
  await withVoices(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  const header = page.getByRole('button', { name: 'Read from the top', exact: true });
  const hb = await header.boundingBox();
  expect(hb?.width).toBeGreaterThanOrEqual(43.5);
  expect(hb?.height).toBeGreaterThanOrEqual(43.5);
  const gear = await page.getByRole('button', { name: 'Settings', exact: true }).boundingBox();
  expect(hb && gear && hb.x + hb.width <= gear.x + 0.5).toBe(true);
  await expectFitsPhone(page);
  // the title still fits beside the new button
  const title = await page.getByRole('heading', { name: 'Romans 8', level: 1 }).evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(title).toBe(true);

  await header.click();
  const bar = page.locator('[data-reading-bar]');
  await expect(bar).toContainText('Reading verse 1');
  await expect(page.locator('[data-verse="1"]')).toHaveAttribute('data-reading', 'true');
  const head = page.locator('header');
  for (const name of ['Pause', 'Stop']) {
    const box = await head.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  }
  expect((await spoken(page))[0].lang).toBe('en-US');

  // the verse being read is scrolled into the reader's own box, never the page
  await readUntilVerse(page, 12);
  const inView = await page.evaluate(() => {
    const box = document.querySelector('[data-reader]')?.getBoundingClientRect();
    const verse = document.querySelector('[data-verse="12"]')?.getBoundingClientRect();
    return !!box && !!verse && verse.top >= box.top - 1 && verse.bottom <= box.bottom + 1;
  });
  expect(inView).toBe(true);
  await expectFitsPhone(page);
  await shot(page, 'read-aloud');

  await head.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(bar).toContainText('Paused at verse 12');
  const count = (await spoken(page)).length;
  await head.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(bar).toContainText('Reading verse 12');
  expect((await spoken(page)).length).toBe(count + 1);

  await head.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(bar).toHaveCount(0);
  await expect(head.getByRole('button', { name: 'Read from the top', exact: true })).toBeVisible();
  await expect(head.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-reading]')).toHaveCount(0);
  expect((await spoken(page)).length).toBe(count + 1);
});

test('at 360 x 740 the top bar holds Pause and Stop while reading, fitting beside the title and the gear', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await withVoices(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
  const head = page.locator('header');
  await expect(head.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  const boxes = [];
  for (const name of ['Pause', 'Stop', 'Settings']) {
    const box = await head.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect(box && box.x >= 0 && box.x + box.width <= 360).toBe(true);
    boxes.push(box);
  }
  expect(boxes[0] && boxes[1] && boxes[0].x + boxes[0].width <= boxes[1].x + 0.5).toBe(true);
  expect(boxes[1] && boxes[2] && boxes[1].x + boxes[1].width <= boxes[2].x + 0.5).toBe(true);
  // the title gives its room to the buttons while reading but stays for a screen reader
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeAttached();
  const group = await head.getByRole('group', { name: 'Language' }).boundingBox();
  expect(group && boxes[0] && group.x + group.width <= boxes[0].x + 0.5).toBe(true);
  await expectFitsPhone(page);
  await shot(page, 'read-aloud-pause-stop');
  await head.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(head.getByRole('button', { name: 'Read from the top', exact: true })).toBeVisible();
});
