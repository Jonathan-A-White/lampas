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
import { pageTime, tapTwice } from '../support/gesture';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// tapTwice (tests/support/gesture.ts) times the two taps, and the guard its moment, on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

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
  // The Reader writes its view and weave into the address once its settings have loaded (src/nav/readerAddress.ts), which on a loaded host can come after the heading
  // is drawn: a Reader address opened before then has its view overwritten by the saved one (mw-5r3p30.666: 'view=greek' became 'view=english', and the passage drew
  // English chunks). Only the Reader's own address is written, so the other screens' hashes are opened at once.
  if (/^#\/(\?|$)/.test(hash)) await expect(page).toHaveURL(/#\/\?.*view=.*weave=/);
  if (Object.keys(rows).length > 0) await put(page, rows);
  // The share sheet pushes a history entry the moment it is drawn, so one drawn before the reload below is a stale sheet to the fresh page, which leaves it with
  // history.go(-1) (src/ui/sheetBack.ts leaveStaleSheets): on a loaded host that went back past the share to the Reader, which the share then became (1 run in 8 at 8 workers).
  // The address is replaced without drawing the screen, so the reload is the share's first draw.
  if (hash.startsWith('#/share')) await page.evaluate((to) => window.history.replaceState(null, '', to), `/${hash}`);
  else await page.goto(`/${hash}`);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await ready?.();
  await pageTime(page, SETTLE_MS + 100);
}

/** He reads what is on screen before his next tap. */
const reads = (page: Page) => pageTime(page, SETTLE_MS + 100);

/** The middle of `target` once it has stopped moving: a screen's rows come from the database in real time, not on the page's clock, and a row drawn
 * late above it moves it down. */
const centre = async (target: Locator) => {
  await expect(target).toBeVisible();
  let box = await target.boundingBox();
  await expect
    .poll(async () => {
      const was = box;
      box = await target.boundingBox();
      return JSON.stringify(box) === JSON.stringify(was) && box !== null;
    })
    .toBe(true);
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
};

/** The control the second tap goes to, when it is not under the first: the first (or `last`) element matching `selector` whose label or text holds `text`. */
type Second = { selector: string; text?: string; last?: boolean };

/** The page time a screen may take to be drawn between the taps: the first tap's 120 ms and this stay inside the settle moment. */
const DRAW_BUDGET_MS = SETTLE_MS - 120 - 40;

/**
 * Waits for `drawn` with the page's clock paused, letting it run a few ms at a time while what the first tap brought up is not yet on screen: React
 * reveals a screen that waited on its code or data on a timer, which a clock held still never fires. It stays inside DRAW_BUDGET_MS of page time.
 */
async function drawnOnPageClock(page: Page, drawn: () => Promise<unknown>): Promise<void> {
  let done = false;
  const waiting = drawn().then(() => {
    done = true;
  });
  for (let ran = 0; !done; ran += 10) {
    await Promise.race([waiting, new Promise((resolve) => setTimeout(resolve, 100))]);
    if (done) break;
    expect(ran, 'what the first tap brings up is drawn inside the settle moment').toBeLessThan(DRAW_BUDGET_MS);
    await page.clock.runFor(10);
  }
  await waiting;
}

/**
 * A thumb's double tap on `target`, 120 ms apart on the page's clock (tests/support/gesture.ts tapTwice), inside the settle moment however slowly the host
 * delivers it: the first tap, then `drawn` (what it brings up is on screen), then the second tap on the same spot (or on `under.second`'s centre).
 * Before the second tap, the element at the spot is checked to be inside `under.selector` (and not inside `outside` when given): the second tap lands
 * where the Tester's did.
 */
async function thumbDoubleTap(page: Page, target: Locator, drawn: () => Promise<unknown>, under: { selector: string; outside?: string; second?: Second }): Promise<void> {
  const at = await centre(target);
  // the first tap lands on the control itself
  expect(await target.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [at.x, at.y] as const)).toBe(true);
  await tapTwice(page, at, 120, {
    touch: true,
    between: async () => {
      await drawnOnPageClock(page, drawn);
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
      return [spot.x, spot.y] as const;
    },
  });
  await pageTime(page, SETTLE_MS);
}

const IDEAS = '[role="dialog"][aria-label="Idea"]';
const ideas = (page: Page) => page.getByRole('dialog', { name: 'Idea', exact: true });
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
    // About has been open once, as on his phone, so its first draw (its credits) does not outlast the moment on a loaded host
    await open(page, '#/about', {}, () => page.locator('button[aria-label="Preface"]').waitFor());
    // a new hash on the same page: the app moves to Settings' Account page (where About, Paradigms and About you are) without a reload
    await page.goto('/#/settings?group=account');
    await page.getByRole('heading', { name: 'Account', exact: true, level: 1 }).waitFor();
    const row = page.getByRole('button', { name: 'About', exact: true });
    await row.scrollIntoViewIfNeeded();
    await reads(page);
    // About's Preface is below the fold at this size: the second tap goes to it, scrolled into view on the page's clock held still
    await thumbDoubleTap(page, row, () => page.getByRole('heading', { name: 'About', exact: true, level: 1 }).first().waitFor(), {
      selector: 'button[aria-label="Preface"]',
      second: { selector: 'button[aria-label="Preface"]' },
    });
    await expect(page).toHaveURL(/#\/about$/);
    await shot(page, 'double-tap-guard-about-row');
  });

  test('mw-5r3p30.454: a double tap on the Paradigms row opens the list, not its first table', async ({ page }) => {
    await open(page, '#/settings?group=account', {}, () => page.getByRole('heading', { name: 'Account', exact: true, level: 1 }).first().waitFor());
    const row = page.getByRole('button', { name: /^Paradigms/ });
    await row.scrollIntoViewIfNeeded();
    await reads(page);
    await thumbDoubleTap(page, row, () => page.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 }).first().waitFor(), { selector: '[data-paradigm]' });
    await expect(page).toHaveURL(/#\/paradigms$/);
  });

  test('mw-5r3p30.455: a double tap on the About you row sets no pace', async ({ page }) => {
    await open(page, '#/settings?group=account', {}, () => page.getByRole('heading', { name: 'Account', exact: true, level: 1 }).first().waitFor());
    const row = page.getByRole('button', { name: 'About you', exact: true });
    await row.scrollIntoViewIfNeeded();
    await reads(page);
    await thumbDoubleTap(page, row, () => page.getByRole('button', { name: 'Slow', exact: true }).first().waitFor(), {
      selector: 'button[aria-pressed]',
      // the About you row is near the top of the Account page, over the intro on About you: the second tap goes to the Slow button, scrolled into view
      second: { selector: 'button[aria-pressed]', text: 'Slow' },
    });
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
      await thumbDoubleTap(page, page.getByRole('button', { name: '‹ Reader', exact: true }), () => chapterName(page).first().waitFor(), { selector: 'header h1 button' });
      await expect(chapterName(page)).toBeVisible();
      await expect(anyDialog(page)).toHaveCount(0);
      // one tap after the moment opens the picker as it always did
      await chapterName(page).tap();
      await expect(picker(page)).toBeVisible();
    });
  }

  test("mw-5r3p30.446: a double tap on the Verse view's ‹ Reader opens the Reader with no chapter picker over it", async ({ page }) => {
    await open(page, '#/?b=rom&c=8&v=28', {}, () => page.getByRole('button', { name: '‹ Reader', exact: true }).first().waitFor());
    await thumbDoubleTap(page, page.getByRole('button', { name: '‹ Reader', exact: true }), () => chapterName(page).first().waitFor(), { selector: 'header h1 button' });
    await expect(page.getByRole('button', { name: '‹ Reader', exact: true })).toHaveCount(0);
    await expect(anyDialog(page)).toHaveCount(0);
    await shot(page, 'double-tap-guard-verse-back');
  });
});

test.describe('the Reader', () => {
  test("mw-5r3p30.470: a double tap on the chapter's name opens the picker and leaves it open", async ({ page }) => {
    await open(page, '#/', {}, () => chapterName(page).first().waitFor());
    await thumbDoubleTap(page, chapterName(page), () => picker(page).first().waitFor(), { selector: '[data-testid="sheet-backdrop"]' });
    await expect(picker(page)).toBeVisible();
    await shot(page, 'double-tap-guard-chapter-name');
  });

  test('mw-5r3p30.500: a double tap on a section heading opens its passage and no word', async ({ page }) => {
    await open(page, '#/?b=eph&c=5&view=greek', {}, () => page.getByRole('button', { name: 'Wives and Husbands' }).first().waitFor());
    const heading = page.getByRole('button', { name: 'Wives and Husbands' });
    await heading.scrollIntoViewIfNeeded();
    await reads(page);
    await thumbDoubleTap(page, heading, () => page.waitForFunction(() => /p=\d+/.test(location.hash), null, { polling: 'raf' }).then(() => {}), { selector: '[data-word]' });
    await expect(page).toHaveURL(/p=\d+/);
    await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toHaveCount(0);
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
    await thumbDoubleTap(page, row, settled, { selector: `${IDEAS} button`, second: { selector: `${IDEAS} button`, text: 'About eta' } });
    await expect(ideas(page)).toHaveCount(1);
    await expect(ideas(page).getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
    await shot(page, 'double-tap-guard-alphabet');
  });

  test('mw-5r3p30.447, mw-5r3p30.527, mw-svw421.32, mw-i7xe0n.20: a double tap on an idea sheet\'s Done opens nothing beneath', async ({ page }) => {
    const idea = await openIdea(page, 'The noun');
    await thumbDoubleTap(page, idea.getByRole('button', { name: 'Done', exact: true }), () => ideas(page).first().waitFor({ state: 'detached' }), { selector: 'button', outside: '[role="dialog"]' });
    await expect(ideas(page)).toHaveCount(0);
    await expect(page).toHaveURL(/#\/goal$/);
  });

  test("mw-5r3p30.530, mw-i7xe0n.20: a double tap on an idea sheet's Go to opens one sheet, not two", async ({ page }) => {
    const idea = await openIdea(page, 'The noun');
    const goTo = idea.getByRole('button', { name: /^Go to / }).first();
    const to = ((await goTo.textContent()) ?? '').replace(/^Go to /, '').trim();
    const next = ideas(page).nth(1).getByRole('button', { name: /^Go to / }).first();
    await thumbDoubleTap(page, goTo, () => next.first().waitFor(), { selector: `${IDEAS} button`, second: { selector: `${IDEAS} button`, text: 'Go to', last: true } });
    await expect(ideas(page)).toHaveCount(2);
    await expect(ideas(page).last().getByRole('heading', { name: new RegExp(to, 'i') })).toBeVisible();
  });

  test("mw-5r3p30.560: a double tap on the Xi sheet's Done leaves the alphabet sheet open", async ({ page }) => {
    const alphabet = await openIdea(page, 'The Greek alphabet');
    await alphabet.getByRole('button', { name: 'About xi' }).click();
    await expect(ideas(page)).toHaveCount(2);
    const xi = ideas(page).last();
    await expect(xi.getByRole('heading', { name: 'Xi', exact: true })).toBeVisible();
    await expect(xi.getByTestId('idea-loading')).toHaveCount(0);
    await reads(page);
    await thumbDoubleTap(page, xi.getByRole('button', { name: 'Done', exact: true }), () => ideas(page).nth(1).waitFor({ state: 'detached' }), { selector: `${IDEAS} button` });
    await expect(ideas(page)).toHaveCount(1);
    await expect(ideas(page).getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  });
});

test('mw-svw421.19: a double tap on a Paradigms row opens its table and reveals no form', async ({ page }) => {
  const solid = ['article', 'noun', 'case-nominative', 'case-genitive', 'number-singular', 'number-plural', 'gender-masculine', 'gender-feminine'];
  await open(page, '#/paradigms', { grammarLevels: solid.map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' })) }, () =>
    expect(page.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 })).toBeVisible(),
  );
  const row = page.locator('[data-paradigm="article"]');
  await reads(page);
  const hidden = page.locator('[data-cell][data-state="hidden"]').first();
  await thumbDoubleTap(page, row, () => hidden.first().waitFor(), { selector: '[data-cell][data-state="hidden"]', second: { selector: '[data-cell][data-state="hidden"]' } });
  await expect(page.getByTestId('paradigm-table').first()).toBeVisible();
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
  await open(page, '#/words', {}, () => page.getByRole('heading', { name: 'Words', exact: true, level: 1 }).first().waitFor());
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
  await thumbDoubleTap(page, idea.getByRole('button', { name: 'Done', exact: true }), () => idea.first().waitFor({ state: 'detached' }), { selector: '[data-testid="sheet-backdrop"]' });
  await expect(talk).toBeVisible();
  await expect(talk.getByRole('button', { name: 'Take me there: The Greek alphabet' })).toBeVisible();
});

test.describe('sideways', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('mw-5r3p30.487: a double tap on the round Ask the tutor button opens the talk and does not start Hold to talk', async ({ page }) => {
    await honestMic(page);
    await open(page, '#/about', {}, () => page.getByRole('heading', { name: 'About', exact: true, level: 1 }).first().waitFor());
    const talk = page.getByRole('dialog', { name: /^Ask the tutor/ });
    await thumbDoubleTap(page, page.getByRole('button', { name: 'Ask the tutor about this screen' }), () => talk.first().waitFor(), { selector: '[name="Hold to talk"], button' });
    await expect(talk).toBeVisible();
    await pageTime(page, 1000);
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
    await thumbDoubleTap(page, sheet.getByRole('link', { name: /Rom 8:28/ }), () => page.locator('[data-chunk], [data-word]').first().waitFor(), {
      selector: '[data-chunk], [data-word]',
      second: { selector: '[data-chunk], [data-word]' },
    });
    await expect(page).not.toHaveURL(/#\/share/);
    expect(await anyDialog(page).evaluateAll((all) => all.map((d) => d.getAttribute('aria-label')))).toEqual([]);
  });

  test('mw-s1dc0n.8: a double tap on Cancel closes the share with no sheet over the Reader', async ({ page }) => {
    const sheet = await openShare(page);
    await thumbDoubleTap(page, sheet.getByRole('button', { name: 'Cancel', exact: true }), () => page.locator('[data-chunk], [data-word]').first().waitFor(), {
      selector: '[data-chunk], [data-word]',
      second: { selector: '[data-chunk], [data-word]' },
    });
    await expect(page).not.toHaveURL(/#\/share/);
    expect(await anyDialog(page).evaluateAll((all) => all.map((d) => d.getAttribute('aria-label')))).toEqual([]);
  });
});
