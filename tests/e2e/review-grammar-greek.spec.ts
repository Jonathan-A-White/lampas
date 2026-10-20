import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';
import { MOVABLE } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/random';

// The Greek words in a question's sentence ('Which fits? ___ ἦν ἐκεῖνος τὸ φῶς', mw-86e9r1.31) are marked Greek and drawn in the Greek face at the size of the choices,
// the English around them in the normal type.
// The Movable letters prompt is drawn at random from MOVABLE and only some variants open 'Which fits?' (the movable ν one asks 'Which of these may take a movable ν'),
// so the draw is pinned and the spec runs once per variant (mw-5r3p30.673). A round takes one number from Math.random as the seed of its grammar questions (review/kinds.ts
// grammarSeed) and the Movable letters question picks its variant first from mulberry32 of that seed; a constant Math.random is therefore a constant seed, and this finds the
// constant whose draw is the variant.
function drawFor(index: number): number {
  for (let candidate = 0; candidate < 10_000; candidate += 1) {
    const value = (candidate + 0.5) / 10_000;
    if (Math.floor(mulberry32(Math.floor(value * 0x100000000))() * MOVABLE.length) === index) return value;
  }
  throw new Error(`no draw gives Movable letters variant ${index}`);
}

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'reviews' | 'settings', rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

MOVABLE.forEach((variant, index) => test(`the Greek words of the Movable letters prompt "${variant.prompt.slice(0, 40)}" are lang el, in the Greek face, at the size of the choices`, async ({ page }) => {
  const draw = drawFor(index);
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, draw);
  await openUnlocked(page);
  await page.goto('/');
  await waitForDue(page);
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'movable-letters', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveAttribute('data-idea', 'movable-letters');
  await expect(prompt).toHaveText(variant.prompt);

  const spans = prompt.locator('[lang="el"]');
  expect(await spans.count()).toBeGreaterThan(0);
  const face = (el: Element) => getComputedStyle(el).fontFamily;
  const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
  const choice = page.locator('[data-option]').first();
  const choiceFace = await choice.evaluate(face);
  const choiceSize = await choice.evaluate(size);
  expect(choiceSize).toBeGreaterThanOrEqual(28);
  for (const span of await spans.all()) {
    expect(await span.evaluate(face)).toBe(choiceFace);
    expect(await span.evaluate(size)).toBe(choiceSize);
  }
  // the English around the Greek stays in the normal type
  expect(await prompt.evaluate(face)).not.toBe(choiceFace);
  expect(await prompt.evaluate(size)).toBeLessThan(choiceSize);
  if (index === 0) await shot(page, 'review-grammar-greek');
}));
