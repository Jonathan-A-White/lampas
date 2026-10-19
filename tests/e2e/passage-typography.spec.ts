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

interface Setup {
  immersive: 'on' | 'off';
  view: 'english' | 'greek';
  layout?: 'verse' | 'paragraph';
  weave?: 'off' | 'solid' | 'solid+learning';
  book?: string;
  chapter?: number;
  title?: string;
}

async function openPassage(page: Page, { immersive, view, layout = 'verse', weave = 'off', book = 'eph', chapter = 5, title = 'Ephesians 5' }: Setup) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveReader: immersive, immersiveHint: 'off', layout });
  await page.goto(`/#/?b=${book}&c=${chapter}&view=${view}&weave=${encodeURIComponent(weave)}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-layout', layout);
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
    await openPassage(page, { immersive: 'on', view });
    const { reader, passage } = await readerAndPassage(page);
    // the Reader's Greek column is ragged right under 30 rem of the phone's text (src/index.css, mw-5r3p30.585), and the passage's is too
    expect(reader.textAlign).toBe(view === 'greek' ? 'start' : 'justify');
    expect(reader.hyphens).toBe('auto');
    expect(passage).toEqual(reader);
    await shot(page, `passage-typography-${view}-immersive`);
  });
}

test('Immersive off: the English passage is set as the Reader sets it', async ({ page }) => {
  await openPassage(page, { immersive: 'off', view: 'english' });
  const { reader, passage } = await readerAndPassage(page);
  expect(reader.lineHeight).toBe('44px');
  expect(passage).toEqual(reader);
  await shot(page, 'passage-typography-english');
});

/** The Reader's blocks for the verses `wanted`: a paragraph's verses, or a verse on its own, each as the list of its verse numbers. */
const readerBlocks = (page: Page, wanted: string[]): Promise<string[][]> =>
  page.evaluate((keep) => {
    const set = new Set(keep);
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-paragraph], [data-reader] p[data-verse]'));
    return blocks
      .map((block) => (block.matches('[data-paragraph]') ? Array.from(block.querySelectorAll('[data-verse]')).map((v) => v.getAttribute('data-verse') ?? '') : [block.getAttribute('data-verse') ?? '']))
      .map((verses) => verses.filter((n) => set.has(n)))
      .filter((verses) => verses.length > 0);
  }, wanted);

/** The passage view's blocks: the verse numbers in each [data-passage-text]. */
const passageBlocks = (view: Locator): Promise<string[][]> =>
  view.locator('[data-passage-text]').evaluateAll((blocks) => blocks.map((block) => Array.from(block.querySelectorAll('[data-passage-verse]')).map((v) => v.getAttribute('data-passage-verse') ?? '')));

/** Every verse's computed line height, in the Reader and in the passage view. */
async function lineHeights(page: Page, view: Locator, verses: string[]): Promise<{ reader: Record<string, string>; passage: Record<string, string> }> {
  const reader: Record<string, string> = {};
  const passage: Record<string, string> = {};
  for (const n of verses) {
    reader[n] = await page.locator(`[data-reader] [data-verse="${n}"]`).evaluate((el) => getComputedStyle(el).lineHeight);
    passage[n] = await view.locator(`[data-passage-verse="${n}"]`).evaluate((el) => getComputedStyle(el).lineHeight);
  }
  return { reader, passage };
}

/** Opens the passage under the heading `index` of the chapter; its verses' numbers, in order, and its view. */
async function openHeading(page: Page, index: number): Promise<{ view: Locator; verses: string[] }> {
  await page.locator('[data-heading]').nth(index).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  const verses = await view.locator('[data-passage-verse]').evaluateAll((els) => els.map((el) => el.getAttribute('data-passage-verse') ?? ''));
  expect(verses.length).toBeGreaterThan(0);
  return { view, verses };
}

test('Paragraph layout, Immersive on: the passage of Wives and Husbands has the Reader\'s five paragraphs', async ({ page }) => {
  await openPassage(page, { immersive: 'on', view: 'english', layout: 'paragraph' });
  const { view, verses } = await openHeading(page, await headingIndex(page, HEADING));
  expect(await passageBlocks(view)).toEqual([['21'], ['22', '23', '24'], ['25', '26', '27'], ['28', '29', '30'], ['31', '32', '33']]);
  expect(await passageBlocks(view)).toEqual(await readerBlocks(page, verses));
  await shot(page, 'passage-typography-paragraph');
});

test('Verse by verse layout: the passage of Wives and Husbands has one block per verse', async ({ page }) => {
  await openPassage(page, { immersive: 'on', view: 'english', layout: 'verse' });
  const { view, verses } = await openHeading(page, await headingIndex(page, HEADING));
  expect(verses).toHaveLength(13);
  expect(await passageBlocks(view)).toEqual(verses.map((n) => [n]));
  expect(await passageBlocks(view)).toEqual(await readerBlocks(page, verses));
});

test('Weave + Learning, Verse by verse: a verse in the passage keeps the line height the Reader gives it (verse 22 is 28px in both)', async ({ page }) => {
  await openPassage(page, { immersive: 'on', view: 'english', layout: 'verse', weave: 'solid+learning' });
  const { view, verses } = await openHeading(page, await headingIndex(page, HEADING));
  const { reader, passage } = await lineHeights(page, view, verses);
  expect(passage).toEqual(reader);
  expect(reader['22']).toBe('28px');
  expect(passage['22']).toBe('28px');
  // the hints are real: a verse with a line under a word keeps the roomy 44 px, and not every line is roomy
  expect(new Set(Object.values(passage)).size).toBeGreaterThan(1);
});

async function headingIndex(page: Page, text: string): Promise<number> {
  const all = await page.locator('[data-heading]').allTextContents();
  const at = all.findIndex((t) => t.includes(text));
  expect(at, `the heading '${text}'`).toBeGreaterThanOrEqual(0);
  return at;
}

// The sweep: every section heading of Ephesians 5 and Romans 8, in both layouts and both views, with the Weave Off and '+ Learning': the passage view has the
// Reader's blocks and every verse's line height.
const CHAPTERS = [
  { book: 'eph', chapter: 5, title: 'Ephesians 5' },
  { book: 'rom', chapter: 8, title: 'Romans 8' },
];
for (const { book, chapter, title } of CHAPTERS) {
  for (const layout of ['verse', 'paragraph'] as const) {
    for (const view of ['english', 'greek'] as const) {
      for (const weave of ['off', 'solid+learning'] as const) {
        test(`sweep: every heading of ${title} in ${layout} layout, ${view} view, weave ${weave}: the passage is set as the Reader sets it`, async ({ page }) => {
          await openPassage(page, { immersive: 'on', view, layout, weave, book, chapter, title });
          const headings = await page.locator('[data-heading]').count();
          expect(headings).toBeGreaterThan(1);
          for (let i = 0; i < headings; i += 1) {
            const { view: passageView, verses } = await openHeading(page, i);
            const blocks = await passageBlocks(passageView);
            expect(blocks, `blocks of heading ${i}`).toEqual(await readerBlocks(page, verses));
            if (layout === 'verse') expect(blocks).toEqual(verses.map((n) => [n]));
            const { reader, passage } = await lineHeights(page, passageView, verses);
            expect(passage, `line heights of heading ${i}`).toEqual(reader);
            await passageView.getByRole('button', { name: '‹ Reader', exact: true }).click();
            await expect(passageView).toBeHidden();
          }
        });
      }
    }
  }
}
