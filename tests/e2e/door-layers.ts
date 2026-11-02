// tests/e2e/door-layers.ts — the ways into the z-30, z-10 and z-50 layers outside the Reader's own sheets, for the rows of tests/e2e/tutor-door-overlays.spec.ts (mw-5r3p30.956, the second half of mw-5r3p30.955). Each opens
// the layer on the built app and returns its dialog; the spec asks what the floating ? does over it.
import { expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { OT_BOOKS } from '../../src/data/books';
import { planOf, type PlanChapter } from '../../src/data/plans';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { SITE_ISSUER, openLicencePage, stubBackend } from './devices-page';
import { openLongLibrary } from './long-library';
import { openToday } from './today-chip';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const dialog = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name, exact: typeof name === 'string' });

/** Puts rows in the app's own settings store through raw IndexedDB, as the app wrote them. */
async function putSettings(page: Page, rows: { key: string; value: string }[]): Promise<void> {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          for (const row of list) tx.objectStore('settings').put(row);
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

/** Rows put in the talks table, as the Talk sheet leaves them. */
async function keepTalks(page: Page, rows: { ref: string; q: string; a: string }[]): Promise<void> {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('talks', 'readwrite');
          const now = Date.now();
          list.forEach((row, i) => tx.objectStore('talks').add({ ...row, words: [], when: now - (i + 1) * 3_600_000 }));
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

/** The Reader on a phone with the listening plan on and `next` its next chapter, then Today. */
async function planOn(page: Page, next: PlanChapter | null, session?: { code: string; chapter: number; startedAt: number }): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const chapters = planOf('whole-bible')?.chapters() ?? [];
  const done = next ? chapters.slice(0, chapters.findIndex((c) => c.code === next.code && c.chapter === next.chapter)).map((c) => `${c.code}.${c.chapter}`) : [];
  await putSettings(
    page,
    next
      ? [
          { key: 'audioBible', value: 'word-of-promise' },
          { key: 'readingPlan', value: 'on' },
          { key: 'readingPlanState', value: JSON.stringify({ planId: 'whole-bible', start: next, done, ...(session ? { session } : {}) }) },
        ]
      : [],
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
}

export async function openAskForBook(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/#/library');
  await page.getByRole('button', { name: 'Ask for a book' }).click();
  const sheet = dialog(page, 'Ask for a book');
  await expect(sheet).toBeVisible();
  return sheet;
}

export async function openSendOff(page: Page): Promise<Locator> {
  await planOn(page, { code: 'luk', chapter: 15 });
  await openToday(page);
  await page.getByRole('region', { name: 'Reading plan', exact: true }).getByRole('link', { name: /^Listen in Audible/ }).click();
  const sheet = dialog(page, 'Off to Audible: Luke 15');
  await expect(sheet).toBeVisible();
  return sheet;
}

export async function openStartPlan(page: Page): Promise<Locator> {
  await planOn(page, null);
  await openToday(page);
  await page.getByRole('region', { name: 'Reading plan', exact: true }).getByRole('button', { name: 'Start a plan' }).click();
  const sheet = dialog(page, 'Start a listening plan');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Where are you in the plan? (Today's place button), and from it Pick a place: `step` 'where' is the first sheet, 'pick' the chapter picker over it. */
export async function openPlacePicker(page: Page, step: 'where' | 'pick'): Promise<Locator> {
  await planOn(page, { code: 'luk', chapter: 15 });
  await openToday(page);
  await page.getByRole('region', { name: 'Reading plan', exact: true }).getByTestId('plan-place').click();
  const where = dialog(page, 'Where are you in the plan?');
  await expect(where).toBeVisible();
  if (step === 'where') return where;
  await where.getByRole('button', { name: 'Pick a place' }).click();
  const picker = dialog(page, 'Pick a place');
  await expect(picker).toBeVisible();
  return picker;
}

const STARTS = (JSON.parse(readFileSync('src/resources/audibleStarts.json', 'utf8')) as { chapters: Record<string, number> }).chapters;
const TWO_CHAPTERS = STARTS['lev.3'] - STARTS['lev.1'];
const SCREENSHOT = readFileSync('grinds/examples/audible-position/leviticus-3.jpg');
const BEFORE_LEVITICUS = OT_BOOKS.slice(0, 2).flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `${b.code}.${i + 1}`));

/** Back from two chapters of listening in Audible: the Where did you get to? sheet is open over the Reader. */
export async function openReturnSheet(page: Page): Promise<Locator> {
  const setOff = Date.now();
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSettings(page, [
    { key: 'readingPlan', value: 'on' },
    { key: 'audioBible', value: 'word-of-promise' },
    { key: 'readingPlanState', value: JSON.stringify({ planId: 'whole-bible', start: { code: 'lev', chapter: 1 }, done: BEFORE_LEVITICUS, session: { code: 'lev', chapter: 1, startedAt: setOff } }) },
  ]);
  const setVisibility = (state: 'hidden' | 'visible') =>
    page.evaluate((s) => {
      Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
      Object.defineProperty(document, 'hidden', { value: s === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  await setVisibility('hidden');
  await page.clock.setFixedTime(setOff + TWO_CHAPTERS + 5_000);
  await setVisibility('visible');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const sheet = dialog(page, 'Where did you get to?');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** The return sheet's Send a screenshot: the mill answers the picture, and Your screenshot is open over the return sheet. */
export async function openScreenshotRead(page: Page): Promise<Locator> {
  const sheet = await openReturnSheet(page);
  await sheet.getByLabel('Screenshot file').setInputFiles({ name: 'Screenshot_20261016.jpg', mimeType: 'image/jpeg', buffer: SCREENSHOT });
  const read = dialog(page, 'Your screenshot');
  await expect(read).toBeVisible();
  return read;
}

export async function openAllLexicons(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await openLongLibrary(page);
  await page.goto('/#/?c=8&view=greek');
  await page.locator('[data-verse="1"] [data-word="1"]').click();
  const word = dialog(page, 'Word');
  await expect(word).toBeVisible();
  await word.getByRole('button', { name: /^All \d+ lexicons ›$/ }).click();
  const sheet = dialog(page, 'All lexicons');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** The chooser behind the Verse view's 'In another book…', with the long library on. */
export async function openInLogosChooser(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await openLongLibrary(page);
  // the door is drawn while a Greek text, an interlinear or a commentary that covers the book is On
  await page.goto('/#/library?kind=greek-text');
  await page.getByRole('button', { name: 'All on', exact: true }).click();
  await expect(page.getByTestId('kind-status')).not.toHaveText('none on');
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const view = await openVerseView(page, 31);
  await view.getByRole('button', { name: 'In another book…', exact: true }).click();
  const sheet = dialog(page, 'Romans 8:31 in Logos');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** The Maps sheet of Genesis 10:19 and the map opened from it (the Maps frame, a picture of Playwright's own). */
export async function openMapsFrame(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.route(/^https:\/\/biblemapper\.com\//, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#e8dcc0"/></svg>' }),
  );
  await page.goto('/#/?b=gen&c=10');
  await expect(page.locator('[data-verse="19"]')).toBeVisible();
  const view = await openVerseView(page, 19);
  await view.getByRole('button', { name: 'Maps · 6', exact: true }).click();
  const sheet = dialog(page, 'Maps for Genesis 10:19');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** An ου word to fix, so each reading adds a miss of the sound to the tally (tests/e2e/reading-drill.spec.ts). */
const OU_WORD_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' }],
  note: 'Nearly there: one word to say again.',
};

/** Two misses of ου offer Drill this sound; the drill is open on its first card. The spec's page runs on a page clock (holdFor). */
export async function openReadingDrill(page: Page): Promise<Locator> {
  await page.clock.install();
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: OU_WORD_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await openVerseView(page, 28);
  await page.getByRole('region', { name: 'Verse view' }).getByRole('button', { name: 'Read it aloud', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Reading check' });
  const bar = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });
  await holdFor(page, bar, 2800);
  await expect(panel).toContainText('Words to fix');
  await holdFor(page, bar, 2800);
  await panel.getByRole('button', { name: 'Drill this sound', exact: true }).click();
  const drill = dialog(page, 'Reading drill');
  await expect(drill).toBeVisible();
  return drill;
}

export async function openAskApproachFromSettings(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/#/settings?group=greek');
  const open = page.getByRole('button', { name: 'Ask for another approach' });
  await open.scrollIntoViewIfNeeded();
  await open.click();
  const sheet = dialog(page, 'Ask for another approach');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Conversations with a kept talk whose verse the chapter lacks: opening it cannot be done, and the alert stands over the list. */
export async function openConversationAlert(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/#/conversations');
  await expect(page.getByRole('heading', { name: 'Conversations', level: 1 })).toBeVisible();
  await keepTalks(page, [{ ref: 'rom.8.999', q: 'What is this verse?', a: 'There is no such verse.' }]);
  await page.reload();
  await page.getByRole('button', { name: /What is this verse\?/ }).click();
  const alert = page.getByRole('alert').filter({ hasText: 'Try again' });
  await expect(alert).toBeVisible();
  return alert;
}

export async function openDropConfirm(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/#/words');
  await expect(page.getByTestId('word-counts')).toBeVisible();
  const confirm = page.getByRole('alertdialog');
  for (let i = 0; i < 4 && !(await confirm.isVisible()); i += 1) await page.getByRole('main').locator('[data-lemma]').first().click();
  await expect(confirm).toBeVisible();
  return confirm;
}

/** The Share to Lampas sheet on words shared in (a route of its own, with no Talk of its own). */
export async function openShareScreen(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('shares', 'readwrite');
          tx.objectStore('shares').add({ id: 'wide', createdAt: Date.now(), text: 'Paul writes in Rom 8:28-30', files: [] });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.goto('/#/share?s=wide');
  const sheet = dialog(page, 'Share to Lampas');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** The remove-a-device confirm on the Licence page of a site-licensed phone. */
export async function openRemoveDevice(page: Page): Promise<Locator> {
  await stubBackend(page);
  await openLicencePage(page, SITE_ISSUER);
  await page.getByRole('region', { name: 'My devices' }).getByRole('button', { name: 'Remove Old tablet' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  return confirm;
}
