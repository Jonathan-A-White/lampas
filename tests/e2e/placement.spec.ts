import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { LADDER } from '../../src/data/grammar/ladder';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { openUnlocked } from './unlocked';

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'settings' | 'grammarLevels', rows: object[]) {
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

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

async function openWithGoal(page: Page, goal: string) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: goal }]);
}

// The ideas 1 John 1:1 needs (src/data/grammar/needs.ts)
const NEEDED = [
  'alphabet', 'breathings', 'accents', 'noun', 'article', 'case-nominative', 'case-accusative', 'case-genitive', 'case-dative',
  'gender-masculine', 'gender-feminine', 'gender-neuter', 'person-1st', 'person-3rd', 'number-singular', 'number-plural', 'pronoun',
  'pronoun-personal', 'pronoun-relative', 'preposition', 'verb', 'tense-imperfect', 'tense-aorist', 'tense-perfect', 'second-tenses',
  'voice-active', 'voice-middle-deponent', 'mood-indicative', 'conjunction', 'attic-form',
];

// every letter, diphthong, consonant pair and breathing (the items of the quick round), by id
const ITEMS = LADDER.filter((i) => i.glyphs || i.parent).map((i) => i.id);

test('Place me in Settings > Goal opens the placement; a question fits the phone and a reload goes on', async ({ page }) => {
  await openWithGoal(page, '1 John 1:1');
  await page.goto('/#/settings');
  const place = page.getByRole('button', { name: 'Place me' });
  await expect(place).toBeVisible();
  const placeBox = await place.boundingBox();
  expect(placeBox?.height).toBeGreaterThanOrEqual(47.5);
  expect((placeBox?.x ?? 0) + (placeBox?.width ?? 0)).toBeLessThanOrEqual(390);
  await place.click();

  await expect(page.getByRole('heading', { name: 'Placement', level: 1 })).toBeVisible();
  await expect(page.getByTestId('placement-goal')).toHaveText('Placement: Read 1 John 1:1');
  const start = page.getByRole('button', { name: 'Start' });
  expect((await start.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await expectFitsPhone(page);

  await start.click();
  await expect(page.getByTestId('placement-question')).toHaveText('Question 1 · the noun · BMA Tutor L1');
  const options = page.locator('[data-option]');
  const count = await options.count();
  expect(count).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < count; i += 1) {
    const box = await options.nth(i).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  await expectFitsPhone(page);

  await options.first().click();
  const next = page.getByTestId('next');
  expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await next.click();
  await expect(page.getByTestId('placement-question')).toHaveText(/^Question 2 · /);

  // a reload keeps the address and the place
  await page.reload();
  await expect(page.getByTestId('placement-goal')).toHaveText('Placement: Read 1 John 1:1');
  await expect(page.getByTestId('placement-kept')).toHaveText('1 question answered so far.');
  await page.getByRole('button', { name: 'Go on' }).click();
  await expect(page.getByTestId('placement-question')).toHaveText(/^Question 2 · /);
});

test('a sitting of tapped answers ends on a card that fits: Where you are, or Paused after twenty', async ({ page }) => {
  await openWithGoal(page, '1 John 1:1');
  await page.goto('/#/placement');
  await page.getByRole('button', { name: 'Start' }).click();
  const end = page.getByTestId('where');
  // twenty questions of the walk, then up to forty taps of the quick round
  for (let i = 0; i < 65 && !(await end.isVisible()); i += 1) {
    await page.locator('[data-option]').first().click();
    await page.getByTestId('next').click();
    await expect(page.getByTestId('placement-question').or(end)).toBeVisible();
  }
  await expect(end).toHaveText(/^(Where you are|So far): solid \d+, frontier \d+, not yet \d+; untested \d+$/);
  await expectFitsPhone(page);
  const back = page.getByRole('button', { name: /^(Back to the goal|Go on another day)$/ });
  const box = await back.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844 + 1);
});

test('the end card: Where you are, by tier, with Back to the goal in reach', async ({ page }) => {
  await openWithGoal(page, '1 John 1:1');
  const now = Date.now();
  await put(page, 'grammarLevels', [...new Set([...NEEDED, ...ITEMS])].map((id) => ({ id, level: 'solid', since: now, how: 'marked' })));
  await page.goto('/#/placement');
  // everything the goal needs is solid already, and every letter and combination too: nothing is left to ask, so Start ends on the card
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('placement-title')).toHaveText('Where you are');
  await expect(page.getByTestId('where')).toHaveText(`Where you are: solid ${NEEDED.length + 24}, frontier 0, not yet 0; untested 0`);
  const nouns = page.getByRole('region', { name: 'nouns' });
  await expect(nouns.getByRole('listitem').filter({ hasText: 'The noun' })).toContainText('Solid');
  const back = page.getByRole('button', { name: 'Back to the goal' });
  expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await expectFitsPhone(page);
  await shot(page, 'placement');
});

// the quick round (mw-hqd5bz.18): everything is solid but ξ, ψ and ου, so Start (as Place again does) goes straight to the three taps
async function knownExceptThree(page: Page) {
  await honestSpeech(page, { langs: ['el-GR'] });
  await openWithGoal(page, '1 John 1:1');
  const now = Date.now();
  const missed = ['letter-xi', 'letter-psi', 'diphthong-ou'];
  const rest = [...new Set([...NEEDED, ...ITEMS])].filter((id) => !missed.includes(id) && !['alphabet', 'diphthongs'].includes(id));
  await put(page, 'grammarLevels', rest.map((id) => ({ id, level: 'solid', since: now, how: 'marked' })));
  await page.goto('/#/placement');
  await page.getByRole('button', { name: 'Start' }).click();
}

// the three missed items, as the quick round asks them: the letter or pair, and its sound
const MISSED = [
  { glyph: 'ξ', sound: 'ks, as in “box”' },
  { glyph: 'ψ', sound: 'ps, as in “lips”' },
  { glyph: 'ου', sound: 'oo, as in “food”' },
];

/** The text of the right option of question `i`: the letter when it is said (Hear and pick), its sound when it is shown (See and pick). */
async function rightOption(page: Page, i: number): Promise<string> {
  await expect(page.getByTestId('placement-question')).toHaveText(new RegExp(`^Quick round ${i + 1} of 3 · (Hear|See) and pick$`));
  const hear = (await page.getByTestId('placement-question').textContent())!.includes('Hear and pick');
  return hear ? MISSED[i].glyph : MISSED[i].sound;
}

test('a quick-round question fits the phone: Hear and pick says it, See and pick shows it', async ({ page }) => {
  await knownExceptThree(page);
  const options = page.locator('[data-option]');
  for (let i = 0; i < 3; i += 1) {
    const right = await rightOption(page, i);
    const hear = right === MISSED[i].glyph;
    if (hear) await expect.poll(async () => (await spoken(page)).map((s) => s.text)).toContain(MISSED[i].glyph);
    else await expect(page.getByTestId('grammar-form')).toHaveText(MISSED[i].glyph);
    expect(await options.count()).toBe(4);
    for (let n = 0; n < 4; n += 1) {
      const box = await options.nth(n).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(47.5);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
    }
    expect((await page.getByTestId('stop-here').boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
    await expectFitsPhone(page);
    if (i === 1) {
      await shot(page, 'placement-quick');
    }
    await options.filter({ hasText: new RegExp(`^${right}$`) }).click();
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('placement-title')).toHaveText('Where you are');
  await expect(page.getByTestId('gaps')).toHaveCount(0);
});

test('the end card of a quick round names the gaps', async ({ page }) => {
  await knownExceptThree(page);
  for (let i = 0; i < 3; i += 1) {
    const right = await rightOption(page, i);
    await page.locator('[data-option]').filter({ hasNotText: new RegExp(`^${right}$`) }).first().click();
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('placement-title')).toHaveText('Where you are');
  await expect(page.getByTestId('gaps')).toHaveText('Gaps to work on: ξ, ψ and ου');
  const back = page.getByRole('button', { name: 'Back to the goal' });
  const box = await back.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844 + 1);
  await expectFitsPhone(page);
  await shot(page, 'placement-gaps');
});
