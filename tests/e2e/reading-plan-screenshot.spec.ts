// tests/e2e/reading-plan-screenshot.spec.ts — 'Send a screenshot' on the return sheet (mw-umv8sp.4), at 390x844. The session is planted in the phone's database and
// the return is the page's own visibilitychange and focus, as in reading-plan-return.spec.ts; the picture is the grind's own example screenshot, sent through the app's
// real shrinking, signing and sealing to a fake Postern (tests/support/playwright-postern.ts) whose mill answers as the test says.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { OT_BOOKS } from '../../src/data/books';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlicensed, openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const STARTS = (JSON.parse(readFileSync('src/resources/audibleStarts.json', 'utf8')) as { chapters: Record<string, number> }).chapters;
const TWO_CHAPTERS = STARTS['lev.3'] - STARTS['lev.1'];
// The session's start is the real clock now, never a date written in the spec: openUnlocked remembers the licence as held a minute before the real now, and
// src/services/licenceCache.ts counts a licence held in the future as not held, so a page clock set before that (a fixed date that has gone by) made the next
// licence check say 'Needs a licence' and the grist 'No licence' (mw-5r3p30.575).
const SET_OFF = Date.now();
const BEFORE_LEVITICUS = OT_BOOKS.slice(0, 2).flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `${b.code}.${i + 1}`));
const SCREENSHOT = readFileSync('grinds/examples/audible-position/leviticus-3.jpg');

interface PlanState {
  planId: string;
  start: { code: string; chapter: number };
  done: string[];
  session?: { code: string; chapter: number; startedAt: number };
}

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

/** The plan started at Leviticus 1 with a session opened there, then back from two chapters of listening: the return sheet is open. */
async function backFromAudible(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const state: PlanState = { planId: 'whole-bible', start: { code: 'lev', chapter: 1 }, done: BEFORE_LEVITICUS, session: { code: 'lev', chapter: 1, startedAt: SET_OFF } };
  await putSettings(page, [
    { key: 'readingPlan', value: 'on' },
    { key: 'audioBible', value: 'word-of-promise' },
    { key: 'readingPlanState', value: JSON.stringify(state) },
  ]);
  const setVisibility = (s: 'hidden' | 'visible') =>
    page.evaluate((v) => {
      Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
      Object.defineProperty(document, 'hidden', { value: v === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, s);
  await setVisibility('hidden');
  await page.clock.setFixedTime(SET_OFF + TWO_CHAPTERS + 5_000);
  await setVisibility('visible');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(returnSheet(page)).toBeVisible();
}

const returnSheet = (page: Page) => page.getByRole('dialog', { name: 'Where did you get to?' });
const readSheet = (page: Page) => page.getByRole('dialog', { name: 'Your screenshot' });

/** Every button of `dialog` at least 44 px tall and inside the phone's width, and the sheet wholly on the screen. */
async function fitsThePhone(page: Page, dialog: ReturnType<Page['getByRole']>): Promise<void> {
  await page.waitForTimeout(400); // the slide-up has ended
  for (const box of await dialog.getByRole('button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
    expect(box.height).toBeGreaterThanOrEqual(43.5);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
  }
  const frame = await dialog.boundingBox();
  expect(frame!.y).toBeGreaterThanOrEqual(0);
  expect(frame!.y + frame!.height).toBeLessThanOrEqual(844 + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

/** Waits for the sheets' slide-in to end (the Reading dot pulses for ever, so only the animations that end are waited for). */
const finishedSliding = (page: Page): Promise<unknown> =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );

test('with a licence: Send a screenshot reads Leviticus 3 from Audible, with time left, and Yes keeps Leviticus 3 next', async ({ page }) => {
  const fake: FakePostern = makeFakePostern();
  // the mill has its answer at once, and the phone's send is held until the test lets it go: the sheet shows 'Reading' meanwhile (an answer made later is not
  // read under the page's fixed clock)
  fake.kindReplies['audible-position'] = { status: 'answered', answer: { book: 'Lev', chapter: 3, position: '2:41', left: '-3:05', confidence: 'high' } };
  let release = (): void => undefined;
  fake.holds['audible-position'] = new Promise<void>((resolve) => {
    release = resolve;
  });
  await routePostern(page, fake);
  await openUnlocked(page);
  await backFromAudible(page);

  const row = returnSheet(page).getByRole('button', { name: /^Send a screenshot/ });
  await expect(row).toBeVisible();
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  await expect(returnSheet(page).getByText('Needs a licence')).toHaveCount(0);
  await fitsThePhone(page, returnSheet(page));
  await shot(page, 'reading-plan-screenshot-offer');

  await returnSheet(page).getByLabel('Screenshot file').setInputFiles({ name: 'Screenshot_20261016.jpg', mimeType: 'image/jpeg', buffer: SCREENSHOT });
  await expect(readSheet(page).getByText('Reading your screenshot...')).toBeVisible();
  await expect.poll(() => fake.received.length).toBe(1);
  expect(fake.received[0]!.grist.kind).toBe('audible-position');
  expect(fake.received[0]!.input).toEqual({ language: 'en', set_off_from: 'Leviticus 1' });
  expect(fake.received[0]!.attachments).toHaveLength(1);
  // the slide-in has ended before the sheet is measured: under load boundingBox would read it mid-animation
  await finishedSliding(page);
  const sheetBox = await readSheet(page).boundingBox();
  await shot(page, 'reading-plan-screenshot-reading');

  release();
  const yes = readSheet(page).getByRole('button', { name: 'Yes, that is where I am' });
  await expect(yes).toBeVisible();
  await expect(readSheet(page).getByTestId('screenshot-proposal')).toHaveText('Leviticus 3, 2:41 in');
  await expect(readSheet(page).getByText('I am sure of it.')).toBeVisible();
  await expect(readSheet(page).getByText('You stopped partway in it: the plan stays at Leviticus 3.')).toBeVisible();
  // the answer came in without moving the sheet: it is one height whatever it shows
  await finishedSliding(page);
  expect(await readSheet(page).boundingBox()).toEqual(sheetBox);
  await fitsThePhone(page, readSheet(page));
  await shot(page, 'reading-plan-screenshot-proposal');

  await yes.click();
  await expect(readSheet(page)).toHaveCount(0);
  await expect(returnSheet(page)).toHaveCount(0);
  const state = await readState(page);
  expect(state.session).toBeUndefined();
  // time left in Leviticus 3: he stopped in it, so Leviticus 1 and 2 are done and Leviticus 3 is next
  expect(state.done).toHaveLength(92);
  expect(state.done).toContain('lev.2');
  expect(state.done).not.toContain('lev.3');
});

test('with a licence: a screenshot at the end of Leviticus 3 is finished, and Yes marks it done', async ({ page }) => {
  const fake: FakePostern = makeFakePostern();
  fake.kindReplies['audible-position'] = { status: 'answered', answer: { book: 'Lev', chapter: 3, position: '9:30', left: '-0:00', confidence: 'high' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await backFromAudible(page);

  await returnSheet(page).getByLabel('Screenshot file').setInputFiles({ name: 'Screenshot_end.jpg', mimeType: 'image/jpeg', buffer: SCREENSHOT });
  await expect(readSheet(page).getByText('You heard it to the end: the plan moves on.')).toBeVisible();
  await readSheet(page).getByRole('button', { name: 'Yes, that is where I am' }).click();
  await expect(readSheet(page)).toHaveCount(0);
  const state = await readState(page);
  expect(state.session).toBeUndefined();
  expect(state.done).toHaveLength(93);
  expect(state.done).toContain('lev.3');
  expect(state.done).not.toContain('lev.4');
});

test('with a licence: Back to the choices leaves the return sheet open, and the phone Back closes only the top sheet', async ({ page }) => {
  const fake = makeFakePostern();
  fake.kindReplies['audible-position'] = { status: 'answered', answer: { book: null, chapter: null, position: null, confidence: 'low' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await backFromAudible(page);

  await returnSheet(page).getByLabel('Screenshot file').setInputFiles({ name: 'other.jpg', mimeType: 'image/jpeg', buffer: SCREENSHOT });
  await expect(readSheet(page).getByText('I could not find a chapter in that screenshot.')).toBeVisible();
  await expect(readSheet(page).getByRole('button', { name: 'Yes, that is where I am' })).toHaveCount(0);
  await shot(page, 'reading-plan-screenshot-none');
  await readSheet(page).getByRole('button', { name: 'Back to the choices' }).click();
  await expect(readSheet(page)).toHaveCount(0);
  await expect(returnSheet(page)).toBeVisible();

  await returnSheet(page).getByLabel('Screenshot file').setInputFiles({ name: 'again.jpg', mimeType: 'image/jpeg', buffer: SCREENSHOT });
  await expect(readSheet(page).getByText('I could not find a chapter in that screenshot.')).toBeVisible();
  await page.goBack();
  await expect(readSheet(page)).toHaveCount(0);
  await expect(returnSheet(page)).toBeVisible();
  expect((await readState(page)).session).toBeDefined();
});

test('with no licence: Send a screenshot says Needs a licence, opens the Licence page, and Back comes back to the sheet', async ({ page }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlicensed(page);
  await backFromAudible(page);

  const row = returnSheet(page).getByRole('button', { name: /^Send a screenshot/ });
  await expect(row).toContainText('Needs a licence');
  await expect(returnSheet(page).getByLabel('Screenshot file')).toHaveCount(0);
  await fitsThePhone(page, returnSheet(page));
  await shot(page, 'reading-plan-screenshot-no-licence');

  await row.click();
  await expect(page.getByRole('heading', { name: 'Licence', exact: true, level: 1 })).toBeVisible();
  await expect(returnSheet(page)).toHaveCount(0);
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(returnSheet(page)).toBeVisible();
  expect((await readState(page)).session).toBeDefined();
  expect(fake.received).toHaveLength(0);
});
