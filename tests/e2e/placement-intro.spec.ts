import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// mw-86e9r1.20: the placement intro says what 'Start from the letters' is, and nothing it says hides a button, upright or sideways.

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

async function openIntro(page: Page, kept: number) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putGoal(page, '1 John 1:1');
  await page.goto('/#/placement');
  await expect(page.getByTestId('placement-goal')).toBeVisible();
  await page.waitForTimeout(500);
  // kept answers are made the way he makes them: answer, then come back to the intro
  for (let i = 0; i < kept; i++) {
    if (i === 0) await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.locator('[data-option]').first().click();
    if (i < kept - 1) await page.getByTestId('next').click();
  }
  if (kept > 0) {
    await page.goto('/#/goal');
    await page.goto('/#/placement');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Go on' })).toBeVisible();
    await page.waitForTimeout(500);
  }
}

const NOTE = /Start from the letters is for someone who cannot yet read Greek: no quiz, and Learn next begins with The Greek alphabet\. Start is a quiz of the grammar your goal needs\./;

test.describe('phone upright', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the note says what Start from the letters does and both buttons are in view without scrolling', async ({ page }) => {
    await openIntro(page, 0);
    const note = page.getByTestId('letters-note');
    await expect(note).toBeVisible();
    await expect(note).toHaveText(NOTE);
    for (const target of [note, page.getByRole('button', { name: 'Start', exact: true }), page.getByRole('button', { name: 'Start from the letters' })]) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    }
    await shot(page, 'placement-intro-390x844');
  });

  test('with kept answers the note is not drawn', async ({ page }) => {
    await openIntro(page, 5);
    await expect(page.getByRole('button', { name: 'Go on' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start over' })).toBeVisible();
    await expect(page.getByTestId('letters-note')).toHaveCount(0);
  });
});

test.describe('phone sideways', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('both buttons are reachable by scrolling and the note hides neither', async ({ page }) => {
    await openIntro(page, 0);
    const note = page.getByTestId('letters-note');
    await expect(note).toHaveText(NOTE);
    const start = page.getByRole('button', { name: 'Start', exact: true });
    const letters = page.getByRole('button', { name: 'Start from the letters' });
    await letters.scrollIntoViewIfNeeded();
    await start.scrollIntoViewIfNeeded();
    const rect = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!;
    const [n, s, l] = [await rect(note), await rect(start), await rect(letters)];
    // nothing overlaps: each sits wholly above the next
    for (const [a, b] of [[s, l], [l, n]] as const) expect(a.y + a.height).toBeLessThanOrEqual(b.y + 0.5);
    await letters.scrollIntoViewIfNeeded();
    const after = await rect(letters);
    expect(after.y).toBeGreaterThanOrEqual(0);
    expect(after.y + after.height).toBeLessThanOrEqual(390);
    await shot(page, 'placement-intro-844x390');
  });
});
