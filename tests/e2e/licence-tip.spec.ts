import { expect, test, type Page } from '@playwright/test';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlicensed } from './unlocked';

// The licence tip (mw-8m9dyu.6): a free reader is told once, on the third visit, what a licence adds, in one quiet line at the foot of the Reader;
// Learn more opens the Licence page and Back returns; a Settings row's Needs a licence does the same and Back returns to that row.

/** A phone that has opened Lampas on `earlier` different days already; src/main.tsx counts today as one more. Only the first load sets it. */
async function onVisit(page: Page, visit: number): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.addInitScript((earlier) => {
    if (earlier > 0 && !window.localStorage.getItem('lampas.visits')) window.localStorage.setItem('lampas.visits', JSON.stringify({ count: earlier, last: '2020-01-01' }));
  }, visit - 1);
}

const tip = (page: Page) => page.getByRole('note', { name: 'About a licence' });

test('the first and second visit show no tip', async ({ page }) => {
  await onVisit(page, 1);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
  const second = await page.context().newPage();
  await onVisit(second, 2);
  await second.goto('/');
  await expect(second.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(second)).toHaveCount(0);
});

test('the third visit shows the tip at the foot; Learn more opens the Licence page and Back returns to the Reader', async ({ page }) => {
  await onVisit(page, 3);
  await page.goto('/#/?c=8&view=greek');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toBeVisible();
  await expect(tip(page)).toContainText('Lampas is free to read. A licence adds a tutor you can ask about any word or verse, and one that listens to you read a verse aloud.');
  await expect(tip(page)).not.toContainText('Read it aloud');
  // at the foot, above the phone's bar, and a thumb's size to tap; the tip slides in (mw-8m9dyu.13), so measure it where it comes to rest
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const box = (await tip(page).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(box.y).toBeGreaterThan(844 / 2);
  for (const name of ['Learn more', 'Close']) {
    const b = (await tip(page).getByRole('button', { name }).boundingBox())!;
    expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
  }
  await shot(page, 'licence-tip');

  await tip(page).getByRole('button', { name: 'Learn more' }).click();
  await expect(page.getByRole('heading', { name: 'Licence', level: 1 })).toBeVisible();
  await expect(page.getByTestId('how-to-licence')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await shot(page, 'licence-page-from-tip');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  expect(page.url()).toContain('view=greek');
  await expect(tip(page)).toHaveCount(0);

  // never again: not on a reload either
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
});

// Sideways (mw-8m9dyu.11): the tip is one slim row, so most of a short window is still the text.
test.describe('the tip on a phone held sideways', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('is one slim row under a quarter of the window and leaves the reading box taller than itself', async ({ page }) => {
    await onVisit(page, 3);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/#/?c=8&view=greek');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await expect(tip(page)).toBeVisible();
    // the tip slides in (mw-8m9dyu.13): measure it where it comes to rest
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const box = (await tip(page).boundingBox())!;
    expect(box.height).toBeLessThan(390 * 0.25);
    expect(box.y + box.height).toBeLessThanOrEqual(390);
    const reader = (await page.locator('main[data-reader]').boundingBox())!;
    expect(reader.height).toBeGreaterThan(box.height);
    // the sentence, Learn more and Close sit side by side, each still a thumb's size
    const learn = (await tip(page).getByRole('button', { name: 'Learn more' }).boundingBox())!;
    const close = (await tip(page).getByRole('button', { name: 'Close' }).boundingBox())!;
    const text = (await tip(page).locator('p').boundingBox())!;
    for (const b of [learn, close]) expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
    expect(learn.x).toBeGreaterThanOrEqual(text.x + text.width - 1);
    expect(close.x).toBeGreaterThanOrEqual(learn.x + learn.width - 1);
    await shot(page, 'licence-tip-sideways');
  });
});

test('closing the tip ends it for good', async ({ page }) => {
  await onVisit(page, 3);
  await page.goto('/');
  await tip(page).getByRole('button', { name: 'Close' }).click();
  await expect(tip(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
});

test('a Settings row’s Needs a licence opens the Licence page and Back returns to that row', async ({ page }) => {
  await onVisit(page, 1);
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const rows = page.getByRole('button', { name: 'Needs a licence' });
  await expect(rows.first()).toBeVisible();
  const last = rows.last();
  await last.scrollIntoViewIfNeeded();
  const before = (await last.boundingBox())!;
  await last.click();
  await expect(page.getByRole('heading', { name: 'Licence', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(last).toBeInViewport();
  await expect.poll(async () => Math.abs(((await last.boundingBox())?.y ?? -999) - before.y)).toBeLessThan(2);
});

test('the Licence page’s own back button returns to where it was opened from', async ({ page }) => {
  await onVisit(page, 3);
  await page.goto('/');
  await tip(page).getByRole('button', { name: 'Learn more' }).click();
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
});

// A quick double tap (mw-8m9dyu.10): the first tap on a control that removes itself lets the text slide into its place; the second tap, at the same point,
// must not land on a word and open its sheet.
test.describe('a double tap on the tip', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  // tapTwice (tests/support/gesture.ts) times the two taps on the page's clock, so it is installed before the page opens.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
  });

  /**
   * Scrolls the Reader until a Greek word lies under `name`'s button (the word is there all along, under the tip), and returns a point inside both: the
   * place his thumb is, and the word that slides under it when the tip goes.
   */
  async function pointOverAWord(page: Page, name: string): Promise<{ x: number; y: number }> {
    const box = (await tip(page).getByRole('button', { name }).boundingBox())!;
    const found = await page.evaluate(({ left, top, right, bottom }) => {
      const main = document.querySelector<HTMLElement>('[data-reader]')!;
      for (let at = 0; at < 900; at += 6) {
        main.scrollTop = at;
        for (const word of document.querySelectorAll<HTMLElement>('[data-word]')) {
          const r = word.getBoundingClientRect();
          const x1 = Math.max(r.left, left + 4);
          const x2 = Math.min(r.right, right - 4);
          const y1 = Math.max(r.top, top + 4);
          const y2 = Math.min(r.bottom, bottom - 4);
          if (x2 - x1 >= 4 && y2 - y1 >= 4) return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
        }
      }
      return null;
    }, { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height });
    expect(found, `a Greek word can be scrolled under ${name}`).not.toBeNull();
    return found!;
  }

  /** Two touch taps at one point inside `name`'s button, a thumb's beat apart (the Tester's were about 100 ms), with a word under that point. */
  async function tapOverAWordTwice(page: Page, name: string): Promise<void> {
    await tapTwice(page, await pointOverAWord(page, name), 100, { touch: true });
  }

  test('two quick taps on Close in the Greek view close the tip and open no word sheet', async ({ page }) => {
    await onVisit(page, 3);
    await page.goto('/#/?c=8&view=greek');
    await expect(tip(page)).toBeVisible();
    await tapOverAWordTwice(page, 'Close');
    await expect(tip(page)).toHaveCount(0);
    await page.waitForTimeout(600);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await shot(page, 'licence-tip-double-tap');
  });

  test('two quick taps on Learn more open no dialog', async ({ page }) => {
    await onVisit(page, 3);
    await page.goto('/#/?c=8&view=greek');
    await expect(tip(page)).toBeVisible();
    await tapOverAWordTwice(page, 'Learn more');
    await expect(page.getByRole('heading', { name: 'Licence', level: 1 })).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
