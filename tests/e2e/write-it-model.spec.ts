import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The model letter Write it draws (mw-86e9r1.55): alpha at the Copy stage was a C bowl and a separate slash with a gap between them. Its strokes now join.

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

/** The first and last point of a path drawn as 'M x y L x y ...'. */
function ends(d: string): { first: [number, number]; last: [number, number] } {
  const points = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);
  return { first: points[0], last: points[points.length - 1] };
}

test('the model alpha at the Copy stage is one joined letter, with no gap between its strokes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSetting(page, { key: 'goal', value: '1 John 1:1' });
  await putSetting(page, { key: 'penSeen', value: 'yes' });
  await putSetting(page, { key: 'handwritingWhy', value: 'seen' });
  await putSetting(page, { key: 'handwritingProgress', value: JSON.stringify({ α: { stage: 'copy', rights: 0 } }) });
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
  await page.getByRole('button', { name: 'About alpha' }).click();
  const letter = page.getByRole('dialog', { name: 'Idea' }).nth(1);
  const part = letter.getByTestId('lesson-write-it');
  await part.scrollIntoViewIfNeeded();
  await part.getByRole('button', { name: 'Write it', exact: true }).click();

  const card = page.getByRole('dialog', { name: 'Write it' }).getByTestId('write-it');
  await expect(card).toHaveAttribute('data-stage', 'copy');
  const model = card.getByTestId('write-beside').getByTestId('write-model');
  await expect(model).toBeVisible();

  const paths = await model.locator('path').evaluateAll((all) => all.map((p) => p.getAttribute('d') ?? ''));
  expect(paths.length).toBeGreaterThan(0);
  // a second stroke, if there is one, starts where the first one ends (within 0.08 of a design unit)
  for (let i = 1; i < paths.length; i += 1) {
    const [a, b] = [ends(paths[i - 1]).last, ends(paths[i]).first];
    expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `stroke ${i} starts ${Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2)} from the end of stroke ${i - 1}`).toBeLessThanOrEqual(0.08);
  }
  await shot(page, 'write-it-alpha-model');
});
