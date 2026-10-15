import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The passage view (a section heading's verses, src/VerseView.tsx) sets its text exactly as the Reader does (mw-5r3p30.319): the same face, size,
// line height, alignment and hyphenation, under his current settings, with Immersive on (the book look) and off. A phone-width layout claim.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const HEADING = 'Wives and Husbands';

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

async function openPassage(page: Page, immersive: 'on' | 'off', view: 'english' | 'greek') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveReader: immersive, immersiveHint: 'off' });
  await page.goto(`/#/?b=eph&c=5&view=${view}&weave=off`);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ephesians 5', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
}

interface Look {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  textAlign: string;
  hyphens: string;
}

const look = (el: Locator): Promise<Look> =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight, textAlign: s.textAlign, hyphens: s.hyphens };
  });

/** a verse's type in the Reader, then the same verse in the passage view of its heading */
async function readerAndPassage(page: Page): Promise<{ reader: Look; passage: Look }> {
  const reader = await look(page.locator('[data-reader] [data-verse="25"]'));
  await page.locator('[data-heading]', { hasText: HEADING }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await expect(view.locator('[data-passage-verse]')).toHaveCount(13);
  const passage = await look(view.locator('[data-passage-verse="25"]'));
  return { reader, passage };
}

for (const view of ['english', 'greek'] as const) {
  test(`Immersive on: the ${view} passage is set as the Reader sets it`, async ({ page }) => {
    await openPassage(page, 'on', view);
    const { reader, passage } = await readerAndPassage(page);
    expect(reader.textAlign).toBe('justify');
    expect(reader.hyphens).toBe('auto');
    expect(passage).toEqual(reader);
    await shot(page, `passage-typography-${view}-immersive`);
  });
}

test('Immersive off: the English passage is set as the Reader sets it', async ({ page }) => {
  await openPassage(page, 'off', 'english');
  const { reader, passage } = await readerAndPassage(page);
  expect(reader.lineHeight).toBe('44px');
  expect(passage).toEqual(reader);
  await shot(page, 'passage-typography-english');
});
