// A quick double tap on an English word of a Septuagint chapter ends where one tap does (mw-u2w5klk.322). Genesis 1:5 in the English view: a tap on a word of the verse's chunk (paired to no
// Greek word) opens the Verse view, and the second tap, up to half a second later, fell on the Diagram button (Night at 663 px) or Listen (Night at 715 px) of the view the first tap had just
// opened and pressed it: Diagram asked the tutor to draw the verse. At 390x844 with a touch screen, the settle moment as on his phone (SETTLE_MS), both taps timed on the page's clock
// (tests/support/gesture.ts). Genesis 1 is tests/fixtures/data-lxx, routed as septuagint-word-sheet-english.spec.ts routes it, with verses 1-4 lengthened so verse 5 can be scrolled to any height.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { pageTime, tapTwice } from '../support/gesture';
import { pauseNow } from '../support/hold';
import { SETTLE_MS } from '../../src/ui/settle';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

type Chunk = { t: string; g: number[]; c?: number; y?: string };

// tapTwice times the two taps, and the guard its moment, on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8');
    if (path === 'gen/1.json') {
      const chapter = JSON.parse(body) as { verses: { n: number; e: Chunk[] }[] };
      // verse 5's one chunk is paired to no Greek word, so a tap on it opens the Verse view; the verses above it are long enough for verse 5 to be scrolled down the screen
      for (const verse of chapter.verses) if (verse.n < 5) for (const chunk of verse.e) chunk.t = `${chunk.t} ${'And so it was. '.repeat(40)}`;
      body = JSON.stringify(chapter);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
});

/** Genesis 1 in the English view of the Septuagint, with the settle moment put back after openUnlocked's '0' and its own first moment passed. */
async function openGenesis(page: Page): Promise<FakePostern> {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/#/?b=gen&c=1');
  await page.reload();
  await expect(page.locator('[data-verse="5"]')).toBeVisible();
  const language = page.getByRole('group', { name: 'Language', exact: true });
  if ((await language.count()) > 0) await language.getByRole('button', { name: 'English', exact: true }).click();
  await pageTime(page, SETTLE_MS + 100);
  return fake;
}

/** Scrolls the reading area so the middle of the word `Night` sits `y` px down the window; gives the point of it. */
async function placeNight(page: Page, y: number): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.evaluate((target) => {
    const verse = document.querySelector('[data-verse="5"]')!;
    const walker = document.createTreeWalker(verse, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = (node.textContent ?? '').indexOf('Night');
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + 5);
      const box = document.querySelector('main[data-reader]') as HTMLElement;
      const rect = range.getBoundingClientRect();
      box.scrollTop += rect.top + rect.height / 2 - target;
      const after = range.getBoundingClientRect();
      return { x: after.x, y: after.y, width: after.width, height: after.height };
    }
    throw new Error('no Night in verse 5');
  }, y);
  return box;
}

const isDiagram = (fake: FakePostern) => fake.received.filter((r) => r.grist.kind === 'sentence-diagram');

// the Verse view's Actions sit at 663 (Diagram) and 715 (Listen) at this size; a double tap on Night there once pressed them. The app-wide guard's moment is 450 ms and a thumb's second tap
// came as late as 500 ms, so the gaps include 480.
for (const y of [663, 715, 760]) for (const gap of [250, 480]) {
  test(`a double tap on Night at ${y} px, ${gap} ms apart, opens the Verse view of verse 5 and presses nothing in it`, async ({ page }) => {
    const fake = await openGenesis(page);
    const night = await placeNight(page, y);
    await tapTwice(page, night, gap, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    const view = page.getByRole('region', { name: 'Verse view' });
    await expect(view).toBeVisible();
    await expect(view.getByRole('button', { name: 'Diagram', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(view.getByRole('button', { name: 'Listen', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(view.getByRole('button', { name: 'Read it aloud', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(view.getByRole('button', { name: 'Practise', exact: true })).toHaveAttribute('aria-pressed', 'false');
    expect(isDiagram(fake), 'no diagram was asked for').toHaveLength(0);
    await shot(page, `septuagint-english-double-tap-${y}-${gap}`);
  });
}

// every door of the Verse view, by each way into it: a tap within SETTLE_MS of the view opening is dropped
const WAYS: { name: string; open: (page: Page) => Promise<void> }[] = [
  { name: 'a tap on a Septuagint English chunk', open: async (page) => { await page.locator('[data-verse="5"]').getByText('Night', { exact: false }).first().tap(); } },
  { name: 'a verse number', open: async (page) => { await page.getByRole('button', { name: 'Verse 5', exact: true }).tap(); } },
];

async function doorsOf(view: Locator): Promise<Locator[]> {
  const buttons = await view.getByRole('button').all();
  return buttons;
}

for (const way of WAYS) {
  test(`${way.name} opens the Verse view and a tap on every door of it at 100 ms is dropped`, async ({ page }) => {
    const fake = await openGenesis(page);
    await placeNight(page, 300);
    // the page's clock is paused through the opening and the taps, so the host's speed cannot change the 100 ms they follow it by
    await pauseNow(page);
    await way.open(page);
    const view = page.getByRole('region', { name: 'Verse view' });
    await expect(view).toBeVisible();
    // the point of every button of the view, read as it opens, and the state each shows
    const doors = await doorsOf(view);
    const points: { name: string; x: number; y: number; pressed: string | null }[] = [];
    for (const door of doors) {
      const box = await door.boundingBox();
      if (!box) continue;
      points.push({ name: (await door.getAttribute('aria-label')) ?? ((await door.textContent()) ?? '').trim(), x: box.x + box.width / 2, y: box.y + box.height / 2, pressed: await door.getAttribute('aria-pressed') });
    }
    expect(points.length).toBeGreaterThan(6);
    await page.clock.runFor(100);
    for (const point of points) {
      if (point.name === '‹ Reader') continue;
      await page.touchscreen.tap(point.x, point.y);
    }
    await page.clock.resume();
    await pageTime(page, SETTLE_MS + 100);
    await expect(view).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(isDiagram(fake), 'no diagram was asked for').toHaveLength(0);
    for (const name of ['Listen', 'Read it aloud', 'Practise', 'Diagram']) {
      await expect(view.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', name === 'Listen' ? 'true' : 'false');
    }
    await shot(page, 'septuagint-english-double-tap-doors');
  });
}
