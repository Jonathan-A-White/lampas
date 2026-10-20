import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openToday, todayChip } from './today-chip';
import { openUnlocked } from './unlocked';

// The Reader's Today chip (src/today/TodayChip.tsx, mw-1fwagb.6): it replaced the Due and Plan chips, counts the pieces Today holds and those he ticked, and opens Today.
test.use({ viewport: { width: 390, height: 844 } });

const DAILY = ['dailyReview', 'dailyPlan', 'dailyPsalms', 'dailyDevotional'];
/** The day's pieces with a box: Review, plan, devotional and each of the Psalms and Proverbs (on day N: Psalms N, N+30, ... up to 150, and Proverbs N). */
const piecesToday = (): number => {
  const day = new Date().getDate();
  return 3 + [0, 30, 60, 90, 120].filter((n) => day + n <= 150).length + (day <= 31 ? 1 : 0);
};

/** Puts rows in the app's own settings store through raw IndexedDB, as the app wrote them. */
async function putSettings(page: Page, rows: { key: string; value: string }[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          for (const row of list) tx.objectStore('settings').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

/** Opens the Reader, then puts `rows` in the store and reloads so the app reads them. */
async function openReader(page: Page, rows: { key: string; value: string }[] = []) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  if (rows.length > 0) {
    await putSettings(page, rows);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  }
}

test('the Reader shows the Today chip and no Due or Plan chip; it opens Today and ticking a piece changes its count', async ({ page }) => {
  await openReader(page);
  const chip = todayChip(page);
  const n = piecesToday();
  await expect(chip).toHaveText(`Today · 0 of ${n}`);
  await expect(chip).toHaveAccessibleName(`Today · 0 of ${n}`);
  await expect(page.getByRole('button', { name: /^Due:/ })).toHaveCount(0);
  await expect(page.getByTestId('plan-chip')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Next: |^Listen through the Bible/ })).toHaveCount(0);
  const box = await chip.boundingBox();
  const row = await page.getByTestId('reader-chips').boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(38);
  expect(box && row && box.y >= row.y - 0.5 && box.y + box.height <= row.y + row.height + 0.5).toBe(true);
  await shot(page, 'today-chip');

  await openToday(page);
  await page.getByRole('checkbox', { name: 'Done: Review' }).click();
  await expect(page.getByRole('checkbox', { name: 'Done: Review' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(chip).toHaveText(`Today · 1 of ${n}`);

  // a tick survives a reload, and taking it away counts it out again
  await page.reload();
  await expect(chip).toHaveText(`Today · 1 of ${n}`);
  await openToday(page);
  await page.getByRole('checkbox', { name: 'Done: Review' }).click();
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(chip).toHaveText(`Today · 0 of ${n}`);
});

test('a piece switched off is not counted, and with Tick boxes off the chip says just Today', async ({ page }) => {
  await openReader(page, [{ key: 'dailyPsalms', value: 'off' }]);
  await expect(todayChip(page)).toHaveText('Today · 0 of 3');

  await putSettings(page, [{ key: 'dailyTicks', value: 'off' }]);
  await page.reload();
  await expect(todayChip(page)).toHaveText('Today');
  await expect(todayChip(page)).toHaveAccessibleName('Today');
  await todayChip(page).click();
  await expect(page.getByRole('heading', { name: 'Today', exact: true, level: 1 })).toBeVisible();
});

test('with every Daily piece off the Reader has no Today chip', async ({ page }) => {
  await openReader(page, DAILY.map((key) => ({ key, value: 'off' })));
  await expect(page.getByTestId('new-words').or(page.getByTestId('weave-count')).or(page.getByRole('button', { name: 'Settings', exact: true })).first()).toBeVisible();
  await expect(todayChip(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Due:/ })).toHaveCount(0);
  await expect(page.getByTestId('plan-chip')).toHaveCount(0);

  // switching one back on brings the chip back
  await putSettings(page, [{ key: 'dailyDevotional', value: 'on' }]);
  await page.reload();
  await expect(todayChip(page)).toHaveText('Today · 0 of 1');
});

