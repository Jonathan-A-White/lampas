import { expect, test, type Locator, type Page } from '@playwright/test';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { SETTLE_MS } from '../../src/ui/settle';

// mw-i7xe0n.26: a fast second tap on a sheet's Done, or on its Drill it, landed on whatever stood under the same spot once the sheet was gone or the
// drill was drawn. The Learn sheet's Done: the Goal screen's Change opened Settings. The Rho sheet's Done: the Learn sheet's own Done closed it too.
// The Rho sheet's Drill it: the drill's Hint took two answers away ('Hint used'). A sheet that opens or closes swallows a tap in the settle moment
// after it (the app-wide guard, src/ui/tapGuard.ts).
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

const ideas = (page: Page) => page.getByRole('dialog', { name: 'Idea' });

/** The Goal screen of 1 John with the settle moment put back (openUnlocked starts it at 0), Learn next tapped: the Learn sheet, loaded, its moment passed. */
async function openLearnSheet(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putGoal(page, '1 John 1');
  await page.goto('/#/goal');
  await page.reload();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1');
  await page.getByTestId('learn-next').click();
  const learn = ideas(page).first();
  await expect(learn.getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  await expect(learn.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await page.waitForTimeout(SETTLE_MS + 100);
  return learn;
}

/** About rho on the Learn sheet: the Rho sheet over it, loaded, its moment passed. */
async function openRho(page: Page, learn: Locator): Promise<Locator> {
  await learn.getByRole('button', { name: 'About rho' }).click();
  await expect(ideas(page)).toHaveCount(2);
  const rho = ideas(page).nth(1);
  await expect(rho.getByRole('heading', { name: 'Rho' })).toBeVisible();
  await expect(rho.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await page.waitForTimeout(SETTLE_MS + 100);
  return rho;
}

const centre = async (target: Locator) => {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
};

/**
 * A thumb's double tap on `target`, 120 ms apart: the first tap, then `drawn` (what the first tap brings is on screen and `under` stands at the spot),
 * then the second tap on the same spot while the settle moment still runs.
 */
async function thumbDoubleTap(page: Page, target: Locator, drawn: () => Promise<void>, under: { name: string; inside: string }) {
  const { x, y } = await centre(target);
  // 120 ms apart on the page's clock, inside the settle moment (SETTLE_MS), however slowly the host delivers the taps
  await tapTwice(page, { x, y }, 120, {
    touch: true,
    between: async () => {
      await drawn();
      // the second tap lands on the control the Tester's did
      const hit = await page.evaluate(([px, py, inside]) => {
        const button = document.elementFromPoint(px, py)?.closest('button');
        return button?.closest(inside) ? button.textContent?.trim() : null;
      }, [x, y, under.inside] as const);
      expect(hit).toBe(under.name);
    },
  });
  await page.waitForTimeout(SETTLE_MS);
}

test('a double tap on the Learn sheet\'s Done closes it and leaves Settings shut', async ({ page }) => {
  const learn = await openLearnSheet(page);
  await thumbDoubleTap(page, learn.getByRole('button', { name: 'Done', exact: true }), () => expect(ideas(page)).toHaveCount(0), { name: 'Change', inside: 'main' });

  await expect(page).toHaveURL(/#\/goal$/);
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1');
  await shot(page, 'sheet-leave-learn-done-twice');
});

test('a double tap on the Rho sheet\'s Done closes Rho and leaves the Learn sheet open', async ({ page }) => {
  const rho = await openRho(page, await openLearnSheet(page));
  await thumbDoubleTap(page, rho.getByRole('button', { name: 'Done', exact: true }), () => expect(ideas(page)).toHaveCount(1), { name: 'Done', inside: '[role="dialog"][aria-label="Idea"]' });

  await expect(ideas(page)).toHaveCount(1);
  await expect(ideas(page).getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  await shot(page, 'sheet-leave-rho-done-twice');
});

test('a double tap on the Rho sheet\'s Drill it opens the drill with its Hint unspent', async ({ page }) => {
  const rho = await openRho(page, await openLearnSheet(page));
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  await thumbDoubleTap(page, rho.getByRole('button', { name: 'Drill it', exact: true }), () => expect(drill.getByTestId('grammar-prompt')).toBeVisible(), { name: 'Hint', inside: '[role="dialog"][aria-label="Drill it"]' });

  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
  await expect(drill.getByTestId('hint-line')).toHaveCount(0);
  await expect(drill.getByRole('button', { name: 'Hint used', exact: true })).toHaveCount(0);
  await expect(drill.locator('[data-option][data-result]')).toHaveCount(0);
  await shot(page, 'sheet-leave-rho-drill-twice');

  // a Hint he taps after reading the question still takes answers away
  await drill.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(drill.getByRole('button', { name: 'Hint used', exact: true })).toBeDisabled();
});

test('one deliberate tap on the Learn sheet\'s Done closes it at once, and Change takes a tap after the moment', async ({ page }) => {
  const learn = await openLearnSheet(page);
  await learn.getByRole('button', { name: 'Done', exact: true }).tap();
  await expect(ideas(page)).toHaveCount(0, { timeout: 1000 });
  await page.waitForTimeout(SETTLE_MS + 100);
  await page.getByRole('button', { name: 'Change', exact: true }).tap();
  await expect(page).toHaveURL(/#\/settings/);
});
