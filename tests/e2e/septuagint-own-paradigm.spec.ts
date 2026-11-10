// A Septuagint word's own paradigm (mw-u2w5klk.289) at 390x844: Genesis 1 in the Septuagint, ἀόρατος in verse 2 (a feminine nominative singular), its sheet's Paradigm row, Adjective endings, This word: the
// table lays the forms of ἀόρατος found in the Septuagint with the New Testament's, each cell saying which, the form he tapped outlined, and no 'not in the NT' for a form the Septuagint has.
// public/data-lxx ships no chapter yet, so the Septuagint's files are the fixtures in tests/fixtures/data-lxx (Genesis 1:2's ἀόρατος read as a feminine, as the derivation has it) and the lemma's file
// is the real one the build made, with the Septuagint's forms laid under lxx as the build lays them from a shipped chapter (scripts/build-lemma-forms.mjs).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const NOUN_IDEAS = ['noun', 'declension-1', 'declension-2', 'case-nominative', 'gender-masculine', 'gender-feminine', 'gender-neuter', 'number-singular', 'number-plural', 'case-genitive', 'case-dative', 'case-accusative', 'case-vocative'];
const ADJECTIVE_IDEAS = ['adjective', 'declension-2', 'case-nominative', 'gender-masculine', 'number-singular', 'declension-1', 'gender-feminine', 'gender-neuter', 'number-plural', 'case-genitive', 'case-dative', 'case-accusative', 'case-vocative', 'declension-3'];

/** Puts his grammar levels in the app's own store through raw IndexedDB, as the app wrote them. */
async function putLevels(page: Page, ids: string[], textSize?: number) {
  const rows = ids.map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' }));
  await page.evaluate(
    ({ list, size }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(['grammarLevels', 'settings'], 'readwrite');
          for (const row of list) tx.objectStore('grammarLevels').put(row);
          if (size) tx.objectStore('settings').put({ key: 'textSize', value: String(size) });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { list: rows, size: textSize },
  );
}

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8');
    if (path === 'gen/1.json') {
      // the derivation reads Gen 1:2's ἀόρατος as a feminine nominative singular (ἡ δὲ γῆ ἦν ἀόρατος); the fixture has the masculine
      const chapter = JSON.parse(body) as { parse: Record<string, string>; verses: { n: number; g: { t: string; p: string }[] }[] };
      chapter.parse['A-NSF'] = 'adjective, nominative singular feminine';
      for (const word of chapter.verses.find((v) => v.n === 2)!.g) if (word.t === 'ἀόρατος') word.p = 'A-NSF';
      body = JSON.stringify(chapter);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
  // the real lemma file (the New Testament's four forms of ἀόρατος) with the Septuagint's forms of it laid under lxx, as the build lays them
  await page.route('**/lemma-forms/*', async (route) => {
    const response = await route.fetch();
    // a Septuagint comma lemma ('ὕδωρ, ὕδατος') has no file of its own: the build folds its forms into ὕδωρ's (mw-u2w5klk.297)
    const file = (await response.json().catch(() => undefined)) as { l: string; f: unknown[]; lxx?: unknown[] } | undefined;
    if (!file) return route.fulfill({ response });
    if (file.l === 'ὕδωρ') file.lxx = [['ὕδατος', 'N-GSN', 1, 'gen', 1, 2], ['ὕδασι', 'N-DPN', 1, 'gen', 1, 7]];
    else file.lxx = [['ἀόρατος', 'A-NSF', 1, 'gen', 1, 2]];
    return route.fulfill({ response, json: file });
  });
});

const forms = (page: Page) => page.getByRole('group', { name: 'Forms', exact: true });

async function openTable(page: Page, verse = 2, word = 'ἀόρατος', ideas = ADJECTIVE_IDEAS, heading = 'Adjective endings', textSize?: number, chapter = 'b=gen&c=1', septuagint = true) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, ideas, textSize);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  const choice = septuagint ? 'On' : 'Off';
  await row.getByRole('button', { name: choice, exact: true }).click();
  await expect(row.getByRole('button', { name: choice, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto(`/#/?${chapter}&view=greek`);
  await page.reload();
  await page.locator(`[data-verse="${verse}"]`).getByRole('button', { name: word, exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-paradigm').getByRole('button').click();
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
}

test('Genesis 1:2 ἀόρατος: This word lays the Septuagint’s form and the New Testament’s, each saying where, the tapped form outlined', async ({ page }) => {
  await openTable(page);
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');

  // the form he tapped has its cell, outlined, and the line above the table no longer says the table lacks it
  await expect(page.getByTestId('word-lit')).toHaveText('Its form is outlined in the table.');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toContainText('ἀόρατος');
  await expect(lit.locator('[data-found]')).toHaveText('LXX');

  // the New Testament's forms are there, found in the NT; no cell says 'not in the NT' for a form the Septuagint has, and an empty one names both texts
  const found = page.locator('[data-found]');
  await expect(found).toHaveText(['LXX', 'NT', 'NT', 'NT', 'NT']);
  const texts = await page.locator('[data-cell]').allInnerTexts();
  expect(texts.filter((t) => t === 'not in the NT')).toHaveLength(0);
  expect(texts.filter((t) => t === 'not in the Septuagint or NT').length).toBeGreaterThan(0);
  await expect(page.getByText('The table has no cell for this form yet.')).toHaveCount(0);

  // the tapped form's note says where the Septuagint uses it and opens the Reader there
  await expect(page.getByTestId('own-note')).toContainText('Used once in the Septuagint, first at Genesis 1:2.');
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'septuagint-own-paradigm');
});

test('Genesis 1:1 ΑΡΧΗ, a word Swete prints in capitals: This word outlines the dative singular cell ἀρχῇ, never "no cell for this form yet"', async ({ page }) => {
  await openTable(page, 1, 'ΑΡΧΗ', NOUN_IDEAS, 'Noun endings');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');

  // the capitals have no accent: the form is matched to the one the lemma's file has for the same parsing, ἀρχῇ
  await expect(page.getByTestId('word-lit')).toHaveText('Its form is outlined in the table.');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toContainText('ἀρχῇ');
  await expect(page.getByText('The table has no cell for this form yet.')).toHaveCount(0);
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'septuagint-own-paradigm-capitals');
});

// mw-u2w5klk.323: the capitals have no iota subscript, so the cell the sheet hands the table was the α (ἡμέρα) group's -ᾳ, not the η (φωνή) group's -ῃ
test('Genesis 1:1 ΑΡΧΗ: the Paradigm link names the cell in the η (φωνή) group, and Learn > The pattern outlines -ῃ there, not -ᾳ in the α (ἡμέρα) group', async ({ page }) => {
  await openTable(page, 1, 'ΑΡΧΗ', NOUN_IDEAS, 'Noun endings');
  const address = new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
  expect(address.get('cell')).toBe('First declension, feminine in η (φωνή) Dative Singular');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'The pattern' }).click();
  await expect(forms(page).getByRole('button', { name: 'The pattern' })).toHaveAttribute('aria-pressed', 'true');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toContainText('-ῃ');
  // the lit cell sits under the heading of the φωνή group, the last row heading before it
  const heading = await lit.evaluate((cell) => {
    let row = cell.closest('tr')?.previousElementSibling ?? null;
    while (row && !row.querySelector('th[scope="rowgroup"]')) row = row.previousElementSibling;
    return row?.querySelector('th[scope="rowgroup"]')?.textContent?.trim() ?? '';
  });
  expect(heading).toBe('First declension, feminine in η (φωνή)');
  await shot(page, 'septuagint-own-paradigm-capitals-pattern');
});

// mw-u2w5klk.334: the sheet waits for the lemma's forms before it leaves for a capitals word, so its Paradigm button stays live and a second tap in that time opened the table again
test('Genesis 1:1 ΑΡΧΗ, the lemma file slow: a double tap on Noun endings is one screen change, the Word sheet gone, Back one press to the Word sheet', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, NOUN_IDEAS);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=gen&c=1&view=greek');
  await page.reload();
  // the lemma file's response is held 2 s (a slow connection); the routes of beforeEach lay the Septuagint's forms on it after
  await page.route('**/lemma-forms/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fallback();
  });
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'ΑΡΧΗ', exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  const before = await page.evaluate(() => window.history.length);
  await sheet.getByTestId('sheet-paradigm').getByRole('button').dblclick({ delay: 0 });
  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toBeVisible();
  // the second tap's work would come later still: give it time to show
  await page.waitForTimeout(500);
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: /^‹ ?Word$/ })).toBeVisible();
  expect(await page.evaluate(() => window.history.length)).toBe(before + 1);
  const address = new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
  expect(address.get('cell')).toBe('First declension, feminine in η (φωνή) Dative Singular');
  await shot(page, 'septuagint-own-paradigm-capitals-double-tap');
});

// mw-u2w5klk.344: Done on the Word sheet while Noun endings waits on the lemma's forms cancels the table: it must not open later over the chapter
test('Genesis 1:1 ΑΡΧΗ, the lemma file slow: Done on the Word sheet before the forms arrive, the table never opens and the chapter stays', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, NOUN_IDEAS);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=gen&c=1&view=greek');
  await page.reload();
  await page.route('**/lemma-forms/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fallback();
  });
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'ΑΡΧΗ', exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  const hash = await page.evaluate(() => window.location.hash);
  const before = await page.evaluate(() => window.history.length);
  await sheet.getByTestId('sheet-paradigm').getByRole('button').click();
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toBeHidden();
  // the forms arrive at 2 s: give the cancelled table the time to show if it were going to
  await page.waitForTimeout(3000);
  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toHaveCount(0);
  expect(await page.evaluate(() => window.location.hash)).toBe(hash);
  expect(await page.evaluate(() => window.history.length)).toBe(before);
  await shot(page, 'septuagint-own-paradigm-capitals-done-during-wait');
});

test('Genesis 1:2 ὕδατος, a word whose Septuagint lemma has a comma (ὕδωρ, ὕδατος): This word is there and its cell is outlined, with the New Testament’s ὕδωρ forms laid too', async ({ page }) => {
  await openTable(page, 2, 'ὕδατος.', [...NOUN_IDEAS, 'declension-3'], 'The third declension');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');

  // the form he tapped has its own cell, outlined, found in the Septuagint and the New Testament both
  await expect(page.getByTestId('word-lit')).toHaveText('Its form is outlined in the table.');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toContainText('ὕδατος');
  await expect(lit.locator('[data-found]')).toHaveText('LXX + NT');
  // the other forms the New Testament has of ὕδωρ are in the table, found in the NT
  await expect(page.locator('[data-found]').filter({ hasText: /^NT$/ }).first()).toBeVisible();
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'septuagint-own-paradigm-comma-lemma');
});

// mw-u2w5klk.314: a New Testament word, with the Septuagint On, has the forms of its lemma file's lxx list laid too (step 5 of mw-u2w5klk.305's HOW TO CHECK)
for (const septuagint of [true, false]) {
  test(`Matthew 3:11 ὕδατι, Septuagint ${septuagint ? 'On' : 'Off'}: This word ${septuagint ? 'marks ὕδασι as in the Septuagint beside the New Testament’s forms' : 'has the New Testament’s forms alone'}`, async ({ page }) => {
    await openTable(page, 11, 'ὕδατι', [...NOUN_IDEAS, 'declension-3'], 'The third declension', undefined, 'b=mat&c=3', septuagint);
    await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
    await forms(page).getByRole('button', { name: 'This word' }).click();
    await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('word-lit')).toHaveText('Its form is outlined in the table.');
    await expect(page.locator('[data-lit]')).toContainText('ὕδατι');
    const dativePlural = page.locator('[data-cell*="Dative Plural"]');
    if (septuagint) {
      await expect(page.locator('[data-lit] [data-found]')).toHaveText('NT');
      await expect(dativePlural).toContainText('ὕδασι');
      await expect(dativePlural.locator('[data-found]')).toHaveText('LXX');
      await expect(dativePlural).toHaveAttribute('aria-label', /in the Septuagint/);
    } else {
      await expect(page.locator('[data-found]')).toHaveCount(0);
      await expect(dativePlural).toContainText('ὕδασιν');
      expect((await page.locator('[data-cell]').allInnerTexts()).filter((t) => t === 'not in the NT').length).toBeGreaterThan(0);
    }
    const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(fits.w).toBeLessThanOrEqual(fits.c);
    await shot(page, septuagint ? 'septuagint-own-paradigm-nt-word-on' : 'septuagint-own-paradigm-nt-word-off');
  });
}

/** What a table of This word read from the Septuagint must keep at a phone's width (mw-u2w5klk.313): it fits its box, no form touches its caption, no lock leaves its cell. */
async function measureTables(page: Page) {
  return page.evaluate(() => {
    const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    const inside = (a: DOMRect, box: DOMRect) => a.left >= box.left - 0.5 && a.right <= box.right + 0.5 && a.top >= box.top - 0.5 && a.bottom <= box.bottom + 0.5;
    const tables = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="paradigm-table"]')).map((table) => ({ scrollWidth: table.parentElement!.scrollWidth, clientWidth: table.parentElement!.clientWidth, tableWidth: table.getBoundingClientRect().width }));
    const touching: string[] = [];
    const clipped: string[] = [];
    let captions = 0;
    for (const cell of Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'))) {
      const box = cell.getBoundingClientRect();
      const caption = cell.querySelector<HTMLElement>('[data-found]');
      const lock = cell.querySelector<SVGElement>('svg');
      const name = cell.dataset.cell ?? '';
      // an empty cell's words ('not in the Septuagint or NT') stay inside it too
      if (cell.scrollWidth > cell.clientWidth + 1) clipped.push(`${name}: cell content wider than the cell`);
      // the form is the text of the cell outside its caption (a bare text node, or the span of a not-yet cell)
      const formNode = Array.from(cell.childNodes).find((n) => (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) || (n instanceof HTMLElement && n.lang === 'grc' && n !== caption));
      let form: DOMRect | undefined;
      if (formNode) {
        const range = document.createRange();
        range.selectNodeContents(formNode);
        form = range.getBoundingClientRect();
      }
      if (caption) {
        captions += 1;
        const cap = caption.getBoundingClientRect();
        if (form && overlap(form, cap)) touching.push(`${name}: form over caption`);
        if (!inside(cap, box)) clipped.push(`${name}: caption outside its cell`);
      }
      if (form && !inside(form, box)) clipped.push(`${name}: form outside its cell`);
      if (lock) {
        const l = lock.getBoundingClientRect();
        if (!inside(l, box)) clipped.push(`${name}: lock outside its cell`);
        if (form && overlap(form, l)) touching.push(`${name}: form over lock`);
        if (caption && overlap(caption.getBoundingClientRect(), l)) touching.push(`${name}: caption over lock`);
      }
    }
    return { tables, touching, clipped, captions, page: { w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth } };
  });
}

// his phone showed it at Text size Large (130), under Any, the plural not yet his
for (const [label, ideas, any, size] of [
  ['every idea solid', [...NOUN_IDEAS, 'declension-3'], false, 100],
  ['the plural still locked', [...NOUN_IDEAS.filter((id) => id !== 'number-plural'), 'declension-3'], false, 100],
  ['the plural not yet his, under Any (a lock beside each form)', [...NOUN_IDEAS.filter((id) => id !== 'number-plural'), 'declension-3'], true, 100],
  ['the plural not yet his, under Any, Text size Large (his phone)', [...NOUN_IDEAS.filter((id) => id !== 'number-plural'), 'declension-3'], true, 130],
  ['the plural not yet his, under Any, Text size 115', [...NOUN_IDEAS.filter((id) => id !== 'number-plural'), 'declension-3'], true, 115],
  ['the plural not yet his, under Any, Text size 120', [...NOUN_IDEAS.filter((id) => id !== 'number-plural'), 'declension-3'], true, 120],
  ['every idea solid, Text size Largest', [...NOUN_IDEAS, 'declension-3'], false, 160],
] as const) {
  test(`Genesis 1:2 ὕδατος, ${label}: This word fits the phone, no form touches its caption, every lock is in its cell, the last line scrolls clear of the bar`, async ({ page }) => {
    await openTable(page, 2, 'ὕδατος.', [...ideas], 'The third declension', size);
    await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
    if (any) await page.getByRole('button', { name: 'Any', exact: true }).click();
    await forms(page).getByRole('button', { name: 'This word' }).click();
    await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-lit] [data-found]')).toHaveCount(1);
    if (any) await expect(page.locator('[data-state="shown"][data-standing="notYet"]').first()).toBeVisible();

    const m = await measureTables(page);
    expect(m.captions).toBeGreaterThan(0);
    for (const t of m.tables) {
      expect(t.scrollWidth, 'the table box scrolls sideways').toBeLessThanOrEqual(t.clientWidth);
      expect(t.tableWidth).toBeLessThanOrEqual(t.clientWidth + 1);
    }
    expect(m.page.w).toBeLessThanOrEqual(m.page.c);
    expect(m.touching).toEqual([]);
    expect(m.clipped).toEqual([]);

    // the caption still says where each form was found: the tapped one in both texts, the others in the NT (the cell's name says it in full)
    const lit = page.locator('[data-lit]');
    await expect(lit).toHaveAttribute('aria-label', /in the Septuagint and NT/);
    await expect(lit.locator('[data-found]')).toHaveAttribute('data-found', 'both');

    // the last line of the details (the New Testament's use) can be scrolled fully above the bottom bar
    const last = page.getByTestId('own-also');
    await expect(last).toBeVisible();
    await last.evaluate((el) => el.closest('.screen')?.scrollTo({ top: 1e6 }));
    const bottom = await page.getByTestId('own-note').evaluate((note) => {
      const box = note.getBoundingClientRect();
      const nav = document.querySelector('nav')?.getBoundingClientRect();
      return { bottom: box.bottom, nav: nav?.top ?? window.innerHeight, h: window.innerHeight };
    });
    expect(bottom.bottom).toBeLessThanOrEqual(bottom.h);
    expect(bottom.bottom).toBeLessThanOrEqual(bottom.nav);
    await shot(page, `septuagint-own-paradigm-comma-lemma-fits-${size}-${any ? 'any' : label.includes('plural') ? 'locked' : 'solid'}`);
  });
}

// the sweep: the adjective table (six columns, a form and an empty cell's words in each) at the sizes a phone is read at; the pattern table, the Hebrew tables and the New Testament's own table carry no per-cell caption
for (const size of [100, 130, 160]) {
  test(`Genesis 1:2 ἀόρατος, Text size ${size}: the Adjective endings table fits the phone, empty cells and captions inside their cells`, async ({ page }) => {
    await openTable(page, 2, 'ἀόρατος', ADJECTIVE_IDEAS, 'Adjective endings', size);
    await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
    await page.getByRole('button', { name: 'Any', exact: true }).click();
    await forms(page).getByRole('button', { name: 'This word' }).click();
    await expect(page.locator('[data-lit] [data-found]')).toHaveCount(1);
    const m = await measureTables(page);
    expect(m.captions).toBeGreaterThan(0);
    for (const t of m.tables) expect(t.scrollWidth, 'the table box scrolls sideways').toBeLessThanOrEqual(t.clientWidth);
    expect(m.page.w).toBeLessThanOrEqual(m.page.c);
    expect(m.touching).toEqual([]);
    expect(m.clipped).toEqual([]);
    await shot(page, `septuagint-own-paradigm-adjective-${size}`);
  });
}

// mw-u2w5klk.306: Swete's full stop on ὕδατος (the clause's last word) is on the Reader's line only: the word sheet, the paradigm link's address and the paradigm screen's word line have the bare form
test('Genesis 1:2 ὕδατος., the last word of the clause: the word sheet, the address and the paradigm screen\'s word line carry ὕδατος without the full stop', async ({ page }) => {
  await openTable(page, 2, 'ὕδατος.', [...NOUN_IDEAS, 'declension-3'], 'The third declension');
  // the paradigm screen's word line: the form, a colon, its parsing
  const line = page.getByTestId('word-line');
  await expect(line).toHaveText(/^ὕδατος: noun, genitive singular neuter/);
  await expect(line.locator('span').first()).toHaveText('ὕδατος');
  // the address he came by carries the form without the point
  const hash = new URL(page.url()).hash;
  expect(decodeURIComponent(hash)).toContain('w=ὕδατος&');
  expect(decodeURIComponent(hash)).not.toContain('ὕδατος.');
  await shot(page, 'septuagint-word-form-without-stop');
});

test('Genesis 1:2 ὕδατος.: the word sheet\'s title is ὕδατος without the full stop', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=gen&c=1&view=greek');
  await page.reload();
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'ὕδατος.', exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByText('ὕδατος', { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText('ὕδατος.', { exact: true })).toHaveCount(0);
  await shot(page, 'septuagint-word-sheet-without-stop');
});

test('an older link to the paradigm screen that carries the full stop (w=ὕδατος.) shows the word line without it', async ({ page }) => {
  await openTable(page, 2, 'ὕδατος.', [...NOUN_IDEAS, 'declension-3'], 'The third declension');
  const address = `/#/paradigms?t=third-declension&mode=learn&w=${encodeURIComponent('ὕδατος.')}&p=N-GSN&l=${encodeURIComponent('ὕδωρ')}&own=1&text=lxx`;
  await page.goto(address);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The third declension', level: 1 })).toBeVisible();
  await expect(page.getByTestId('word-line')).toHaveText(/^ὕδατος: noun, genitive singular neuter/);
  await shot(page, 'septuagint-older-link-without-stop');
});

// mw-u2w5klk.326: tapping The pattern moved the screen down to the pattern's outlined cell and left the This word | The pattern choice above the top of the screen
test('Genesis 1:2 ὕδατος: tapping The pattern (and This word again) leaves the This word | The pattern choice in the window', async ({ page }) => {
  await openTable(page, 2, 'ὕδατος.', [...NOUN_IDEAS, 'declension-3'], 'The third declension');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  const inWindow = async (name: string) => {
    const box = await forms(page).getByRole('button', { name, exact: true }).boundingBox();
    const bar = await page.locator('header').first().boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height - 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  };
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-lit]')).toHaveCount(1);
  await inWindow('This word');
  await forms(page).getByRole('button', { name: 'The pattern' }).click();
  await expect(forms(page).getByRole('button', { name: 'The pattern' })).toHaveAttribute('aria-pressed', 'true');
  await inWindow('This word');
  await inWindow('The pattern');
  await shot(page, 'septuagint-own-paradigm-after-pattern');
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
  await inWindow('This word');
});

// mw-u2w5klk.335: turned on its side (844x390) the window cannot hold the choice and the outlined cell, and tapping The pattern left the cell below the window; the cell wins
test.describe('on its side', () => {
  test.use({ viewport: { width: 844, height: 390 } });
  test('Genesis 1:2 ὕδατος at 844x390: tapping The pattern leaves the outlined cell inside the window', async ({ page }) => {
    await openTable(page, 2, 'ὕδατος.', [...NOUN_IDEAS, 'declension-3'], 'The third declension');
    await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
    await forms(page).getByRole('button', { name: 'This word' }).click();
    await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
    await forms(page).getByRole('button', { name: 'The pattern' }).click();
    await expect(forms(page).getByRole('button', { name: 'The pattern' })).toHaveAttribute('aria-pressed', 'true');
    const lit = page.locator('[data-lit]');
    await expect(lit).toHaveCount(1);
    await expect
      .poll(async () => {
        const box = await lit.boundingBox();
        const bar = await page.locator('header').first().boundingBox();
        return !!box && box.y >= bar!.y + bar!.height - 1 && box.y + box.height <= 390;
      })
      .toBe(true);
    await shot(page, 'septuagint-own-paradigm-after-pattern-landscape');
  });
});
