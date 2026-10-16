import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { approachOf, orderOf } from '../../src/approaches';
import { startPlacement } from '../../src/data/grammar/placement';
import { openUnlocked } from './unlocked';

// mw-hqd5bz.34: the Start over question and both its answers are on screen without a scroll, sideways too, and only Keep my answers is filled.

const SIZES = [
  { name: 'phone sideways', width: 844, height: 390 },
  { name: 'small phone', width: 360, height: 640 },
  { name: 'phone upright', width: 390, height: 844 },
];

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

async function openKept(page: Page, answers: number) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putGoal(page, '1 John 1:1');
  const first = startPlacement(null, new Map(), orderOf(approachOf('ladder')!), 7);
  const state = { ...first, asked: Array.from({ length: answers }, () => ({ ideaId: 'alphabet', right: true })), questionsLeft: 20 - answers };
  const kept = { goal: '1 John 1:1', approach: 'ladder', state: { ...state, levels: [...state.levels], evidence: [...state.evidence] } };
  await page.evaluate((saved) => localStorage.setItem('lampas.placement', JSON.stringify(saved)), kept);
  await page.goto('/#/placement');
  await expect(page.getByRole('button', { name: 'Start over' })).toBeVisible();
  await page.waitForTimeout(500);
}

// the filled accent buttons: a background that is not clear
const filled = (page: Page) =>
  page.locator('main button').evaluateAll((buttons) =>
    buttons
      .filter((b) => b.getBoundingClientRect().width > 0 && getComputedStyle(b).visibility !== 'hidden' && getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)')
      .map((b) => (b.textContent ?? '').trim()),
  );

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test(`the Start over question and its answers fit ${size.width}x${size.height} without a scroll`, async ({ page }) => {
      await openKept(page, 5);
      await page.getByRole('button', { name: 'Start over' }).click();
      const question = page.getByTestId('start-over-confirm');
      await expect(question).toHaveText('Start over and throw away your 5 answers?');
      for (const target of [question, page.getByRole('button', { name: 'Keep my answers' }), page.getByRole('button', { name: 'Yes, start over' })]) {
        const box = await target.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
      }
      await shot(page, `placement-confirm-${size.width}x${size.height}`);
    });

    test(`only Keep my answers is filled while the question is up at ${size.width}x${size.height}`, async ({ page }) => {
      await openKept(page, 5);
      await expect.poll(() => filled(page)).toEqual(['Go on']);
      await page.getByRole('button', { name: 'Start over' }).click();
      await expect(page.getByTestId('start-over-confirm')).toBeVisible();
      await expect.poll(() => filled(page)).toEqual(['Keep my answers']);
      const yes = page.getByRole('button', { name: 'Yes, start over' });
      expect(await yes.evaluate((b) => getComputedStyle(b).borderTopWidth)).not.toBe('0px');
      // Keep my answers brings Go on back
      await page.getByRole('button', { name: 'Keep my answers' }).click();
      await expect(page.getByRole('button', { name: 'Go on' })).toBeVisible();
      await expect.poll(() => filled(page)).toEqual(['Go on']);
    });
  });
}
