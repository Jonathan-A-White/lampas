import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

// The settings search lives on Settings alone (mw-5r3p30.617): no header and not the Reader's chip row has a magnifier, and Settings keeps its field pinned at the top.
test.use({ viewport: { width: 390, height: 844 } });

const finder = (page: Page) => page.getByRole('button', { name: 'Find a setting' });

for (const [name, path] of [
  ['the Reader', '/#/?b=rom&c=8'],
  ['Home', '/#/'],
  ['Words', '/#/words'],
  ['Review', '/#/review'],
  ['Goal', '/#/goal'],
] as const) {
  test(`${name} has no Find a setting control`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(finder(page)).toHaveCount(0);
    await expect(page.locator('[data-settings-search]')).toHaveCount(0);
  });
}

test('on Settings the search field stays in view at the last section, and typing a setting filters the rows', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await expect(search).toBeInViewport();
  const main = page.locator('main.screen');
  await main.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(500);
  await expect(search).toBeInViewport();
  // pinned just under the header
  const header = await page.locator('header').first().boundingBox();
  const box = await search.boundingBox();
  expect(box && header && box.y >= header.y + header.height - 1 && box.y <= header.y + header.height + 24).toBe(true);
  await shot(page, 'settings-search-pinned');

  await search.fill('text size');
  await expect(page.locator('[data-setting="textSize"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Greek pronunciation', level: 2 })).toHaveCount(0);
  await expect(search).toBeInViewport();
});

for (const size of [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
]) {
  test(`every chip in the Reader's row draws its whole label at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const done = (): string[] => [
            ...Array.from({ length: 50 }, (_, i) => `gen.${i + 1}`),
            ...Array.from({ length: 40 }, (_, i) => `exo.${i + 1}`),
            'lev.1',
            'lev.2',
            'lev.3',
          ];
          const open = indexedDB.open('lampas');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('settings', 'readwrite');
            const rows = [
              { key: 'audioBible', value: 'word-of-promise' },
              { key: 'readingPlan', value: 'on' },
              { key: 'goal', value: '1 John 1:1' },
              { key: 'weave', value: 'solid+learning' },
              // a plan started at Leviticus 4, with Genesis to Leviticus 3 done: the Today chip leads the row (Today holds the plan's 'Next: Leviticus 4')
              { key: 'readingPlanState', value: JSON.stringify({ planId: 'whole-bible', start: { code: 'lev', chapter: 4 }, done: done() }) },
            ];
            for (const row of rows) tx.objectStore('settings').put(row);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    const row = page.getByTestId('reader-chips');
    await expect(row).toBeVisible();
    // the first open's seed (his words and their schedule) is what the goal and the woven count are drawn from: Today's Review count says it is in
    await waitForDue(page);
    await expect(page.getByTestId('goal-strip')).toBeVisible();
    await expect(page.getByTestId('weave-count')).toBeVisible();
    const measured = await row.locator('button, [data-testid="weave-count"]').evaluateAll((els) =>
      els.map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const style = getComputedStyle(el);
        const inner = (el as HTMLElement).clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return { name: el.getAttribute('aria-label') ?? el.textContent, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, text: range.getBoundingClientRect().width, inner };
      }),
    );
    expect(measured.length).toBeGreaterThanOrEqual(3);
    for (const chip of measured) {
      expect(chip.scrollWidth, `${chip.name} is clipped`).toBeLessThanOrEqual(chip.clientWidth);
      expect(chip.clientWidth, `${chip.name} is narrower than its text`).toBeGreaterThanOrEqual(chip.text - 0.5);
    }
    await shot(page, `reader-chips-whole-${size.width}x${size.height}`);
  });
}
