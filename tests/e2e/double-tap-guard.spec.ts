// tests/e2e/double-tap-guard.spec.ts — one guard, app-wide (src/ui/tapGuard.ts, mw-5r3p30.597), at 390x844 with a touch screen and the settle moment
// as on his phone (SETTLE_MS): a thumb's double tap on the control that changes the screen or opens a sheet, the second tap 120 ms after the first on
// the same spot, once what the first brought up is drawn there. Each test first proves the second tap lands on the control the Tester's did, then
// that it did nothing. Where this size does not put the Tester's control under the same spot (About's Preface, a letter tile, the new sheet's Go to, a
// table's cell), the second tap goes to that control instead, still 120 ms after the first. The screens, one test each, by the Tester bug each folds:
//   mw-5r3p30.453  Settings > About row: the second tap pressed About's Preface
//   mw-5r3p30.454  Settings > Paradigms row: the second tap opened the first table
//   mw-5r3p30.455  Settings > About you row: the second tap set the pace
//   mw-5r3p30.456  About's ‹ Reader: the second tap opened the chapter picker (also Settings' ‹ Reader, mw-svw421.33)
//   mw-svw421.33   Settings' ‹ Reader: the same
//   mw-5r3p30.446  the Verse view's ‹ Reader: the same
//   mw-5r3p30.470  the Reader's chapter name: the second tap shut the picker it opened
//   mw-5r3p30.500  a section heading: the second tap opened a word of the passage it opened
//   mw-5r3p30.445, mw-5r3p30.559  Goal > Grammar ideas > The Greek alphabet: the second tap opened Eta over it
//   mw-5r3p30.447, mw-5r3p30.527, mw-svw421.32, mw-i7xe0n.20  an idea sheet's Done: the second tap opened the idea beneath, or Settings by Change
//   mw-5r3p30.530, mw-i7xe0n.20  an idea sheet's Go to: the second tap opened a third sheet
//   mw-5r3p30.560  the Xi sheet's Done: the second tap closed the alphabet sheet beneath it
//   mw-svw421.19   Paradigms > a table's row: the second tap revealed a form in the table
//   mw-1vuvq6.10   the bridge's idea sheet Done: the second tap closed the talk beneath it
//   mw-5r3p30.487  the round Ask the tutor button, sideways: the second tap started Hold to talk
//   mw-s1dc0n.8    Share to Lampas: a reference, or Cancel: the second tap opened a sheet over the Reader
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { SETTLE_MS } from '../../src/ui/settle';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Puts rows in the app's own stores through raw IndexedDB, as the app wrote them. */
async function put(page: Page, rows: Partial<Record<'settings' | 'grammarLevels' | 'shares', object[]>>): Promise<void> {
  await page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const stores = Object.keys(rows);
          const tx = idb.transaction(stores, 'readwrite');
          for (const store of stores) for (const row of (rows as Record<string, object[]>)[store]) tx.objectStore(store).put(row);
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

/** Opens `hash` with the settle moment put back (openUnlocked starts it at 0), after `rows` are kept; its own first moment has passed. */
async function open(page: Page, hash: string, rows: Parameters<typeof put>[1] = {}, ready?: () => Promise<void>): Promise<void> {
  await openUnlocked(page);
  // init scripts run in order: this one puts the moment back after openUnlocked's '0'
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  if (Object.keys(rows).length > 0) await put(page, rows);
  await page.goto(`/${hash}`);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await ready?.();
  await page.waitForTimeout(SETTLE_MS + 100);
}

/** He reads what is on screen before his next tap. */
const reads = (page: Page) => page.waitForTimeout(SETTLE_MS + 100);

const centre = async (target: Locator) => {
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
};

/** The control the second tap goes to, when it is not under the first: the first (or `last`) element matching `selector` whose label or text holds `text`. */
type Second = { selector: string; text?: string; last?: boolean };

/**
 * A thumb's double tap on `target`: the first tap, then `drawn` (what it brings up is on screen), then the second tap on the same spot (or on
 * `under.second`'s centre), 120 ms after the first, inside the settle moment. Before the second tap, the element at the spot is checked to be inside
 * `under.selector` (and not inside `outside` when given): the second tap lands where the Tester's did. The spot is found and checked in one call
 * in the page, so the second tap still comes inside the moment.
 */
async function doubleTap(page: Page, target: Locator, drawn: () => Promise<unknown>, under: { selector: string; outside?: string; second?: Second }): Promise<void> {
  const at = await centre(target);
  const first = Date.now();
  await page.touchscreen.tap(at.x, at.y);
  await drawn();
  const spot = await page.evaluate(
    ([ax, ay, selector, outside, second]) => {
      let x = ax;
      let y = ay;
      if (second) {
        const named = (el: Element) => !second.text || `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`.includes(second.text);
        const all = [...document.querySelectorAll(second.selector)].filter(named);
        const el = second.last ? all[all.length - 1] : all[0];
        if (!el) return { x, y, hit: `no ${second.selector} ${second.text ?? ''}` };
        el.scrollIntoView({ block: 'nearest' });
        const box = el.getBoundingClientRect();
        x = box.x + box.width / 2;
        y = box.y + box.height / 2;
      }
      const there = document.elementFromPoint(x, y);
      if (!there?.closest(selector)) return { x, y, hit: `nothing in ${selector}: ${there?.outerHTML.slice(0, 120)}` };
      if (outside && there.closest(outside)) return { x, y, hit: `inside ${outside}` };
      return { x, y, hit: 'hit' };
    },
    [at.x, at.y, under.selector, under.outside ?? '', under.second ?? null] as const,
  );
  expect(spot.hit).toBe('hit');
  const gap = 120 - (Date.now() - first);
  if (gap > 0) await page.waitForTimeout(gap);
  expect(Date.now() - first).toBeLessThan(SETTLE_MS);
  await page.touchscreen.tap(spot.x, spot.y);
  await page.waitForTimeout(SETTLE_MS);
}

const IDEAS = '[role="dialog"][aria-label="Idea"]';
const ideas = (page: Page) => page.getByRole('dialog', { name: 'Idea' });
const chapterName = (page: Page) => page.locator('header h1 button');
const picker = (page: Page) => page.getByRole('dialog', { name: /^Choose a/ });
const anyDialog = (page: Page) => page.locator('[role="dialog"], [role="alertdialog"]');

/** The Goal screen of 1 John 1 with its Grammar ideas list open. */
async function openIdeasList(page: Page): Promise<Locator> {
  await open(page, '#/goal', { settings: [{ key: 'goal', value: '1 John 1' }] }, async () => {
    await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1');
  });
  await page.getByTestId('ideas-bar').click();
  const list = page.getByTestId('ideas-list');
  await expect(list).toBeVisible();
  await reads(page);
  return list;
}

/** An idea sheet opened from the Goal's list, loaded, its moment passed. */
async function openIdea(page: Page, name: string): Promise<Locator> {
  const list = await openIdeasList(page);
  await list.getByRole('button', { name, exact: true }).click();
  const idea = ideas(page).last();
  await expect(idea.getByRole('heading', { name })).toBeVisible();
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await reads(page);
  return idea;
}

test.describe('Settings rows', () => {
  test('mw-5r3p30.453: a double tap on the About row opens About, not the Preface', async ({ page }) => {
    // a taller phone, so About's Preface is in view the moment About is drawn (at 844 it is below the fold, and a scroll outlasts the moment)
    await page.setViewportSize({ width: 390, height: 1400 });
    await open(page, '#/settings', {}, () => page.getByRole('heading', { name: 'Settings', level: 1 }).first().waitFor());
    const row = page.getByRole('button', { name: 'About', exact: true });
    await row.scrollIntoViewIfNeeded();
    await reads(page);
    await doubleTap(page, row, () => page.getByRole('heading', { name: 'About', level: 1 }).first().waitFor(), {
      selector: 'button[aria-label="Preface"]',
      second: { selector: 'button[aria-label="Preface"]' },
    });
    await expect(page).toHaveURL(/#\/about$/);
    await shot(page, 'double-tap-guard-about-row');
  });

  test('mw-5r3p30.454: a double tap on the Paradigms row opens the list, not its first table', async ({ page }) => {
    await open(page, '#/settings', {}, () => page.getByRole('heading', { name: 'Settings', level: 1 }).first().waitFor());
    const row = page.getByRole('button', { name: /^Paradigms/ });
    await row.scrollIntoViewIfNeeded();
    await reads(page);
    await doubleTap(page, row, () => page.getByRole('heading', { name: 'Paradigms', level: 1 }).first().waitFor(), { selector: '[data-paradigm]' });
    await expect(page).toHaveURL(/#\/paradigms$/);
  });

  test('mw-5r3p30.455: a double tap on the About you row sets no pace', async ({ page }) => {
    await open(page, '#/settings', {}, () => page.getByRole('heading', { name: 'Settings', level: 1 }).first().waitFor());
    const row = page.getByRole('button', { name: 'About you', exact: true });
    await row.scrollIntoViewIfNeeded();
    await reads(page);
    await doubleTap(page, row, () => page.getByRole('button', { name: 'Slow', exact: true }).first().waitFor(), { selector: 'button[aria-pressed]' });
    await expect(page).toHaveURL(/#\/aboutyou$/);
    for (const pace of ['Quick', 'Steady', 'Slow']) await expect(page.getByRole('button', { name: pace, exact: true })).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('back to the Reader', () => {
  for (const [bug, from, heading] of [
    ['mw-5r3p30.456', '#/about', 'About'],
    ['mw-svw421.33', '#/settings', 'Settings'],
  ] as const) {
    test(`${bug}: a double tap on ${heading}'s ‹ Reader opens the Reader with no chapter picker over it`, async ({ page }) => {
      await open(page, from, {}, () => page.getByRole('heading', { name: heading, level: 1 }).first().waitFor());
      await doubleTap(page, page.getByRole('button', { name: '‹ Reader', exact: true }), () => chapterName(page).first().waitFor(), { selector: 'header h1 button' });
      await expect(chapterName(page)).toBeVisible();
      await expect(anyDialog(page)).toHaveCount(0);
      // one tap after the moment opens the picker as it always did
      await chapterName(page).tap();
      await expect(picker(page)).toBeVisible();
    });
  }

  test("mw-5r3p30.446: a double tap on the Verse view's ‹ Reader opens the Reader with no chapter picker over it", async ({ page }) => {
    await open(page, '#/?b=rom&c=8&v=28', {}, () => page.getByRole('button', { name: '‹ Reader', exact: true }).first().waitFor());
    await doubleTap(page, page.getByRole('button', { name: '‹ Reader', exact: true }), () => chapterName(page).first().waitFor(), { selector: 'header h1 button' });
    await expect(page.getByRole('button', { name: '‹ Reader', exact: true })).toHaveCount(0);
    await expect(anyDialog(page)).toHaveCount(0);
    await shot(page, 'double-tap-guard-verse-back');
  });
});

test.describe('the Reader', () => {
  test("mw-5r3p30.470: a double tap on the chapter's name opens the picker and leaves it open", async ({ page }) => {
    await open(page, '#/', {}, () => chapterName(page).first().waitFor());
    await doubleTap(page, chapterName(page), () => picker(page).first().waitFor(), { selector: '[data-testid="sheet-backdrop"]' });
    await expect(picker(page)).toBeVisible();
    await shot(page, 'double-tap-guard-chapter-name');
  });

  test('mw-5r3p30.500: a double tap on a section heading opens its passage and no word', async ({ page }) => {
    await open(page, '#/?b=eph&c=5&view=greek', {}, () => page.getByRole('button', { name: 'Wives and Husbands' }).first().waitFor());
    const heading = page.getByRole('button', { name: 'Wives and Husbands' });
    await heading.scrollIntoViewIfNeeded();
    await reads(page);
    await doubleTap(page, heading, () => page.waitForFunction(() => /p=\d+/.test(location.hash), null, { polling: 'raf' }).then(() => {}), { selector: '[data-word]' });
    await expect(page).toHaveURL(/p=\d+/);
    await expect(page.getByRole('dialog', { name: 'Word' })).toHaveCount(0);
  });
});

test.describe('the Goal screen and its idea sheets', () => {
  test('mw-5r3p30.445, mw-5r3p30.559: a double tap on The Greek alphabet opens its sheet and no letter over it', async ({ page }) => {
    const list = await openIdeasList(page);
    const row = list.getByRole('button', { name: 'The Greek alphabet', exact: true });
    const eta = ideas(page).getByRole('button', { name: 'About eta' });
    // the sheet slides up as it opens: the tile is measured where it comes to rest
    const settled = async () => {
      await eta.waitFor();
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    };
    await doubleTap(page, row, settled, { selector: `${IDEAS} button`, second: { selector: `${IDEAS} button`, text: 'About eta' } });
    await expect(ideas(page)).toHaveCount(1);
    await expect(ideas(page).getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
    await shot(page, 'double-tap-guard-alphabet');
  });

  test('mw-5r3p30.447, mw-5r3p30.527, mw-svw421.32, mw-i7xe0n.20: a double tap on an idea sheet\'s Done opens nothing beneath', async ({ page }) => {
    const idea = await openIdea(page, 'The noun');
    await doubleTap(page, idea.getByRole('button', { name: 'Done', exact: true }), () => ideas(page).first().waitFor({ state: 'detached' }), { selector: 'button', outside: '[role="dialog"]' });
    await expect(ideas(page)).toHaveCount(0);
    await expect(page).toHaveURL(/#\/goal$/);
  });

  test("mw-5r3p30.530, mw-i7xe0n.20: a double tap on an idea sheet's Go to opens one sheet, not two", async ({ page }) => {
    const idea = await openIdea(page, 'The noun');
    const goTo = idea.getByRole('button', { name: /^Go to / }).first();
    const to = ((await goTo.textContent()) ?? '').replace(/^Go to /, '').trim();
    const next = ideas(page).nth(1).getByRole('button', { name: /^Go to / }).first();
    await doubleTap(page, goTo, () => next.first().waitFor(), { selector: `${IDEAS} button`, second: { selector: `${IDEAS} button`, text: 'Go to', last: true } });
    await expect(ideas(page)).toHaveCount(2);
    await expect(ideas(page).last().getByRole('heading', { name: new RegExp(to, 'i') })).toBeVisible();
  });

  test("mw-5r3p30.560: a double tap on the Xi sheet's Done leaves the alphabet sheet open", async ({ page }) => {
    const alphabet = await openIdea(page, 'The Greek alphabet');
    await alphabet.getByRole('button', { name: 'About xi' }).click();
    await expect(ideas(page)).toHaveCount(2);
    const xi = ideas(page).last();
    await expect(xi.getByRole('heading', { name: 'Xi' })).toBeVisible();
    await expect(xi.getByTestId('idea-loading')).toHaveCount(0);
    await reads(page);
    await doubleTap(page, xi.getByRole('button', { name: 'Done', exact: true }), () => ideas(page).nth(1).waitFor({ state: 'detached' }), { selector: `${IDEAS} button` });
    await expect(ideas(page)).toHaveCount(1);
    await expect(ideas(page).getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  });
});

test('mw-svw421.19: a double tap on a Paradigms row opens its table and reveals no form', async ({ page }) => {
  const solid = ['article', 'noun', 'case-nominative', 'case-genitive', 'number-singular', 'number-plural', 'gender-masculine', 'gender-feminine'];
  await open(page, '#/paradigms', { grammarLevels: solid.map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' })) }, () =>
    expect(page.getByRole('heading', { name: 'Paradigms', level: 1 })).toBeVisible(),
  );
  const row = page.locator('[data-paradigm="article"]');
  await reads(page);
  const hidden = page.locator('[data-cell][data-state="hidden"]').first();
  await doubleTap(page, row, () => hidden.first().waitFor(), { selector: '[data-cell][data-state="hidden"]', second: { selector: '[data-cell][data-state="hidden"]' } });
  await expect(page.getByTestId('paradigm-table')).toBeVisible();
  await expect(page.locator('[data-cell][data-state="shown"]')).toHaveCount(0);
});

test('mw-1vuvq6.10: a double tap on the bridge idea sheet\'s Done leaves the talk open', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: {
      answer: 'Briefly: the genitive is the case that says "of". You are missing quite a bit for this; start with the Greek alphabet.',
      words: [],
      bridge: { missing: ['alphabet', 'diphthongs', 'consonant-pairs'], next: 'alphabet', why: 'Everything in Greek starts with its letters.' },
    },
  };
  await routePostern(page, fake);
  await open(page, '#/words', {}, () => page.getByRole('heading', { name: 'Words', level: 1 }).first().waitFor());
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const talk = page.getByRole('dialog', { name: 'Ask the tutor: Words' });
  await reads(page);
  await talk.getByRole('textbox', { name: 'Your message' }).fill('Why is the genitive used here?');
  await talk.getByRole('button', { name: 'Send', exact: true }).click();
  await talk.getByRole('button', { name: 'Take me there: The Greek alphabet' }).click();
  const idea = ideas(page);
  await expect(idea.getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await reads(page);
  await doubleTap(page, idea.getByRole('button', { name: 'Done', exact: true }), () => idea.first().waitFor({ state: 'detached' }), { selector: '[data-testid="sheet-backdrop"]' });
  await expect(talk).toBeVisible();
  await expect(talk.getByRole('button', { name: 'Take me there: The Greek alphabet' })).toBeVisible();
});

test.describe('sideways', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('mw-5r3p30.487: a double tap on the round Ask the tutor button opens the talk and does not start Hold to talk', async ({ page }) => {
    await honestMic(page);
    await open(page, '#/about', {}, () => page.getByRole('heading', { name: 'About', level: 1 }).first().waitFor());
    const talk = page.getByRole('dialog', { name: /^Ask the tutor/ });
    await doubleTap(page, page.getByRole('button', { name: 'Ask the tutor about this screen' }), () => talk.first().waitFor(), { selector: '[name="Hold to talk"], button' });
    await expect(talk).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(talk.getByText(/No speech was heard|speech service failed/)).toHaveCount(0);
    await expect(talk.getByText(/Release to send|Starting the mic/)).toHaveCount(0);
  });
});

test.describe('Share to Lampas', () => {
  /** The share sheet on a screenshot's words, its first moment passed. */
  async function openShare(page: Page): Promise<Locator> {
    await open(page, '#/share?s=guard', { shares: [{ id: 'guard', createdAt: Date.now(), text: 'Paul writes in Rom 8:28 that all things work together.', files: [] }] });
    const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
    await expect(sheet.getByRole('heading', { name: 'Bible references (1)' })).toBeVisible();
    await reads(page);
    return sheet;
  }

  // the Tester's Gen. 1:28 now opens the 'Not in Lampas yet' card in the list (no Old Testament); a New Testament reference leaves the share for the Reader
  test('mw-s1dc0n.8: a double tap on a reference opens it with no sheet over the Reader', async ({ page }) => {
    const sheet = await openShare(page);
    await doubleTap(page, sheet.getByRole('link', { name: /Rom 8:28/ }), () => page.locator('[data-chunk], [data-word]').first().waitFor(), {
      selector: '[data-chunk], [data-word]',
      second: { selector: '[data-chunk], [data-word]' },
    });
    await expect(page).not.toHaveURL(/#\/share/);
    expect(await anyDialog(page).evaluateAll((all) => all.map((d) => d.getAttribute('aria-label')))).toEqual([]);
  });

  test('mw-s1dc0n.8: a double tap on Cancel closes the share with no sheet over the Reader', async ({ page }) => {
    const sheet = await openShare(page);
    await doubleTap(page, sheet.getByRole('button', { name: 'Cancel', exact: true }), () => page.locator('[data-chunk], [data-word]').first().waitFor(), {
      selector: '[data-chunk], [data-word]',
      second: { selector: '[data-chunk], [data-word]' },
    });
    await expect(page).not.toHaveURL(/#\/share/);
    expect(await anyDialog(page).evaluateAll((all) => all.map((d) => d.getAttribute('aria-label')))).toEqual([]);
  });
});
