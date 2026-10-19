import { expect, test, type Locator, type Page } from '@playwright/test';
import { SETTLE_MS } from '../../src/ui/settle';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// mw-5r3p30.558: on the Xi sheet a quick double tap on 'Mark known without a drill' left the idea at Learning. The first tap marked it known and the
// button went; the bar under the examples shrank and the level slider moved into its place, where the second tap landed and set Learning. A control on
// a sheet that goes away when tapped must end a double tap where one tap does. Every such control of the idea sheet is double-tapped here, 120 ms
// apart (inside SETTLE_MS) on the page's clock, and the state after two taps is the state after one.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const GAP_MS = 120;
const ideas = (page: Page) => page.getByRole('dialog', { name: 'Idea' });

// tapTwice (tests/support/gesture.ts) times the two taps on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

// Puts the goal in the app's own settings store through raw IndexedDB, as the app wrote it.
async function putGoal(page: Page, goal: string) {
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'goal', value });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    goal,
  );
}

/** The sheet of a letter ('Xi') of The Greek alphabet, over the Learn sheet, loaded and its settle moment passed; the settle moment is as on his phone (openUnlocked starts it at 0). */
async function openLetter(page: Page, letter: string): Promise<Locator> {
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putGoal(page, '1 John 1:1');
  await page.goto('/#/goal');
  await page.reload();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await page.getByTestId('learn-next').click();
  const learn = ideas(page).first();
  await expect(learn.getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  await expect(learn.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await page.waitForTimeout(SETTLE_MS + 100);
  await learn.getByRole('button', { name: `About ${letter.toLowerCase()}` }).click();
  await expect(ideas(page)).toHaveCount(2);
  const sheet = ideas(page).nth(1);
  await expect(sheet.getByRole('heading', { name: letter })).toBeVisible();
  await expect(sheet.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await page.waitForTimeout(SETTLE_MS + 100);
  return sheet;
}

test('a double tap on Mark known without a drill leaves the idea at I know it, as one tap does', async ({ page }) => {
  const xi = await openLetter(page, 'Xi');
  const mark = xi.getByRole('button', { name: 'Mark known without a drill', exact: true });
  await tapTwice(page, mark, GAP_MS, { touch: true });
  await page.waitForTimeout(SETTLE_MS);
  await expect(xi.getByRole('slider', { name: 'Your level' })).toHaveAttribute('aria-valuetext', 'I know it');
  await expect(mark).toHaveCount(0);
  await expect(xi.getByTestId('idea-level')).not.toContainText('Frontier');
  await shot(page, 'idea-sheet-mark-known-twice');
});

test('one tap on Mark known without a drill leaves the idea at I know it (the control)', async ({ page }) => {
  const xi = await openLetter(page, 'Xi');
  await xi.getByRole('button', { name: 'Mark known without a drill', exact: true }).click();
  await page.waitForTimeout(SETTLE_MS);
  await expect(xi.getByRole('slider', { name: 'Your level' })).toHaveAttribute('aria-valuetext', 'I know it');
  await expect(xi.getByTestId('idea-level')).not.toContainText('Frontier');
});

test('a double tap on Show N more shows the rest and opens nothing under the second tap', async ({ page }) => {
  const chi = await openLetter(page, 'Chi');
  await expect(chi.getByTestId('idea-example').first()).toBeAttached();
  const all = await chi.getByTestId('idea-example').count();
  expect(all, 'Chi has more examples than the three drawn first').toBeGreaterThan(3);
  const more = chi.getByRole('button', { name: `Show ${all - 3} more`, exact: true });
  await tapTwice(page, more, GAP_MS, { touch: true });
  await page.waitForTimeout(SETTLE_MS);
  await expect(chi.locator('[data-testid="idea-example"]:visible')).toHaveCount(all);
  await expect(more).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Word' })).toHaveCount(0);
  await expect(ideas(page)).toHaveCount(2);
  await shot(page, 'idea-sheet-show-more-twice');
});
