// tests/e2e/tutor-door.spec.ts — the tutor door at 390x844 (mw-5r3p30.880, part B of mw-5r3p30.843; mw-5r3p30.882, part C2): the floating ? at the Hand side on every screen and over sheets, the one door,
// and no door at all without a licence. A two-finger tap opens no tutor (tests/e2e/tutor-door-absent.spec.ts); the older buttons are gone.
import { expect, test, type Page } from '@playwright/test';
import { GRAMMAR_HELP_ANSWER, makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { leaveSettings, openGroup } from './settings-group';
import { shot } from './shot';
import { twoFingers } from './open-tutor';
import { keepHand } from './tutor-door';
import { openUnlicensed, openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT, hasTouch: true });

const FLOATING = 'Ask the tutor about what is on screen';
const floating = (page: Page) => page.getByRole('button', { name: FLOATING, exact: true });

async function openReader(page: Page, how: 'licensed' | 'unlicensed' = 'licensed') {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  if (how === 'licensed') await openUnlocked(page);
  else await openUnlicensed(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
}

/** A click within 600 ms of a two-finger tap is dropped (src/tutor/door.ts CLICK_GUARD_MS: the click a phone may send after the tap); a spec waits it out before it taps a button. */
const afterTap = (page: Page) => page.waitForTimeout(700);

const box = async (page: Page) => (await floating(page).boundingBox())!;

test('Floating ?: one button at the Hand side on the Reader, left on the left and right on the right', async ({ page }) => {
  await openReader(page);
  await keepHand(page, 'right');
  await expect(floating(page)).toBeVisible();
  const right = await box(page);
  expect(right.width).toBeGreaterThanOrEqual(43.5);
  expect(right.height).toBeGreaterThanOrEqual(43.5);
  expect(right.x + right.width).toBeGreaterThan(VIEWPORT.width / 2);
  expect(VIEWPORT.width - (right.x + right.width)).toBeLessThanOrEqual(16);
  await shot(page, 'tutor-door-floating-right');

  await keepHand(page, 'left');
  await expect(floating(page)).toBeVisible();
  const left = await box(page);
  expect(left.x).toBeLessThanOrEqual(16);
  expect(left.x + left.width).toBeLessThan(VIEWPORT.width / 2);
  await shot(page, 'tutor-door-floating-left');
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(1);
});

test('Floating ?: also on a screen that is not the Reader', async ({ page }) => {
  await openReader(page);
  await keepHand(page, 'left');
  await page.goto('/#/paradigms');
  await expect(page.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 })).toBeVisible();
  await expect(floating(page)).toBeVisible();
  expect((await box(page)).x).toBeLessThanOrEqual(16);
  await floating(page).click();
  await expect(page.getByRole('dialog', { name: /^Ask the tutor: / })).toBeVisible();
  // the Talk sheet has the foot to itself: the floating button is put away while it is open
  await expect(floating(page)).toHaveCount(0);
});

test('Floating ?: over the Verse view and over a word sheet, and a tap on a sheet asks about its word', async ({ page }) => {
  await openReader(page);
  await keepHand(page, 'right');
  await openVerseView(page, 28);
  await expect(floating(page)).toBeVisible();
  // it stands over the sheet: what is at its centre is the button itself
  const over = async () => {
    const b = await box(page);
    return page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-floating-tutor]') !== null, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
  };
  expect(await over()).toBe(true);
  await shot(page, 'tutor-door-floating-verse-view');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();

  await page.goto('/');
  await expect(page.locator('[data-verse="28"]')).toBeVisible();
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await expect(floating(page)).toBeVisible();
  expect(await over()).toBe(true);
  await shot(page, 'tutor-door-floating-word-sheet');
  await floating(page).click();
  // the sheet's word, as its own Ask the tutor asks
  const talk = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(talk).toBeVisible();
  await expect(talk.locator('[data-turn]')).toContainText(GRAMMAR_HELP_ANSWER.answer);
});

test('A two-finger tap opens nothing tutor-ish: it goes into immersive reading, where the ? is not drawn, and out again', async ({ page }) => {
  await openReader(page);
  await expect(floating(page)).toBeVisible();
  await twoFingers(page);
  await afterTap(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
  await twoFingers(page);
  await afterTap(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(floating(page)).toBeVisible();
});

test('With no licence there is no tutor door: no ?, a two-finger tap opens no tutor, and Settings hides the Hand row', async ({ page }) => {
  await openReader(page, 'unlicensed');
  await keepHand(page, 'left');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /ask the tutor/i })).toHaveCount(0);
  await twoFingers(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
  await twoFingers(page, { x: 100, y: 700 });
  await expect(page.getByRole('dialog', { name: /^Talk about |^Ask the tutor: / })).toHaveCount(0);
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('button', { name: 'Done', exact: true }).click();

  await page.goto('/#/settings');
  await openGroup(page, 'Reading');
  await expect(page.getByRole('group', { name: 'Hand', exact: true })).toHaveCount(0);
  await shot(page, 'tutor-door-unlicensed');
  await leaveSettings(page);
});
