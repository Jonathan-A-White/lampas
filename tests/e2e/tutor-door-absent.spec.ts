// tests/e2e/tutor-door-absent.spec.ts — the floating ? is the tutor's one door (mw-5r3p30.882, part C2 of mw-5r3p30.843; mw-5r3p30.944). At 390 x 844 on Revelation 1 with a licence: the Reader's
// Talk bar and the older round Ask button are not drawn; the Verse view has no 'Ask the tutor' action, no 'Talk about verse N' line and no Ask box (Hold to ask, Type a question); the word sheet,
// the lesson (idea) sheet, the variant sheet and the New words sheet have no 'Ask the tutor' of their own; and a two-finger tap on the text opens no tutor (it goes in and out of immersive reading).
// The ? is on screen, once, on every one of them. Without a licence no door is drawn at all.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openGroup } from './settings-group';
import { FLOATING, openTutor, twoFingers } from './open-tutor';
import { shot } from './shot';
import { openUnlicensed, openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const REVELATION_1 = '/#/?b=rev&c=1';

/** The Verse view's old action and a sheet's old button were both named exactly this; the door's own name only starts with it, so exact: true tells them apart. */
const oldButton = (scope: Page | Locator) => scope.getByRole('button', { name: 'Ask the tutor', exact: true });

/** The Reader's old Talk bar, the old round button and every old composer control: none is in the page. */
async function expectNoOldControls(page: Page) {
  await expect(page.locator('[data-talk-bar]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Talk', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-ask-tutor]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask the tutor about this screen' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hold to ask', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Type a question', exact: true })).toHaveCount(0);
  await expect(oldButton(page)).toHaveCount(0);
}

/** The ? is the one door: drawn once, and nothing else round and tutor-ish beside it. */
async function expectOneDoor(page: Page) {
  await expect(page.locator(FLOATING)).toHaveCount(1);
  await expect(page.locator(FLOATING)).toBeVisible();
  await expect(page.locator(`${FLOATING}, [data-ask-tutor]`)).toHaveCount(1);
}

async function openRevelation(page: Page, how: 'licensed' | 'unlicensed' = 'licensed') {
  if (how === 'licensed') await openUnlocked(page);
  else await openUnlicensed(page);
  await page.goto(REVELATION_1);
  await expect(page.getByRole('heading', { name: 'Revelation 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

/** A two-finger tap on the text of verse 1, then the click a phone may send after it waited out (src/tutor/door.ts CLICK_GUARD_MS). */
async function twoFingersOnText(page: Page) {
  const text = (await page.locator('[data-verse="1"]').boundingBox())!;
  await twoFingers(page, { x: text.x + 40, y: text.y + text.height / 2 });
  await page.waitForTimeout(800);
}

/** Puts rows into a store of the app's database (IndexedDB 'lampas'). */
async function put(page: Page, store: string, rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

test('Revelation 1 has no Talk bar and no round Ask button, the ? is its one door, and a two-finger tap on the text opens no tutor', async ({ page }) => {
  await openRevelation(page);
  await expectNoOldControls(page);
  await expectOneDoor(page);

  await twoFingersOnText(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/^Talk about /)).toHaveCount(0);
  await shot(page, 'tutor-door-absent-reader');

  // the ? is the way in, and the only one
  const sheet = await openTutor(page, { sheet: 'Talk about Revelation 1' });
  await expect(sheet).toBeVisible();
});

test('the Verse view has no Ask the tutor action, no Talk about verse line and no Ask box; the ? asks about the verse', async ({ page }) => {
  await openRevelation(page);
  const view = await openVerseView(page, 1);
  await expectNoOldControls(page);
  await expect(oldButton(view)).toHaveCount(0);
  await expect(view.getByText(/^Talk about verse/)).toHaveCount(0);
  await expect(view.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
  await expect(view.getByRole('button', { name: 'Practise', exact: true })).toBeVisible();
  await expectOneDoor(page);
  await twoFingers(page);
  await page.waitForTimeout(800);
  await expect(page.getByRole('dialog', { name: /^Talk about / })).toHaveCount(0);
  await shot(page, 'tutor-door-absent-verse');
  await openTutor(page, { sheet: 'Talk about Revelation 1:1' });
});

test('the word sheet has no Ask the tutor of its own; the ? is still over it', async ({ page }) => {
  await openRevelation(page);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'servants', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(word).toBeVisible();
  await expect(oldButton(word)).toHaveCount(0);
  await expect(word.getByRole('group', { name: 'Help with this word' })).toBeVisible();
  await expectNoOldControls(page);
  await expectOneDoor(page);
  await shot(page, 'tutor-door-absent-word');
});

test('the lesson (idea) sheet has no Ask the tutor of its own; the ? is still over it', async ({ page }) => {
  await openRevelation(page);
  // the Goal screen lists the ideas of a goal (ideas-bar) only once a goal is set
  await put(page, 'settings', [{ key: 'goal', value: 'Revelation 1' }]);
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button').first().click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea).toBeVisible();
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await expect(oldButton(idea)).toHaveCount(0);
  await expectNoOldControls(page);
  await expectOneDoor(page);
  await shot(page, 'tutor-door-absent-idea');
});

test('the New words sheet has no Ask the tutor of its own; the ? is still over it', async ({ page }) => {
  await openRevelation(page);
  await page.getByTestId('new-words').click();
  const sheet = page.getByRole('dialog', { name: 'New word' });
  await expect(sheet.getByTestId('teach-lemma')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Got it', exact: true })).toBeVisible();
  await expect(oldButton(sheet)).toHaveCount(0);
  await expectNoOldControls(page);
  await expectOneDoor(page);
  await shot(page, 'tutor-door-absent-teach');
});

test('the variant sheet has no Ask the tutor of its own; the ? is still over it', async ({ page }) => {
  await openRevelation(page);
  await page.getByRole('button', { name: /^Variants,/ }).click();
  const brace = page.locator('[data-verse="2"] [data-brace]').first();
  await expect(brace).toBeVisible();
  await brace.locator('[data-witness]').first().click();
  const sheet = page.getByRole('dialog', { name: 'Variant reading' });
  await expect(sheet).toBeVisible();
  await expect(oldButton(sheet)).toHaveCount(0);
  await expectNoOldControls(page);
  await expectOneDoor(page);
  await shot(page, 'tutor-door-absent-variant');
});

test('without a licence Revelation 1 draws no tutor door: no ?, no Talk bar, and a two-finger tap opens nothing', async ({ page }) => {
  await openRevelation(page, 'unlicensed');
  await expect(page.locator(FLOATING)).toHaveCount(0);
  await expectNoOldControls(page);
  await expect(page.getByRole('button', { name: /ask the tutor/i })).toHaveCount(0);
  await twoFingersOnText(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'servants', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await expect(page.locator(FLOATING)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /ask the tutor/i })).toHaveCount(0);
  await shot(page, 'tutor-door-absent-unlicensed');
});

test('Settings has no Tutor door setting and no Ask by; Hand stays in Reading', async ({ page }) => {
  await openRevelation(page);
  await page.goto('/#/settings');
  await expect(page.getByRole('group', { name: 'Tutor door', exact: true })).toHaveCount(0);
  await expect(page.getByText('Tutor door', { exact: true })).toHaveCount(0);
  await openGroup(page, 'The tutor');
  await expect(page.getByRole('group', { name: 'Ask by', exact: true })).toHaveCount(0);
  await expectOneDoor(page);
  await page.goto('/#/settings');
  await openGroup(page, 'Reading');
  await expect(page.getByRole('group', { name: 'Hand', exact: true })).toBeVisible();
});
