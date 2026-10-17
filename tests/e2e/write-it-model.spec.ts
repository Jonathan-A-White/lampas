import { expect, test, type Locator, type Page } from '@playwright/test';
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

  const paths = await model.locator('path.glyph-stroke').evaluateAll((all) => all.map((p) => p.getAttribute('d') ?? ''));
  expect(paths.length).toBeGreaterThan(0);
  // a second stroke, if there is one, starts where the first one ends (within 0.08 of a design unit)
  for (let i = 1; i < paths.length; i += 1) {
    const [a, b] = [ends(paths[i - 1]).last, ends(paths[i]).first];
    expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `stroke ${i} starts ${Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2)} from the end of stroke ${i - 1}`).toBeLessThanOrEqual(0.08);
  }
  await shot(page, 'write-it-alpha-model');
});

// Write it teaches the form (mw-86e9r1.56): the numbered start point of each stroke stays on the model after it has been drawn, at Trace, at Copy and in
// the 'Not quite' replay, inside the model's box, with a plain line under it that says how many strokes.

/** Opens Write it for alpha at the stage given and returns the card. */
async function openAlpha(page: Page, stage: 'trace' | 'copy') {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSetting(page, { key: 'goal', value: '1 John 1:1' });
  await putSetting(page, { key: 'penSeen', value: 'yes' });
  await putSetting(page, { key: 'handwritingWhy', value: 'seen' });
  await putSetting(page, { key: 'handwritingProgress', value: JSON.stringify({ α: { stage, rights: 0 } }) });
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
  await page.getByRole('button', { name: 'About alpha' }).click();
  const part = page.getByRole('dialog', { name: 'Idea' }).nth(1).getByTestId('lesson-write-it');
  await part.scrollIntoViewIfNeeded();
  await part.getByRole('button', { name: 'Write it', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Write it' }).getByTestId('write-it');
  await expect(card).toHaveAttribute('data-stage', stage);
  return card;
}

/** Marker 1 is drawn, its dot is inside the box of the model it belongs to, and the animation has finished. */
async function markerShown(model: Locator) {
  await expect(model).toBeVisible();
  const marker = model.locator('[data-start-marker="1"]');
  await expect(marker).toBeVisible();
  await expect(marker.locator('text')).toHaveText('1');
  await expect(model.locator('[data-direction="1"]')).toBeVisible();
  await expect.poll(() => model.locator('path.glyph-stroke').last().evaluate((p) => getComputedStyle(p).strokeDashoffset)).toBe('0px');
  const [outer, dot] = [(await model.boundingBox())!, (await marker.locator('circle').boundingBox())!];
  expect(dot.x).toBeGreaterThanOrEqual(outer.x);
  expect(dot.y).toBeGreaterThanOrEqual(outer.y);
  expect(dot.x + dot.width).toBeLessThanOrEqual(outer.x + outer.width);
  expect(dot.y + dot.height).toBeLessThanOrEqual(outer.y + outer.height);
}

test('alpha at Trace keeps its numbered start point after it is drawn, with the stroke line under it, the buttons in view', async ({ page }) => {
  const card = await openAlpha(page, 'trace');
  await markerShown(card.getByTestId('write-under').getByTestId('write-model'));
  await expect(card.getByTestId('write-stroke-line')).toHaveText(/^One stroke/);
  for (const name of ['Clear', 'Check', 'Skip']) {
    const b = (await card.getByRole('button', { name }).boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(844);
  }
  await shot(page, 'write-it-alpha-order');
});

test('alpha at Copy and in the Not quite replay keeps its numbered start point', async ({ page }) => {
  const card = await openAlpha(page, 'copy');
  await markerShown(card.getByTestId('write-beside').getByTestId('write-model'));
  await expect(card.getByTestId('write-stroke-line')).toBeVisible();
  // a short dash is not an alpha: Not quite, and the right strokes are drawn again
  const box = (await card.getByTestId('writing-pad').boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(box.x + 20 + i * 4, box.y + 20);
  await page.mouse.up();
  await card.getByRole('button', { name: 'Check' }).click();
  await expect(card.getByTestId('write-verdict')).toHaveAttribute('data-right', 'false');
  await markerShown(card.getByTestId('write-strokes-shown'));
  await expect(card.getByTestId('write-stroke-line')).toBeVisible();
  await shot(page, 'write-it-alpha-order-replay');
});
