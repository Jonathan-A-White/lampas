// tests/e2e/reading-plan-return.spec.ts — back from Audible with a listening session open, the return sheet asks 'Where did you get to?' (mw-umv8sp.3), at 390x844.
// The session is planted in the phone's database; the page's clock is set (page.clock.setFixedTime: Date only, no timer is faked) to the session's start plus the time the
// chapters take in audibleStarts.json, and leaving and coming back are the page's own visibilitychange and focus events.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { OT_BOOKS } from '../../src/data/books';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const STARTS = (JSON.parse(readFileSync('src/resources/audibleStarts.json', 'utf8')) as { chapters: Record<string, number> }).chapters;
const start = (key: string): number => STARTS[key];
/** two chapters of listening from Leviticus 1: the time to the start of Leviticus 3 */
const TWO_CHAPTERS = start('lev.3') - start('lev.1');
// The session's start is the real clock now, never a date written in the spec: openUnlocked remembers the licence as held a minute before the real now, and a page clock set
// before that counts it as not held (src/services/licenceCache.ts; mw-5r3p30.575, mw-5r3p30.606).
const SET_OFF = Date.now();

/** the keys of every chapter before Leviticus 1: 'gen.1' to 'exo.40', 90 in all */
const BEFORE_LEVITICUS = OT_BOOKS.slice(0, 2).flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `${b.code}.${i + 1}`));

interface PlanState {
  planId: string;
  start: { code: string; chapter: number };
  done: string[];
  session?: { code: string; chapter: number; startedAt: number };
}

/** Writes rows to the app's own settings store through raw IndexedDB, as the app wrote them. */
async function putSettings(page: Page, rows: { key: string; value: string }[]): Promise<void> {
  await page.evaluate(
    (rs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          for (const r of rs) tx.objectStore('settings').put(r);
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

async function readState(page: Page): Promise<PlanState> {
  const value = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const get = idb.transaction('settings').objectStore('settings').get('readingPlanState');
          get.onsuccess = () => {
            idb.close();
            resolve((get.result as { value: string }).value);
          };
          get.onerror = () => reject(get.error);
        };
      }),
  );
  return JSON.parse(value) as PlanState;
}

/** The plan started at Leviticus 1 with a session opened there at SET_OFF, on a phone showing the Reader. */
async function listeningSince(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const state: PlanState = { planId: 'whole-bible', start: { code: 'lev', chapter: 1 }, done: BEFORE_LEVITICUS, session: { code: 'lev', chapter: 1, startedAt: SET_OFF } };
  await putSettings(page, [
    { key: 'readingPlan', value: 'on' },
    { key: 'audioBible', value: 'word-of-promise' },
    { key: 'readingPlanState', value: JSON.stringify(state) },
  ]);
}

/** She leaves for Audible and `ms` after the session began she is back: Lampas is hidden, the clock moves, Lampas is visible and focused again. */
async function awayAndBack(page: Page, ms: number): Promise<void> {
  const setVisibility = (state: 'hidden' | 'visible') =>
    page.evaluate((s) => {
      Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
      Object.defineProperty(document, 'hidden', { value: s === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  await setVisibility('hidden');
  await page.clock.setFixedTime(SET_OFF + ms);
  await setVisibility('visible');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Where did you get to?' });

test('back after two chapters of listening the sheet proposes Leviticus 3, and Stopped in marks the chapters before it done', async ({ page }) => {
  await listeningSince(page);
  await awayAndBack(page, TWO_CHAPTERS + 5_000);

  const dialog = sheet(page);
  await expect(dialog).toBeVisible();
  // visibilitychange and focus are one return: one sheet
  await expect(page.getByRole('dialog', { name: 'Where did you get to?' })).toHaveCount(1);
  await expect(dialog.getByRole('heading', { name: 'Where did you get to?' })).toBeVisible();
  await expect(dialog.locator('[data-proposal]')).toHaveCount(1);
  await expect(dialog.locator('[data-proposal]')).toHaveAccessibleName('Stopped in: Leviticus 3');
  await expect(dialog.getByRole('button', { name: 'Finished Leviticus 1' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Pick it myself' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Stopped partway, the plan stays at Leviticus 1' })).toBeVisible();
  const around = await dialog.getByRole('group', { name: 'I stopped in' }).getByRole('button').allTextContents();
  expect(around.map((t) => t.replace('my guess', '').trim())).toEqual(['Leviticus 1', 'Leviticus 2', 'Leviticus 3', 'Leviticus 4', 'Leviticus 5']);

  // it fits the phone: every button is 48 px tall and the whole sheet is on the screen
  await page.waitForTimeout(400); // the slide-up has ended
  const buttons = await dialog.getByRole('button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  for (const box of buttons) {
    expect(box.height).toBeGreaterThanOrEqual(43.5);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.left).toBeGreaterThanOrEqual(0);
  }
  const frame = await dialog.boundingBox();
  expect(frame!.y).toBeGreaterThanOrEqual(0);
  expect(frame!.y + frame!.height).toBeLessThanOrEqual(844 + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'reading-plan-return');

  await dialog.getByRole('button', { name: 'Stopped in: Leviticus 3' }).click();
  await expect(dialog).toHaveCount(0);
  const state = await readState(page);
  expect(state.session).toBeUndefined();
  // she stopped in Leviticus 3: it is not done, it is next
  expect(state.done).toHaveLength(92);
  expect(state.done).toContain('lev.2');
  expect(state.done).not.toContain('lev.3');

  // the session is over: coming back again asks nothing
  await awayAndBack(page, TWO_CHAPTERS * 2);
  await page.waitForTimeout(300);
  await expect(sheet(page)).toHaveCount(0);
});

test('Finished marks the chapter she began, and Stopped partway marks nothing', async ({ page }) => {
  await listeningSince(page);
  await awayAndBack(page, TWO_CHAPTERS + 5_000);
  await sheet(page).getByRole('button', { name: 'Finished Leviticus 1' }).click();
  await expect(sheet(page)).toHaveCount(0);
  let state = await readState(page);
  expect(state.session).toBeUndefined();
  expect(state.done).toHaveLength(91);

  // a second session, ended partway
  await putSettings(page, [{ key: 'readingPlanState', value: JSON.stringify({ ...state, session: { code: 'lev', chapter: 2, startedAt: SET_OFF } }) }]);
  await awayAndBack(page, TWO_CHAPTERS);
  await sheet(page).getByRole('button', { name: 'Stopped partway, the plan stays at Leviticus 2' }).click();
  await expect(sheet(page)).toHaveCount(0);
  state = await readState(page);
  expect(state.session).toBeUndefined();
  expect(state.done).toHaveLength(91);
  await shot(page, 'reading-plan-return-stopped');
});

test('Pick it myself opens the chapter picker, and the chapter she chooses is the one she stopped in', async ({ page }) => {
  await listeningSince(page);
  await awayAndBack(page, TWO_CHAPTERS + 5_000);
  await sheet(page).getByRole('button', { name: 'Pick it myself' }).click();

  const picker = page.getByRole('dialog', { name: 'Which chapter did you stop in?' });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Preface', exact: true })).toHaveCount(0);
  await expect(picker.locator('[data-in-logos]')).toHaveCount(0);
  await shot(page, 'reading-plan-return-pick');

  // Done puts the picker away and the sheet is still there, the session still open
  await picker.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(sheet(page)).toBeVisible();
  expect((await readState(page)).session).toBeDefined();

  await sheet(page).getByRole('button', { name: 'Pick it myself' }).click();
  await picker.getByRole('button', { name: /^Numbers/ }).click();
  await picker.getByRole('button', { name: 'Chapter 2', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(sheet(page)).toHaveCount(0);
  // the Reader is still on Romans 8: choosing opened no chapter
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const state = await readState(page);
  expect(state.session).toBeUndefined();
  expect(state.done).toContain('num.1');
  expect(state.done).toContain('lev.27');
  expect(state.done).not.toContain('num.2');
});

test('Not now leaves the session open and the next return asks again; a reload with the session open asks at once', async ({ page }) => {
  await listeningSince(page);
  await awayAndBack(page, TWO_CHAPTERS + 5_000);
  await sheet(page).getByRole('button', { name: 'Not now' }).click();
  await expect(sheet(page)).toHaveCount(0);
  expect((await readState(page)).session).toBeDefined();

  await awayAndBack(page, TWO_CHAPTERS * 2);
  await expect(sheet(page)).toBeVisible();

  await page.reload();
  await expect(sheet(page)).toBeVisible();
});
