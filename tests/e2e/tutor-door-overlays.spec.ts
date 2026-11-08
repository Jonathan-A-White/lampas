// tests/e2e/tutor-door-overlays.spec.ts — the floating ? over the z-40 overlays outside the Reader (mw-5r3p30.955, found by the sweep of mw-5r3p30.953) and the z-30, z-10 and z-50 layers (mw-5r3p30.956); the sibling of tutor-door.spec.ts's OVERLAYS, with the
// same shape). The Talk sheet is z-10, so over a full-screen layer at z-40 a tap on the ? opened the tutor UNDER the layer and, to him, did nothing. Each overlay chooses: a screen he works in keeps the door
// and a Talk opens in FRONT of it (door 'talk'), a picker or a card with nothing to ask about draws no ? (door 'hidden') and the ? is back, with a Talk in front, when it is closed.
// A new overlay is one more row here, and one hook in the overlay (src/tutor/door.ts: useNoDoor, useDoorTarget, or DialogAskTutor); tests/unit/door-guard.test.ts fails on an overlay that chose neither.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import {
  openAllLexicons,
  openAppMissing,
  openAskApproachFromSettings,
  openAskForBook,
  openConversationAlert,
  openDropConfirm,
  openEnglishWord,
  openInLogosChooser,
  openMapsFrame,
  openPlacePicker,
  openReadingDrill,
  openRemoveDevice,
  openReturnSheet,
  openScreenshotRead,
  openSendOff,
  openShareScreen,
  openStartPlan,
} from './door-layers';
import { openCheck, openHebrewGuide, openLetterDrill, openTryIt, openWriteIt } from './large-text-titles';
import { TALK_SHEET, twoFingers } from './open-tutor';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';
import { openReviewFromToday, waitForDue } from './today-chip';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT, hasTouch: true });

const FLOATING = 'Ask the tutor about what is on screen';
const floating = (page: Page) => page.getByRole('button', { name: FLOATING, exact: true });

/** One overlay. `door`: what the ? does over it, 'hidden' (not drawn, and back once it is closed), 'talk' (a tutor Talk sheet opens in front of it) or 'none' (the screen under it has nothing to ask about, so the ? is
 * not drawn before, over or after it: the Licence page and the Share to Lampas sheet). `close` leaves it for the screen it opened from. */
interface Overlay {
  name: string;
  door: 'hidden' | 'talk' | 'none';
  open: (page: Page) => Promise<Locator>;
  close: (page: Page, sheet: Locator) => Promise<void>;
}

const stop = async (_page: Page, sheet: Locator) => void (await sheet.getByRole('button', { name: 'Stop', exact: true }).click());
const done = async (_page: Page, sheet: Locator) => void (await sheet.getByRole('button', { name: 'Done', exact: true }).click());

/** Review, answered until a card has the reference line, and that line tapped: the card of the verse stands over Review (the Review route has the screen's own door target). */
async function openReferenceCard(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=greek&weave=solid');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await waitForDue(page);
  await openReviewFromToday(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('prompt')).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    const show = page.getByRole('button', { name: 'Show', exact: true });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: /^(I knew it|Kind of)$/ }).click();
    } else {
      await page.locator('[data-option]').first().click();
      if (await page.getByTestId('chapter-form').isVisible()) break;
    }
    await page.getByTestId('next').click();
  }
  await page.getByTestId('chapter-form').getByRole('link').click();
  const card = page.locator('[data-reference-card]');
  await expect(card).toBeVisible();
  return card;
}

const OVERLAYS: Overlay[] = [
  { name: 'the letter drill', door: 'talk', open: openLetterDrill, close: stop },
  { name: 'Write it', door: 'hidden', open: openWriteIt, close: done },
  { name: 'Check on a passage lesson', door: 'talk', open: openCheck, close: stop },
  { name: 'Try it on a verse', door: 'talk', open: openTryIt, close: stop },
  {
    name: 'the language sheet of Memorize',
    door: 'hidden',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      const view = await openVerseView(page, 28);
      await view.getByRole('button', { name: 'Memorize', exact: true }).click();
      await view.getByRole('button', { name: 'Memorizing · English' }).click();
      const sheet = page.getByRole('dialog', { name: 'Memorize Rom 8:28' });
      await expect(sheet).toBeVisible();
      return sheet;
    },
    close: done,
  },
  { name: 'the card of a verse reference', door: 'hidden', open: openReferenceCard, close: (_page, card) => card.getByRole('button', { name: 'Close', exact: true }).click() },
  {
    // the guide stands over the Talk sheet it was opened from, where the ? is already put away; closed, the Talk is still open and the ? comes back with it
    name: 'the Hebrew guide',
    door: 'hidden',
    open: openHebrewGuide,
    close: async (page, guide) => {
      await done(page, guide);
      await page.getByRole('dialog', { name: TALK_SHEET }).getByRole('button', { name: 'Done', exact: true }).click();
    },
  },
];

const escape = async (page: Page) => void (await page.keyboard.press('Escape'));
const button = (name: string) => async (_page: Page, sheet: Locator) => void (await sheet.getByRole('button', { name, exact: true }).click());

// The z-30, z-10 and z-50 layers (mw-5r3p30.956): the Talk sheet is z-10 and a route's Talk is drawn after its screen, so a z-10 layer of a route's screen is already under the Talk; a z-30 or z-50 layer is not.
OVERLAYS.push(
  { name: 'the reading drill', door: 'talk', open: openReadingDrill, close: escape },
  { name: 'Ask for a book', door: 'hidden', open: openAskForBook, close: button('Done') },
  { name: 'the send-off to Audible', door: 'hidden', open: openSendOff, close: escape },
  { name: 'Start a listening plan', door: 'hidden', open: openStartPlan, close: button('Not now') },
  { name: 'Where are you in the plan?', door: 'hidden', open: (page) => openPlacePicker(page, 'where'), close: button('Not now') },
  {
    // the picker stands over Where are you in the plan?: the ? is back once both are closed
    name: 'Pick a place',
    door: 'hidden',
    open: (page) => openPlacePicker(page, 'pick'),
    close: async (page, picker) => {
      await escape(page);
      await expect(picker).toHaveCount(0);
      await escape(page);
    },
  },
  { name: 'Where did you get to?', door: 'hidden', open: openReturnSheet, close: button('Not now') },
  {
    // the screenshot sheet stands over the return sheet: the ? is back once both are closed
    name: 'Your screenshot',
    door: 'hidden',
    open: openScreenshotRead,
    close: async (page) => {
      await escape(page);
      await expect(page.getByRole('dialog', { name: 'Your screenshot', exact: true })).toHaveCount(0);
      await escape(page);
    },
  },
  { name: 'All lexicons', door: 'hidden', open: openAllLexicons, close: button('Done') },
  { name: 'App not on this phone', door: 'hidden', open: openAppMissing, close: button('Done') },
  { name: 'the Logos chooser (In another book…)', door: 'hidden', open: openInLogosChooser, close: escape },
  { name: 'a map of the Maps sheet', door: 'hidden', open: openMapsFrame, close: escape },
  { name: 'Ask for another approach', door: 'talk', open: openAskApproachFromSettings, close: button('Done') },
  { name: 'the alert of a conversation that cannot be opened', door: 'talk', open: openConversationAlert, close: button('Close') },
  { name: 'Drop this word?', door: 'talk', open: openDropConfirm, close: button('Keep') },
  { name: 'Share to Lampas', door: 'hidden', open: openShareScreen, close: escape },
  { name: 'Remove a device (the Licence page)', door: 'none', open: openRemoveDevice, close: button('Keep') },
);

/** The Talk sheet is open and in front: what is at its centre is inside it, not under another layer. */
async function expectTalkInFront(page: Page): Promise<Locator> {
  const talk = page.getByRole('dialog', { name: TALK_SHEET });
  await expect(talk).toBeVisible();
  const centre = (await talk.boundingBox())!;
  expect(await talk.evaluate((el, { x, y }) => el.contains(document.elementFromPoint(x, y)), { x: centre.x + centre.width / 2, y: centre.y + centre.height / 2 })).toBe(true);
  return talk;
}

for (const overlay of OVERLAYS) {
  const says = { hidden: 'not drawn (back once it is closed)', talk: 'a door that opens a Talk in front', none: 'not drawn (the screen under it has no door)' }[overlay.door];
  test(`Floating ?: over ${overlay.name} it is ${says} (mw-5r3p30.955, .956)`, async ({ page }) => {
    const fake = makeFakePostern();
    // the mill reads a screenshot of Audible's player at once
    fake.kindReplies['audible-position'] = { status: 'answered', answer: { book: 'Lev', chapter: 3, position: '2:41', left: '-3:05', confidence: 'high' } };
    await routePostern(page, fake);
    const sheet = await overlay.open(page);
    // the animations that end (the Reading dot of a screenshot pulses for ever)
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)));
    await shot(page, `tutor-door-overlay-${overlay.name.replace(/\W+/g, '-').toLowerCase()}`);
    if (overlay.door === 'talk') {
      await expect(floating(page)).toBeVisible();
      await floating(page).click();
      const talk = await expectTalkInFront(page);
      // the Talk is the layer on top: closing it leaves the overlay and the ? as they were
      await talk.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(talk).toHaveCount(0);
      await expect(sheet).toBeVisible();
      await expect(floating(page)).toBeVisible();
    } else {
      await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
    }
    await overlay.close(page, sheet);
    await expect(sheet).toHaveCount(0);
    if (overlay.door === 'none') {
      await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
      return;
    }
    await expect(floating(page)).toBeVisible();
    await floating(page).click();
    await expectTalkInFront(page);
  });
}

// The English word sheets have the ? (mw-5r3p30.1121; his words, Postern general 2026-11-06: he tapped "Aggai" in Genesis 13 in the Weave and the sheet had only a Logos link, no ?). The sheet is z-35 over the Talk (z-10), so
// the ? closes the sheet and opens the Talk in front, about the word as tapped. A two-finger tap on the sheet puts the ? away and the next brings it back (src/tutor/doorTap.ts).
const askedWord = (fake: ReturnType<typeof makeFakePostern>) => {
  const talks = fake.received.filter((g) => g.grist.kind === 'bible-talk');
  return (talks[talks.length - 1]?.input as { question?: string } | undefined)?.question ?? '';
};

test('Floating ?: over the English word sheet (Just English) it asks the tutor about the word he tapped, with the Talk in front (mw-5r3p30.1121)', async ({ page }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  const sheet = await openEnglishWord(page);
  await expect(floating(page)).toBeVisible();
  await shot(page, 'english-word-door-sheet');
  await floating(page).click();
  await expect(sheet).toHaveCount(0);
  await expectTalkInFront(page);
  await expect.poll(() => askedWord(fake)).toContain('“we love”');
  expect(askedWord(fake)).toContain('2 John 1:5');
  await shot(page, 'english-word-door-talk');
});

test('Floating ?: over the word sheet of an English word in the Weave it asks about the word as tapped, in its verse (Genesis 13:3, mw-5r3p30.1121)', async ({ page }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=13&weave=solid');
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'Ai', exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  await expect(floating(page)).toBeVisible();
  await floating(page).click();
  await expect(sheet).toHaveCount(0);
  await expectTalkInFront(page);
  await expect.poll(() => askedWord(fake)).toContain('“Ai”');
  expect(askedWord(fake)).toContain('Genesis 13:3');
  expect(askedWord(fake)).toContain('English side');
});

test('Floating ?: a two-finger tap on an open word sheet puts the ? away and a second brings it back (mw-5r3p30.1121, .1006)', async ({ page }) => {
  await routePostern(page, makeFakePostern());
  const sheet = await openEnglishWord(page);
  await expect(floating(page)).toBeVisible();
  await twoFingers(page);
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
  await expect(sheet).toBeVisible();
  await twoFingers(page);
  await expect(floating(page)).toBeVisible();
  await expect(sheet).toBeVisible();
});

test('Floating ?: over the sheet of "Aggai" in the Septuagint\'s Genesis 13 Weave the lexicons found nothing, and the tutor is told so (mw-5r3p30.1121)', async ({ page }) => {
  // public/data-lxx ships no chapter in the gate: Genesis 13 is the fixture of Genesis 1 renumbered, with verse 3 a proper name (Swete's ΑΓΓΑΙ) that the lexicon has no entry for
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${path === 'gen/13.json' ? 'gen/1.json' : path}`, 'utf8');
    if (path === 'index.json') {
      const index = JSON.parse(body) as { books: { code: string; chapters: number; verses: number[]; fingerprints: string[]; lampasChapters: number[][] }[] };
      const gen = index.books.find((b) => b.code === 'gen')!;
      gen.chapters = 13;
      gen.verses = Array.from({ length: 13 }, () => 31);
      gen.fingerprints = Array.from({ length: 13 }, () => gen.fingerprints[0]);
      gen.lampasChapters = Array.from({ length: 13 }, (_, i) => [i + 1]);
      body = JSON.stringify(index);
    } else if (path === 'gen/13.json') {
      const chapter = JSON.parse(body) as { chapter: number; verses: { n: number; g: Record<string, unknown>[]; e: { t: string; g: number[]; c: number; y: string }[] }[] };
      chapter.chapter = 13;
      const verse = chapter.verses.find((v) => v.n === 3)!;
      verse.g = [{ t: 'ΑΓΓΑΙ', tr: 'Angai', s: '', l: 'Αγγαι', p: 'N-NSM', y: '1', c: 0.5, e: 0 }];
      verse.e = [{ t: 'Aggai', g: [0], c: 0.8, y: 'align' }];
      body = JSON.stringify(chapter);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=gen&c=13&weave=solid');
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'Aggai', exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  await expect(floating(page)).toBeVisible();
  await floating(page).click();
  await expect(sheet).toHaveCount(0);
  await expectTalkInFront(page);
  await expect.poll(() => askedWord(fake)).toContain('“Aggai”');
  expect(askedWord(fake)).toContain('Genesis 13:3');
  expect(askedWord(fake)).toContain('found no entry for it');
});
