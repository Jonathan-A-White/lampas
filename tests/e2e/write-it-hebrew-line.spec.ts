import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Write it on the Hebrew vav (mw-5r3p30.958): the pad tells the checker where its line is, so a ן reaching below the line on the ו card is 'Not quite', and tracing the faint model the card draws
// (read from where the browser really puts it) is 'Right', on a phone and on a tablet.

test.use({ storageState: { cookies: [], origins: [] } });

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

/** The vav's Write it card, at the Trace stage. */
async function openVav(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSetting(page, { key: 'penSeen', value: 'yes' });
  await putSetting(page, { key: 'handwritingWhy', value: 'seen' });
  await page.goto('/#/settings');
  const languages = page.getByRole('group', { name: 'Which languages?', exact: true });
  await languages.getByRole('button', { name: 'Hebrew', exact: true }).click();
  await expect(languages.getByRole('button', { name: 'Hebrew', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/goal');
  await expect(page.getByRole('heading', { name: 'Goal', exact: true, level: 1 })).toBeVisible();
  await page.getByTestId('hebrew-ideas').locator('[data-idea="he-letter-vav"] button').click();
  const part = page.getByRole('dialog', { name: 'Idea' }).getByTestId('lesson-write-it');
  await part.scrollIntoViewIfNeeded();
  await part.getByRole('button', { name: 'Write it', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Write it' }).getByTestId('write-it');
  await expect(card).toHaveAttribute('data-stage', 'trace');
  await expect(card.getByTestId('write-model')).toBeVisible();
  return card;
}

type Stroke = [number, number][];

/** Writes strokes (page pixels) on the pad with the mouse, which the pad takes like a finger. */
async function ink(page: Page, strokes: Stroke[]) {
  for (const stroke of strokes) {
    await page.mouse.move(stroke[0][0], stroke[0][1]);
    await page.mouse.down();
    for (const [x, y] of stroke.slice(1)) await page.mouse.move(x, y);
    await page.mouse.up();
  }
}

for (const width of [390, 820]) {
  test(`at ${width} px wide, tracing the faint vav is Right, and a long ן on the ו card is Not quite`, async ({ page }) => {
    const card = await openVav(page, width);
    const pad = card.getByTestId('writing-pad');
    await pad.scrollIntoViewIfNeeded();
    const box = (await pad.boundingBox())!;
    // the model's own strokes, where the browser draws them (page pixels)
    const model: Stroke[] = await card.getByTestId('write-model').evaluate((svg) =>
      [...svg.querySelectorAll<SVGPathElement>('path.glyph-stroke')].map((path) => {
        const to = path.getScreenCTM()!;
        const length = path.getTotalLength();
        return Array.from({ length: 41 }, (_, i) => {
          const at = path.getPointAtLength((length * i) / 40);
          const p = new DOMPoint(at.x, at.y).matrixTransform(to);
          return [p.x, p.y] as [number, number];
        });
      }),
    );
    expect(model.length).toBeGreaterThan(0);

    // a ן: a stem from the top of a letter to well below the line
    const [top, line] = [model.flat().reduce((m, p) => Math.min(m, p[1]), Infinity), model.flat().reduce((m, p) => Math.max(m, p[1]), -Infinity)];
    const x = box.x + box.width / 2 + 40;
    const down = Array.from({ length: 30 }, (_, i): [number, number] => [x, top + ((line + (line - top) * 0.5 - top) * i) / 29]);
    await ink(page, [down]);
    await expect(pad).toHaveAttribute('data-strokes', '1');
    await card.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(card.getByTestId('write-verdict')).toContainText('Not quite');
    await card.getByRole('button', { name: 'Try again', exact: true }).click();

    // tracing the model is Right
    await expect(card.getByTestId('writing-pad')).toHaveAttribute('data-strokes', '0');
    await ink(page, model);
    await shot(page, `write-it-hebrew-line-${width}`);
    await card.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(card.getByTestId('write-verdict')).toHaveText('Right');
  });
}
