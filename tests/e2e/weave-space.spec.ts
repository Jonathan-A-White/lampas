import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Luke 20:20 in Weave: 'to hand Him over' stands for παραδοῦναι αὐτὸν, and 'to the' (τῇ) follows. With the pair learning, the chunk is a stack (the two Greek words over
// the English), and the space after its last word was drawn inside that stack, where it collapses: 'παραδοῦναι αὐτὸντῇ' (mw-5r3p30.991). The chunk was αὐτὸν τῇ
// until mw-5r3p30.997 put the pronoun with the English it is in.
test.use({ viewport: { width: 390, height: 844 } });

type Row = { lemma: string; gloss: string; state: 'solid' | 'learning' };

// Puts words on his list through raw IndexedDB, as the app wrote them.
async function putWords(page: Page, rows: Row[]) {
  const now = Date.now();
  await page.evaluate(
    ([list, since]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('words', 'readwrite');
          for (const r of list as Row[]) tx.objectStore('words').put({ lemma: r.lemma, lemmas: [r.lemma], gloss: r.gloss, lesson: 0, state: r.state, since });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [rows, now] as const,
  );
}

async function openLuke(page: Page, learning: boolean, pauseMs = 0) {
  await openUnlocked(page, { empty: true });
  await page.goto('/');
  await expect(page.locator('[data-reader]')).toBeVisible();
  await putWords(page, [
    { lemma: 'ὁ', gloss: 'the', state: 'solid' },
    { lemma: 'παραδίδωμι', gloss: 'hand over', state: learning ? 'learning' : 'solid' },
    { lemma: 'αὐτός', gloss: 'he', state: learning ? 'learning' : 'solid' },
  ]);
  // a fresh load of the address, not a hash change on the running page: that page writes its saved Weave (off) back into the address (src/nav/readerAddress.ts)
  await page.goto('about:blank');
  await page.goto('/#/?b=luk&c=20&weave=solid%2Blearning');
  await page.waitForTimeout(pauseMs);
  const verse = page.locator('[data-verse="20"]');
  await expect(verse).toBeVisible();
  await verse.scrollIntoViewIfNeeded();
  return verse;
}

test("Luke 20:20 in Weave, παραδοῦναι and αὐτὸν learning: a visible gap between αὐτὸν and τῇ", async ({ page }) => {
  const verse = await openLuke(page, true);
  const pair = verse.locator('[data-chunk="12"]');
  await expect(pair).toHaveAttribute('data-learning', '');
  await expect(pair.locator('[data-greek]')).toHaveText('παραδοῦναι αὐτὸν');
  await expect(pair.locator('[data-hint]')).toHaveText('to hand Him over');
  const next = verse.locator('[data-chunk="13"]');
  await expect(next).toContainText('τῇ');
  const stack = (await pair.locator('[data-greek]').locator('xpath=..').boundingBox())!;
  const after = (await next.boundingBox())!;
  // a gap between the boxes, not only a space in the DOM: more than the 1 px a rounding could hide
  expect(after.x - (stack.x + stack.width)).toBeGreaterThanOrEqual(3);
  // the words of the pair are apart too
  const words = pair.locator('[data-greek] [role="button"]');
  const first = (await words.nth(0).boundingBox())!;
  const last = (await words.nth(1).boundingBox())!;
  expect(last.x - (first.x + first.width)).toBeGreaterThanOrEqual(0);
  await shot(page, 'weave-space-learning');
});

// mw-5r3p30.1109: the address used to be set by a hash change on the page that was already running, which writes its saved Weave (off) back into the address within a few
// tenths of a second; a reload that came after that read weave=off and the Weave was never on, so the first test failed on a slow host. The pause here is the slow host.
test('Luke 20:20 in Weave, the page left to settle after the address is set: the Weave the address asked for is still on', async ({ page }) => {
  const verse = await openLuke(page, true, 600);
  await expect(verse.locator('[data-chunk="12"]')).toHaveAttribute('data-learning', '');
});

test('Luke 20:20 in Weave, the pair solid: the same gap as before', async ({ page }) => {
  const verse = await openLuke(page, false);
  const pair = verse.locator('[data-chunk="12"]');
  await expect(pair).not.toHaveAttribute('data-learning', '');
  await expect(pair).toContainText('παραδοῦναι αὐτὸν');
  const next = verse.locator('[data-chunk="13"]');
  await expect(next).toContainText('τῇ');
  const last = (await pair.locator('[role="button"]').last().boundingBox())!;
  const after = (await next.boundingBox())!;
  expect(after.x - (last.x + last.width)).toBeGreaterThanOrEqual(0);
  const text = (await verse.locator('[data-text]').innerText()).replace(/\s+/g, ' ');
  expect(text).toContain('παραδοῦναι αὐτὸν τῇ');
});
