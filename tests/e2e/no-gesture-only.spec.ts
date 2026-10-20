import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// No gesture-only action (mw-cwf538.4, the epic 'Lampas for every age and every ability'): the Reader's two-finger tap, its page-turning tap and swipe, and
// the long press on a word each have a control with an accessible name, reached here by the keyboard alone (no touch, no pointer gesture). The list of
// them and the control of each is docs/accessibility.md 'Gesture-only actions'. A phone-width layout claim (the controls show only while focused): 390x844.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: false });

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
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

async function openMark12(page: Page, settings: Record<string, string>) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, settings);
  await page.goto('/#/?b=mrk&c=12');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

/** Presses a control with the keyboard: focus, then Enter. */
async function press(page: Page, name: string) {
  const control = page.getByRole('button', { name, exact: true });
  await control.focus();
  await page.keyboard.press('Enter');
}

const away = (page: Page) => page.locator('[data-away]');

test('with no gesture the Immersive reader can be left and entered, and its bars put away and brought back', async ({ page }) => {
  await openMark12(page, { immersiveReader: 'on', immersiveHint: 'off' });
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  await expect(away(page)).toHaveCount(0);

  // the controls are out of sight until the keyboard reaches them
  const toggle = page.getByRole('button', { name: 'Put the bars away', exact: true });
  const group = page.getByRole('group', { name: 'Reading controls' });
  expect((await group.boundingBox())?.height).toBeLessThanOrEqual(2);
  await toggle.focus();
  expect((await group.boundingBox())?.height).toBeGreaterThan(40);
  await shot(page, 'no-gesture-immersive-controls');

  await page.keyboard.press('Enter');
  await expect(away(page).first()).toBeAttached();
  await expect(page.getByRole('button', { name: 'Show the bars', exact: true })).toBeAttached();
  await press(page, 'Show the bars');
  await expect(away(page)).toHaveCount(0);

  await press(page, 'Leave immersive reading');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'off');
  await expect(page.getByRole('button', { name: 'Start immersive reading', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Put the bars away' })).toHaveCount(0);

  await press(page, 'Start immersive reading');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  await expect(page.getByRole('button', { name: 'Put the bars away', exact: true })).toBeAttached();
});

test('with no gesture a word can be heard', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
  await openMark12(page, {});
  const word = page.locator('[data-verse="1"] [data-chunk="0"]');
  await word.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  const heard = page.getByRole('button', { name: 'Hear it', exact: true }).first();
  await heard.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
  const said = (await spoken(page)).at(-1);
  expect(said?.lang).toMatch(/^el/);
});

test('with no gesture a page can be turned, forward and back, and a chapter opened', async ({ page }) => {
  await openMark12(page, { readingMode: 'pages' });
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const place = page.locator('[data-place-line]');
  const pageOf = async () => Number(((await place.textContent()) ?? '').match(/Page (\d+) of/)?.[1]);
  await expect.poll(async () => ((await place.textContent()) ?? '').match(/of (\d+)$/)?.[1] ?? '1').not.toBe('1');
  expect(await pageOf()).toBe(1);

  await press(page, 'Next page');
  await expect.poll(pageOf).toBe(2);
  await press(page, 'Next page');
  await expect.poll(pageOf).toBe(3);
  await press(page, 'Previous page');
  await expect.poll(pageOf).toBe(2);
  await shot(page, 'no-gesture-pages');
});

test('with no gesture the chapter after this one opens (the swipe has its buttons)', async ({ page }) => {
  await openMark12(page, {});
  const next = page.getByRole('navigation', { name: 'Chapters', exact: true }).getByRole('button', { name: /Mark 13/ });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Mark 13', level: 1 })).toBeVisible();
});
