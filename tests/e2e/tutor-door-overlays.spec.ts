// tests/e2e/tutor-door-overlays.spec.ts — the floating ? over the z-40 overlays outside the Reader (mw-5r3p30.955, found by the sweep of mw-5r3p30.953; the sibling of tutor-door.spec.ts's OVERLAYS, with the
// same shape). The Talk sheet is z-10, so over a full-screen layer at z-40 a tap on the ? opened the tutor UNDER the layer and, to him, did nothing. Each overlay chooses: a screen he works in keeps the door
// and a Talk opens in FRONT of it (door 'talk'), a picker or a card with nothing to ask about draws no ? (door 'hidden') and the ? is back, with a Talk in front, when it is closed.
// A new overlay is one more row here, and one hook in the overlay (src/tutor/door.ts: useNoDoor, useDoorTarget, or DialogAskTutor); tests/unit/door-guard.test.ts fails on an overlay that chose neither.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openCheck, openHebrewGuide, openLetterDrill, openTryIt, openWriteIt } from './large-text-titles';
import { TALK_SHEET } from './open-tutor';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';
import { openReviewFromToday, waitForDue } from './today-chip';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT, hasTouch: true });

const FLOATING = 'Ask the tutor about what is on screen';
const floating = (page: Page) => page.getByRole('button', { name: FLOATING, exact: true });

/** One z-40 overlay. `door`: what the ? does over it, 'hidden' (not drawn) or 'talk' (a tutor Talk sheet opens in front of it). `close` leaves it for the screen it opened from. */
interface Overlay {
  name: string;
  door: 'hidden' | 'talk';
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

/** The Talk sheet is open and in front: what is at its centre is inside it, not under another layer. */
async function expectTalkInFront(page: Page): Promise<Locator> {
  const talk = page.getByRole('dialog', { name: TALK_SHEET });
  await expect(talk).toBeVisible();
  const centre = (await talk.boundingBox())!;
  expect(await talk.evaluate((el, { x, y }) => el.contains(document.elementFromPoint(x, y)), { x: centre.x + centre.width / 2, y: centre.y + centre.height / 2 })).toBe(true);
  return talk;
}

for (const overlay of OVERLAYS) {
  test(`Floating ?: over ${overlay.name} it is ${overlay.door === 'hidden' ? 'not drawn (back once it is closed)' : 'a door that opens a Talk in front'} (mw-5r3p30.955)`, async ({ page }) => {
    const fake = makeFakePostern();
    await routePostern(page, fake);
    const sheet = await overlay.open(page);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
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
    await expect(floating(page)).toBeVisible();
    await floating(page).click();
    await expectTalkInFront(page);
  });
}
