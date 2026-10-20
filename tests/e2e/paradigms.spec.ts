import { expect, test, type Page } from '@playwright/test';
import { LADDER } from '../../src/data/grammar/ladder';
import { PARADIGMS } from '../../src/data/paradigms';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { SETTLE_MS } from '../../src/ui/settle';
import { pageTime, tapTwice } from '../support/gesture';
import { openGroup } from './settings-group';

const IDEAS: Record<string, 'solid' | 'frontier'> = {
  article: 'solid', noun: 'solid', verb: 'solid', 'mood-indicative': 'solid', 'tense-present': 'solid', 'tense-imperfect': 'solid',
  'voice-active': 'solid', 'person-1st': 'solid', 'person-2nd': 'solid', 'person-3rd': 'solid', 'number-singular': 'solid',
  'number-plural': 'solid', eimi: 'solid', 'case-nominative': 'solid', 'case-genitive': 'solid', 'case-dative': 'frontier',
  'gender-masculine': 'solid', 'gender-feminine': 'solid',
};

// Puts his grammar levels in the app's own store through raw IndexedDB, as the app wrote them.
async function putLevels(page: Page, ideas: Record<string, 'solid' | 'frontier'> = IDEAS) {
  const rows = Object.entries(ideas).map(([id, level]) => ({ id, level, since: Date.now(), how: 'marked' }));
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('grammarLevels', 'readwrite');
          for (const row of list) tx.objectStore('grammarLevels').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

async function expectFitsPhone(page: Page) {
  const fits = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    c: document.documentElement.clientWidth,
    top: document.documentElement.scrollTop,
    // no table needs sideways scrolling at 390 px
    table: Math.max(
      0,
      ...Array.from(document.querySelectorAll('[data-testid="paradigm-table"]')).map((t) => (t.parentElement?.scrollWidth ?? 0) - (t.parentElement?.clientWidth ?? 0)),
    ),
  }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);
  expect(fits.table).toBeLessThanOrEqual(0);
}

test('Paradigms: the list, a table in Study and Review mode, locked cells, at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  // reached from Settings, beside Review
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Account');
  await page.getByRole('button', { name: /^Paradigms/ }).click();
  await expect(page.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 })).toBeVisible();
  const rows = page.locator('[data-paradigm]');
  await expect(rows).toHaveCount(20);
  await expect(page.locator('[data-paradigm="article"]').getByTestId('paradigm-available')).toHaveText('Available forms: 12 of 24');
  await expect(page.locator('[data-paradigm="eimi"]').getByTestId('paradigm-available')).toHaveText('Available forms: 24 of 70');
  for (const row of await rows.all()) expect((await row.boundingBox())?.height).toBeGreaterThanOrEqual(63.5);
  await expectFitsPhone(page);
  await shot(page, 'paradigms-list');

  // the article, in Study mode: available cells say reveal, locked cells show a lock
  await page.locator('[data-paradigm="article"]').click();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await expect(page.getByTestId('table-available')).toHaveText('Available forms: 12 of 24');
  await expect(page.locator('[data-cell]')).toHaveCount(24);
  const hidden = page.locator('[data-cell][data-state="hidden"]');
  await expect(hidden).toHaveCount(12);
  await expect(page.locator('[data-cell][data-state="locked"]')).toHaveCount(12);
  for (const cell of await hidden.all()) expect((await cell.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await page.locator('[data-cell="Nominative Singular Masculine"]').click();
  await page.locator('[data-cell="Genitive Singular Feminine"]').click();
  await expect(page.locator('[data-cell="Nominative Singular Masculine"]')).toHaveText('ὁ');
  await expect(page.locator('[data-cell="Genitive Singular Feminine"]')).toHaveText('τῆς');
  const greek = await page.locator('[data-cell="Genitive Singular Feminine"]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(greek).toBeGreaterThanOrEqual(20);
  await expectFitsPhone(page);
  await shot(page, 'paradigms-study');

  // Review mode: every available cell shows; the address keeps the mode across a reload
  await page.getByRole('button', { name: 'Review mode', exact: true }).click();
  await expect(page.locator('[data-cell][data-state="shown"]')).toHaveCount(12);
  await expect(page.locator('[data-cell][data-state="hidden"]')).toHaveCount(0);
  await expect(page.locator('[data-cell="Dative Singular Masculine"]')).toHaveText('τῷ');
  await expectFitsPhone(page);
  await shot(page, 'paradigms-review');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Study mode', exact: true })).toBeVisible();
  expect(page.url()).toContain('#/paradigms?t=article&mode=review');

  // the other tables fit the phone, and Ask the tutor is a 48 px button inside the screen
  for (const [id, name, count] of [
    ['noun-endings', 'Noun endings', 40],
    ['eimi', 'εἰμί', 70],
    ['verb-endings', 'Verb endings', 24],
    ['third-declension', 'The third declension', 48],
    ['adjective-endings', 'Adjective endings', 48],
    ['pronouns-personal', 'Personal pronouns', 40],
    ['pronouns-demonstrative-relative', 'Demonstrative and relative pronouns', 48],
    ['pronouns-interrogative-indefinite', 'Interrogative and indefinite pronouns', 32],
    ['subjunctive', 'The subjunctive', 30],
    ['imperative', 'The imperative', 20],
    ['infinitive', 'The infinitive', 9],
    ['participle', 'The participle', 30],
  ] as const) {
    await page.goto(`/#/paradigms?t=${id}&mode=review`);
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await expect(page.locator('[data-cell]')).toHaveCount(count);
    await expectFitsPhone(page);
    const ask = page.getByRole('button', { name: 'Ask the tutor', exact: true });
    await ask.scrollIntoViewIfNeeded();
    expect((await ask.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
    await shot(page, `paradigms-${id}`);
  }
});

test('Paradigms: every form of the mood tables fits its cell at phone width, with every idea solid', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, Object.fromEntries(LADDER.map((idea) => [idea.id, 'solid' as const])));
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  for (const [id, count] of [['subjunctive', 30], ['imperative', 20], ['infinitive', 9], ['participle', 30]] as const) {
    await page.goto(`/#/paradigms?t=${id}&mode=review`);
    await expect(page.locator('[data-cell][data-state="shown"]')).toHaveCount(count);
    await expectFitsPhone(page);
    // no Greek form is cut off or broken inside its cell
    const cut = await page.locator('[data-cell][data-state="shown"]').evaluateAll((cells) =>
      cells.filter((el) => el.scrollWidth > el.clientWidth || el.getClientRects().length === 0 || el.getBoundingClientRect().height > 80).map((el) => el.textContent),
    );
    expect(cut, id).toEqual([]);
    await shot(page, `paradigms-${id}-open`);
  }
});

const SIZES = { Small: 0.85, Normal: 1, Large: 1.3, Largest: 1.6 } as const;

/** Every table of the page, measured as it is drawn: what runs out of its cell, over its neighbour or off the table's edge. Empty when all fits. */
async function misfits(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    const lines = (el: Element): number => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
    };
    for (const table of Array.from(document.querySelectorAll('[data-testid="paradigm-table"]'))) {
      const box = table.parentElement as HTMLElement;
      const edge = box.getBoundingClientRect();
      if (box.scrollWidth > box.clientWidth) bad.push(`table scrolls sideways by ${box.scrollWidth - box.clientWidth}px`);
      if (edge.right > document.documentElement.clientWidth + 0.5) bad.push('table runs off the screen');
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth) bad.push('the page scrolls sideways');
      // a Greek form: whole in one line, inside its own cell (so it cannot lie over the next one) and inside the table
      for (const cell of Array.from(table.querySelectorAll<HTMLElement>('[data-cell][data-state="shown"][lang="el"]'))) {
        const td = cell.closest('td') as HTMLElement;
        const range = document.createRange();
        range.selectNodeContents(cell);
        const text = range.getBoundingClientRect();
        const own = td.getBoundingClientRect();
        const name = `${cell.dataset.cell} (${cell.textContent})`;
        if (cell.scrollWidth > cell.clientWidth) bad.push(`${name} runs out of its cell`);
        if (text.left < own.left - 0.5 || text.right > own.right + 0.5) bad.push(`${name} lies outside its cell`);
        if (text.right > edge.right + 0.5 || text.left < edge.left - 0.5) bad.push(`${name} is cut at the table edge`);
        if (lines(cell) > 1) bad.push(`${name} wraps`);
      }
      // a heading or a row label: no word broken inside and nothing wider than its box
      for (const label of Array.from(table.querySelectorAll<HTMLElement>('th'))) {
        const words = (label.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
        if (label.scrollWidth > label.clientWidth) bad.push(`label '${label.textContent}' is wider than its cell`);
        if (lines(label) > words) bad.push(`label '${label.textContent}' breaks inside a word`);
        // the phone's font is not this machine's: the longest word has to fit with room to spare, not by a hair
        const style = getComputedStyle(label);
        const room = label.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const widest = Math.max(
          0,
          ...(label.textContent ?? '').split(/\s+/).filter(Boolean).map((word) => {
            const probe = document.createElement('span');
            probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${style.font}`;
            probe.textContent = word;
            document.body.appendChild(probe);
            const width = probe.getBoundingClientRect().width;
            probe.remove();
            return width;
          }),
        );
        if (widest > room - 4) bad.push(`label '${label.textContent}' has a word of ${widest.toFixed(0)}px in ${room.toFixed(0)}px`);
      }
    }
    return bad;
  });
}

async function openAllSolid(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, Object.fromEntries(LADDER.map((idea) => [idea.id, 'solid' as const])));
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

/** Opens each table in Review mode at a Text size and reports what does not fit, as 'table: what'. */
async function sweep(page: Page, ids: string[], size: keyof typeof SIZES): Promise<string[]> {
  const found: string[] = [];
  for (const id of ids) {
    await page.goto(`/#/paradigms?t=${id}&mode=review`);
    await page.evaluate((scale) => document.documentElement.style.setProperty('--lp-scale', String(scale)), SIZES[size]);
    await expect(page.locator('[data-cell][data-state="shown"]').first()).toBeVisible();
    for (const problem of await misfits(page)) found.push(`${id} at ${size}: ${problem}`);
  }
  return found;
}

const ALL = PARADIGMS.map((table) => table.id);

test('mw-svw421.15: a six-column table prints no Greek over the next column at 390 px', async ({ page }) => {
  await openAllSolid(page);
  const sixColumns = PARADIGMS.filter((table) => table.columns.length >= 6).map((table) => table.id);
  expect(sixColumns).toEqual(expect.arrayContaining(['article', 'adjective-endings', 'pronouns-demonstrative-relative']));
  expect(await sweep(page, sixColumns, 'Normal')).toEqual([]);
  await page.goto('/#/paradigms?t=adjective-endings&mode=review');
  await shot(page, 'paradigms-adjective-fits');
});

test('mw-svw421.26: at Large and Largest no form runs out of its cell, overlaps or is cut at the table edge', async ({ page }) => {
  await openAllSolid(page);
  expect(await sweep(page, ALL, 'Large')).toEqual([]);
  expect(await sweep(page, ALL, 'Largest')).toEqual([]);
  await page.goto('/#/paradigms?t=participle&mode=review');
  await shot(page, 'paradigms-participle-largest');
});

test("mw-svw421.27: εἰμί's Participle row labels never break mid-word at Normal", async ({ page }) => {
  await openAllSolid(page);
  expect(await sweep(page, ['eimi'], 'Normal')).toEqual([]);
  const participle = page.locator('th[scope="row"]', { hasText: 'Nominative' });
  await expect(participle).toHaveCount(3);
  await participle.last().scrollIntoViewIfNeeded();
  await shot(page, 'paradigms-eimi-participle');
});

test('Paradigms sweep: every table fits at Small and Normal with every idea solid', async ({ page }) => {
  await openAllSolid(page);
  expect(await sweep(page, ALL, 'Small')).toEqual([]);
  expect(await sweep(page, ALL, 'Normal')).toEqual([]);
});

test('mw-svw421.18: a tap on a locked form says in words what it needs, and nothing else changes', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // every idea solid but the plural, so the plural is all that σάρξ in the plural needs
  await putLevels(page, Object.fromEntries(LADDER.filter((idea) => idea.id !== 'number-plural').map((idea) => [idea.id, 'solid' as const])));
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Account');
  await page.getByRole('button', { name: /^Paradigms/ }).click();
  await page.locator('[data-paradigm="third-declension"]').click();
  await expect(page.getByRole('heading', { name: 'The third declension', level: 1 })).toBeVisible();

  const lock = page.locator('[data-cell="σάρξ, feminine Nominative Plural"]');
  await expect(lock).toHaveAttribute('data-state', 'locked');
  const before = await page.locator('[data-cell]').evaluateAll((cells) => cells.map((el) => `${el.getAttribute('data-cell')}|${el.getAttribute('data-state')}`));
  await expect(page.getByTestId('lock-needs')).toHaveCount(0);
  await lock.scrollIntoViewIfNeeded();
  await lock.click();
  // the line is in words, in view beside the lock he tapped, and at least a finger tall
  const line = page.getByTestId('lock-needs');
  await expect(line).toHaveCount(1);
  await expect(line).toContainText('Needs the plural');
  await expect(line.getByRole('button', { name: 'Go to The plural' })).toBeVisible();
  await expect(line).toBeInViewport();
  const tapped = await lock.boundingBox();
  const said = await line.boundingBox();
  expect(Math.abs((said?.y ?? 0) - (tapped?.y ?? 0))).toBeLessThan(120);
  // nothing else changed: the same cells in the same states, no form given away
  expect(await page.locator('[data-cell]').evaluateAll((cells) => cells.map((el) => `${el.getAttribute('data-cell')}|${el.getAttribute('data-state')}`))).toEqual(before);
  await expect(lock).toHaveAttribute('data-state', 'locked');
  await expectFitsPhone(page);
  await shot(page, 'paradigms-lock-needs');

  // its button opens the idea's sheet over the table; Back closes it and the table is still there (mw-svw421.25)
  await line.getByRole('button', { name: 'Go to The plural' }).click();
  await expect(page.getByRole('dialog', { name: 'Idea', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Idea', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The third declension', level: 1 })).toBeVisible();

  // a tap on the same lock again puts the line away
  await lock.click();
  await expect(page.getByTestId('lock-needs')).toHaveCount(0);
});

// A two-state toggle takes one tap per settle moment (src/ui/settle.ts oneTap): a thumb's double tap lands both taps on the control (or, once
// the first has changed the row, on the one that took its place), so it must end where one tap does. The moment is as on his phone (SETTLE_MS) and
// both taps run on the page's clock (tests/support/gesture.ts).
async function openArticle(page: Page, mode: 'study' | 'review' = 'study') {
  await page.clock.install();
  await openUnlocked(page);
  // init scripts run in order: this one puts the moment back after openUnlocked's '0'
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page);
  await page.goto(`/#/paradigms?t=article&mode=${mode}`);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await expect(page.getByTestId('table-available')).toHaveText('Available forms: 12 of 24');
  await pageTime(page, SETTLE_MS + 100);
}

test.describe('a double tap on a two-state toggle', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('mw-svw421.16: a double tap on Review mode ends in Review mode', async ({ page }) => {
    await openArticle(page);
    await tapTwice(page, page.getByRole('button', { name: 'Review mode', exact: true }), 120, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    expect(page.url()).toContain('mode=review');
    await expect(page.getByRole('button', { name: 'Study mode', exact: true })).toBeVisible();
    await expect(page.locator('[data-cell][data-state="shown"]')).toHaveCount(12);
    // a tap after the moment has passed is his next, and switches back
    await page.getByRole('button', { name: 'Study mode', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Review mode', exact: true })).toBeVisible();
  });

  test('mw-svw421.17: a double tap on Hide all ends in Hide all, still in Study mode', async ({ page }) => {
    await openArticle(page);
    await page.locator('[data-cell="Nominative Singular Masculine"]').tap();
    await pageTime(page, SETTLE_MS + 100);
    const hideAll = page.getByRole('button', { name: 'Hide all', exact: true });
    await expect(hideAll).toBeVisible();
    await tapTwice(page, hideAll, 120, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    expect(page.url()).not.toContain('mode=review');
    await expect(page.getByTestId('mode-help')).toHaveText('Study mode: tap a cell to reveal it.');
    await expect(page.locator('[data-cell][data-state="hidden"]')).toHaveCount(12);
    await expect(page.locator('[data-cell][data-state="shown"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hide all', exact: true })).toHaveCount(0);
  });

  test('mw-svw421.21: a double tap on a reveal cell leaves the form shown', async ({ page }) => {
    await openArticle(page);
    const cell = page.locator('[data-cell="Nominative Singular Masculine"]');
    await tapTwice(page, cell, 80, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    await expect(cell).toHaveAttribute('data-state', 'shown');
    await expect(cell).toHaveText('ὁ');
    await shot(page, 'paradigms-double-tap-reveal');
    // a tap after the moment has passed is his next, and hides it
    await cell.tap();
    await expect(cell).toHaveAttribute('data-state', 'hidden');
  });

  // the sweep of mw-svw421.16: a locked form opens and puts away the line saying what it needs, a two-state control too
  test('mw-svw421.16 sweep: a double tap on a locked form leaves the line saying what it needs open', async ({ page }) => {
    await openArticle(page);
    const lock = page.locator('[data-cell][data-state="locked"]').first();
    await lock.scrollIntoViewIfNeeded();
    await tapTwice(page, lock, 120, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    await expect(page.getByTestId('lock-needs')).toHaveCount(1);
    // a tap after the moment has passed is his next, and puts the line away
    await lock.tap();
    await expect(page.getByTestId('lock-needs')).toHaveCount(0);
  });
});
