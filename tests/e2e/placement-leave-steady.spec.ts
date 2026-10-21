import { expect, test, type Page } from '@playwright/test';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { SETTLE_MS } from '../../src/ui/settle';

// mw-86e9r1.22: a fast double tap on the placement end card's 'Back to the goal' lands its second tap on the Goal screen, where the Grammar ideas bar
// now sits under the same spot; it opened the ideas list ('Not yet (35)'). Leaving the placement swallows a tap in the settle moment after it.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

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

/** The end card after Start from the letters, with the settle moment put back (openUnlocked starts it at 0) and passed. */
async function openEndCard(page: Page) {
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putGoal(page, '1 John 1:1');
  await page.goto('/#/goal');
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  // a new screen takes no tap in its first moment (src/ui/tapGuard.ts): he reads it first
  await page.waitForTimeout(SETTLE_MS + 100);
  await page.getByRole('button', { name: 'Place me' }).click();
  await page.waitForTimeout(SETTLE_MS + 100);
  await page.getByRole('button', { name: 'Start from the letters' }).click();
  await expect(page.getByTestId('where')).toBeVisible();
  await page.waitForTimeout(SETTLE_MS + 100);
}

const centre = async (page: Page, name: string) => {
  const box = await page.getByRole('button', { name }).boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
};

test('a double tap on Back to the goal shows the Goal and leaves its ideas list shut', async ({ page }) => {
  await openEndCard(page);
  const { x, y } = await centre(page, 'Back to the goal');
  const bar = page.getByTestId('ideas-bar');

  // 120 ms apart on the page's clock, inside the settle moment (SETTLE_MS), however slowly the host delivers the taps
  await tapTwice(page, { x, y }, 120, {
    touch: true,
    between: async () => {
      // the second tap of the pair: the Goal is drawn and the Grammar ideas bar is under the spot
      await expect(bar).toBeVisible();
      expect(await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('[data-testid="ideas-bar"]') !== null, [x, y])).toBe(true);
    },
  });

  await page.waitForTimeout(SETTLE_MS);
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await expect(bar).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('ideas-list')).toHaveCount(0);
  await shot(page, 'placement-leave-double-tap');
});

test('one deliberate tap on Back to the goal leaves at once, and the Goal takes a tap after the moment', async ({ page }) => {
  await openEndCard(page);
  const { x, y } = await centre(page, 'Back to the goal');
  await page.touchscreen.tap(x, y);
  // the tap leaves (an end state, waited on under the config's budget): it is not swallowed for want of an earlier tap
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');

  await page.waitForTimeout(SETTLE_MS + 100);
  await page.getByTestId('ideas-bar').tap();
  await expect(page.getByTestId('ideas-bar')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('ideas-list')).toBeVisible();
});
