// tests/e2e/tutor-door.spec.ts — the tutor door at 390x844 (mw-5r3p30.880, part B of mw-5r3p30.843): the Floating ? at the Hand side on every screen and over sheets, the two-finger tap that opens the tutor
// from the chapter, a word sheet and a lesson sheet, and no door at all without a licence. The older buttons stay until part C2, so these specs name the new one by its own label.
import { expect, test, type Page } from '@playwright/test';
import { GRAMMAR_HELP_ANSWER, makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { leaveSettings, openGroup } from './settings-group';
import { shot } from './shot';
import { keepDoor, twoFingerTap } from './tutor-door';
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
  await keepDoor(page, 'floating', 'right');
  await expect(floating(page)).toBeVisible();
  const right = await box(page);
  expect(right.width).toBeGreaterThanOrEqual(43.5);
  expect(right.height).toBeGreaterThanOrEqual(43.5);
  expect(right.x + right.width).toBeGreaterThan(VIEWPORT.width / 2);
  expect(VIEWPORT.width - (right.x + right.width)).toBeLessThanOrEqual(16);
  await shot(page, 'tutor-door-floating-right');

  await keepDoor(page, 'floating', 'left');
  await expect(floating(page)).toBeVisible();
  const left = await box(page);
  expect(left.x).toBeLessThanOrEqual(16);
  expect(left.x + left.width).toBeLessThan(VIEWPORT.width / 2);
  await shot(page, 'tutor-door-floating-left');
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(1);
});

test('Floating ?: also on a screen that is not the Reader', async ({ page }) => {
  await openReader(page);
  await keepDoor(page, 'floating', 'left');
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
  await keepDoor(page, 'floating', 'right');
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

test('Floating ?: a two-finger tap opens nothing tutor-ish', async ({ page }) => {
  await openReader(page);
  await keepDoor(page, 'floating', 'right');
  await expect(floating(page)).toBeVisible();
  await twoFingerTap(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Two-finger tap (the default): no button, and a tap opens the tutor about the chapter, a word and a lesson', async ({ page }) => {
  await openReader(page);
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
  await twoFingerTap(page);
  const chapter = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await expect(chapter).toBeVisible();
  // the Talk sheet is the push-to-talk surface: its mic button is there, ready, not listening
  await expect(chapter.getByRole('button', { name: /^(Hold to|Talk)/ }).first()).toBeVisible();
  await shot(page, 'tutor-door-two-finger-chapter');
  await afterTap(page);
  await chapter.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(chapter).toHaveCount(0);

  // a word sheet: the tutor about that sheet's word
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await twoFingerTap(page, { x: 100, y: 700 });
  const word = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(word).toBeVisible();
  await expect(word.locator('[data-turn]')).toContainText(GRAMMAR_HELP_ANSWER.answer);
  await afterTap(page);
  await word.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(word).toHaveCount(0);

  // a lesson sheet: the tutor about that lesson
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await page.getByRole('dialog', { name: 'Grammar', exact: true }).getByRole('button', { name: 'Learn this idea' }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeVisible();
  await twoFingerTap(page, { x: 100, y: 700 });
  // opened from a word's Grammar sheet the lesson's own Ask the tutor asks about the term in that verse (the Reader's askAboutTerm); alone it is the lesson's talk
  const lesson = page.getByRole('dialog', { name: /^Talk about Romans 8:2|^Ask the tutor: / });
  await expect(lesson).toBeVisible();
  expect(await lesson.getAttribute('aria-labelledby')).toBeTruthy();
  await shot(page, 'tutor-door-two-finger-lesson');
});

test('Two-finger tap out of immersive reading: the bars come back and the tutor opens', async ({ page }) => {
  await openReader(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'immersiveReader', value: 'on' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  await page.evaluate(() => {
    (document.querySelector('[data-reader]') as HTMLElement).scrollTop += 400;
  });
  await expect(page.locator('header').first()).toBeHidden();
  await twoFingerTap(page);
  await expect(page.getByRole('dialog', { name: 'Talk about Romans 8' })).toBeVisible();
  // the bars are back under the sheet (the tap leaves immersive reading)
  await expect(page.locator('header').first()).toBeAttached();
  await afterTap(page);
  await page.getByRole('dialog', { name: 'Talk about Romans 8' }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('header').first()).toBeVisible();
  // a second tap opens the tutor again and does not put the bars away
  await twoFingerTap(page);
  await expect(page.getByRole('dialog', { name: 'Talk about Romans 8' })).toBeVisible();
});

for (const door of ['twoFinger', 'floating'] as const) {
  test(`With no licence there is no tutor door (${door}): no ?, a two-finger tap opens no tutor, and Settings hides the Tutor door and Hand rows`, async ({ page }) => {
    await openReader(page, 'unlicensed');
    await keepDoor(page, door, 'left');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /ask the tutor/i })).toHaveCount(0);
    await twoFingerTap(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
    await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
    await twoFingerTap(page, { x: 100, y: 700 });
    await expect(page.getByRole('dialog', { name: /^Talk about |^Ask the tutor: / })).toHaveCount(0);
    await page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('button', { name: 'Done', exact: true }).click();

    await page.goto('/#/settings');
    await openGroup(page, 'The tutor');
    await expect(page.getByRole('group', { name: 'Tutor door', exact: true })).toHaveCount(0);
    await expect(page.getByText('Tutor door', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
    await openGroup(page, 'Reading');
    await expect(page.getByRole('group', { name: 'Hand', exact: true })).toHaveCount(0);
    await shot(page, `tutor-door-unlicensed-${door}`);
    await leaveSettings(page);
  });
}
