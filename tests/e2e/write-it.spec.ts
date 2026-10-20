import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Write it (mw-86e9r1.51) at a phone's width: on Omicron's sheet, with a pen seen, the Write it card's pad fills the width, Clear, Check and Skip
// are the same size, at least 44 px and in view, and an ο written on the pad (here with the mouse, which the pad takes like a finger) is Right.

/** Puts a row in the app's own settings store through raw IndexedDB, as the app wrote it. */
async function putSetting(page: Page, row: { key: string; value: string }) {
  await page.evaluate(
    (r) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put(r);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    row,
  );
}

test('the Write it card fits a phone, its three buttons the same size, and an ο written on it is Right', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSetting(page, { key: 'goal', value: '1 John 1:1' });
  await putSetting(page, { key: 'penSeen', value: 'yes' });
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
  await page.getByRole('button', { name: 'About omicron' }).click();
  const letter = page.getByRole('dialog', { name: 'Idea', exact: true }).nth(1);
  const part = letter.getByTestId('lesson-write-it');
  await part.scrollIntoViewIfNeeded();
  await expect(part.getByTestId('write-why')).toBeVisible();
  await part.getByRole('button', { name: 'Write it', exact: true }).click();

  const card = page.getByRole('dialog', { name: 'Write it' }).getByTestId('write-it');
  await expect(card).toHaveAttribute('data-stage', 'trace');
  const pad = card.getByTestId('writing-pad');
  const box = (await pad.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.width).toBeGreaterThan(300);
  await expect(card.getByTestId('write-under').getByTestId('write-model')).toBeVisible();

  const sizes = [];
  for (const name of ['Clear', 'Check', 'Skip']) {
    const b = (await card.getByRole('button', { name }).boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.y + b.height).toBeLessThanOrEqual(844);
    sizes.push(`${Math.round(b.width)}x${Math.round(b.height)}`);
  }
  expect(new Set(sizes).size).toBe(1);

  // an ο: one round stroke in the middle of the pad
  const [cx, cy, r] = [box.x + box.width / 2, box.y + box.height / 2, Math.min(box.width, box.height) / 4];
  await page.mouse.move(cx + r, cy);
  await page.mouse.down();
  for (let i = 1; i <= 40; i += 1) await page.mouse.move(cx + r * Math.cos((i / 40) * 2 * Math.PI), cy - r * Math.sin((i / 40) * 2 * Math.PI));
  await page.mouse.up();
  await expect(pad).toHaveAttribute('data-strokes', '1');
  await shot(page, 'write-it-trace');
  await card.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(card.getByTestId('write-verdict')).toHaveText('Right');
  await shot(page, 'write-it-right');
});
