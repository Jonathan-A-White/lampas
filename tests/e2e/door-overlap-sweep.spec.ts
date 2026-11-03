// tests/e2e/door-overlap-sweep.spec.ts — the sweep of mw-5r3p30.981: every screen that asks a question with buttons to tap, with the floating ? (src/AskTutor.tsx FloatingTutor, z-50) over it. Each screen is walked through its
// states (the question, the answer shown, the grades, the foot's Next) at 390x844 and 360x640, once for each hand; at each state every answer button, grade and foot button is scrolled to the ?'s height (the worst place)
// and its box must not meet the ?'s. The card of Drill it, the short drill, Check and Try it (GrammarCard) has its own rows, with taps, in tests/e2e/door-overlap.spec.ts. A screen that fails here is named in the story's
// closing comment, not skipped: it is left out of SCREENS only with a reason in a comment.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { GREEK_READING_ANSWER, makeFakePostern, PARTIAL_ANSWER, QUIZ_ANSWER, WELL_READ_ANSWER } from '../support/fake-postern';
import { holdFor } from '../support/hold';
import { routePostern } from '../support/playwright-postern';
import { FLOATING } from './open-tutor';
import { openLetterDrill } from './large-text-titles';
import { keepHand } from './tutor-door';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

test.use({ hasTouch: true });

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The names of the buttons that answer or grade: a flashcard's Show and its grades, a word's three, a paradigm cell's two. */
const GRADES = /^(Show|I knew it|Not yet|Know it well|Kind of|Don.t know|Had it|Missed)$/;

/** Every button that answers a question or moves on, as the screens draw them: the options, the grades and the foot's Next (testids ending -next, 'next'). */
const buttonsOf = (page: Page): Locator =>
  page
    .locator('[data-option]:not(:disabled), [data-testid="next"], [data-testid$="-next"]')
    .or(page.getByRole('button', { name: GRADES }));

/** Scrolls the scroll box `button` stands in as far as it will go toward putting the button's middle at the ?'s middle. */
async function toTheDoor(page: Page, button: Locator): Promise<void> {
  const door = (await page.locator(FLOATING).boundingBox())!;
  await button.evaluate((el, middle) => {
    let box: HTMLElement | null = el.parentElement;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    const at = el.getBoundingClientRect();
    if (box) box.scrollTop += at.top + at.height / 2 - middle;
  }, door.y + door.height / 2);
}

/** Every button now on screen is clear of the ? with the box scrolled to the ?'s height. */
async function expectAllClear(page: Page, where: string): Promise<number> {
  const buttons = buttonsOf(page);
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    if (!(await button.isVisible())) continue;
    await button.scrollIntoViewIfNeeded();
    await toTheDoor(page, button);
    const door = (await page.locator(FLOATING).boundingBox())!;
    const at = (await button.boundingBox())!;
    const label = ((await button.textContent()) ?? '').trim().slice(0, 40);
    expect(overlaps(door, at), `${where}: the ? ${JSON.stringify(door)} is over "${label}" ${JSON.stringify(at)}`).toBe(false);
  }
  return count;
}

/** Taps what moves the screen on: an option, else Show, else a grade, else Next. False when nothing is left to tap (the round ended). */
async function advance(page: Page): Promise<boolean> {
  const steps = [page.locator('[data-option]:not(:disabled)'), page.getByRole('button', { name: 'Show', exact: true, disabled: false }), page.getByRole('button', { name: /^(I knew it|Know it well|Had it)$/, disabled: false }), page.locator('[data-testid="next"], [data-testid$="-next"]')];
  for (const step of steps) {
    if (await step.first().isVisible()) {
      await step.first().click();
      return true;
    }
  }
  return false;
}

const STATES = 8;

/** Walks the screen: at each state every button is checked, then the screen is moved on, up to STATES times or until the round ends. */
async function walk(page: Page, name: string): Promise<void> {
  let checked = 0;
  for (let state = 0; state < STATES; state += 1) {
    // the first state must have buttons; a later one is the round's end card (its Done and Another round are not answers) when none comes
    if (state === 0) await expect(buttonsOf(page).first()).toBeVisible();
    else if (!(await expect(buttonsOf(page).first()).toBeVisible().then(() => true, () => false))) break;
    checked += await expectAllClear(page, `${name} state ${state + 1}`);
    if (!(await advance(page))) break;
    // the next state is drawn after the tap; a moment for the card that settles (lampas.settleMs is 0 in openUnlocked)
    await page.waitForTimeout(150);
  }
  expect(checked, `${name}: some buttons were checked`).toBeGreaterThan(0);
}

const LEVELS: Record<string, 'solid' | 'frontier'> = {
  article: 'solid', noun: 'solid', 'number-singular': 'solid', 'number-plural': 'solid', 'case-nominative': 'solid', 'case-genitive': 'solid',
  'case-dative': 'frontier', 'gender-masculine': 'solid', 'gender-feminine': 'solid',
};

/** Puts grammar levels in the app's store through raw IndexedDB, as the app wrote them. */
async function putLevels(page: Page): Promise<void> {
  const rows = Object.entries(LEVELS).map(([id, level]) => ({ id, level, since: Date.now(), how: 'marked' }));
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('grammarLevels', 'readwrite');
          for (const row of list) tx.objectStore('grammarLevels').put(row);
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

const SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  {
    name: 'Quick test',
    open: async (page) => {
      await page.goto('/#/test');
      await expect(page.getByRole('heading', { name: 'Quick test', level: 1 })).toBeVisible();
    },
  },
  {
    name: 'the Parsing drill',
    open: async (page) => {
      await page.goto('/#/test');
      await page.getByRole('button', { name: 'Parsing drill: Romans 8' }).click();
      await expect(page.getByRole('heading', { name: 'Parsing drill', level: 1 })).toBeVisible();
    },
  },
  {
    name: 'Review',
    open: async (page) => {
      await page.goto('/#/review');
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByTestId('prompt')).toBeVisible();
    },
  },
  {
    name: 'Placement',
    open: async (page) => {
      await page.goto('/#/settings?group=greek');
      await page.getByRole('button', { name: 'Place me' }).click();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByTestId('placement-question')).toBeVisible();
    },
  },
  {
    name: 'the IPA drill',
    open: async (page) => {
      await page.goto('/#/goal');
      const entry = page.getByTestId('ipa-entry');
      await entry.scrollIntoViewIfNeeded();
      await entry.tap();
      await page.getByTestId('ipa-start').tap();
      // the drill is offered once a sound or two have been looked at
      for (const sound of ['/x/', '/ç/']) {
        await page.locator(`[data-testid=ipa-home] li[data-sound="${sound}"] button`).tap();
        await expect(page.getByTestId('ipa-card-symbol')).toHaveText(sound);
        await page.getByRole('button', { name: '‹ Sounds' }).tap();
      }
      await page.getByTestId('ipa-drill').tap();
      await expect(page.getByTestId('ipa-question')).toBeVisible();
    },
  },
];

const SIZES = [
  { name: '390x844', width: 390, height: 844 },
  { name: '360x640', width: 360, height: 640 },
];

for (const { name, open } of SCREENS) {
  for (const size of SIZES) {
    for (const hand of ['right', 'left'] as const) {
      test(`${name} keeps its answer buttons clear of the ? at ${size.name}, ${hand}-handed`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize(size);
        await openUnlocked(page);
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
        await keepHand(page, hand);
        await open(page);
        await expect(page.locator(FLOATING)).toBeVisible();
        await walk(page, name);
      });
    }
  }
}

for (const size of SIZES) {
  for (const hand of ['right', 'left'] as const) {
    test(`the letter drill keeps its answer buttons clear of the ? at ${size.name}, ${hand}-handed`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(size);
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      await keepHand(page, hand);
      await openLetterDrill(page);
      await expect(page.locator(FLOATING)).toBeVisible();
      await walk(page, 'the letter drill');
    });
  }
}

/** The paradigm drill (the article): a blank cell tapped shows the form with Had it / Missed in a row of the table's own width. */
for (const size of SIZES) {
  for (const hand of ['right', 'left'] as const) {
    test(`the paradigm drill keeps Had it and Missed clear of the ? at ${size.name}, ${hand}-handed`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(size);
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await keepHand(page, hand);
      // as tests/e2e/paradigm-drill.spec.ts: 12 cells of the article are his, so the Drill has blank cells to tap
      await putLevels(page);
      await page.goto('/#/paradigms?t=article');
      // a write behind Dexie's back is not seen by its live queries: the app starts afresh
      await page.reload();
      await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
      await expect(page.locator(FLOATING)).toBeVisible();
      const blank = page.locator('[data-cell][data-state="hidden"]').first();
      await expect(blank).toBeVisible();
      await blank.click();
      await expect(page.getByTestId('grade-row')).toBeVisible();
      await expectAllClear(page, 'the paradigm drill');
    });
  }
}

// --- the screens the first sweep did not walk (mw-5r3p30.998): Memorize's answers, the Reading check (ReadCheck, with its walk of the words to fix), the Reading ladder and the Reading drill ---------------------
// These sit in the Verse view or a screen of their own, in rows whose buttons are as wide as their words or as the box (NextBar's 'view' and 'sheet' branches), so the ? at the Hand's side can be over one at whatever
// height its box has scrolled to, not only the one a short screen leaves it at. Here the claim is the stronger one that no button of the screen has any part in the ?'s column (its width, from the window's edge), at every state.

/** Every button in `within` that is on screen has no part in the ?'s column: it ends before the ? begins (right hand) or begins after the ? ends (left hand), whatever height the ? stands at. Returns how many it checked.
 * The hold bar (.lp-bar) is not counted: it is pinned at the foot, under the ?'s height at both sizes (as NextBar's FootBar), and the header's Done of a sheet is checked by checkDone. */
async function expectClearOfDoorColumn(page: Page, where: string, within: Locator): Promise<number> {
  await expect(page.locator(FLOATING)).toBeVisible();
  let checked = 0;
  // a screen that has just mounted reads the Hand for itself and keeps the right side clear until it has (useHand: Right until it is read): the check waits for it to settle, and a clash that stays fails
  await expect(async () => {
    const door = (await page.locator(FLOATING).boundingBox())!;
    const buttons = within.locator('button:not(.lp-bar)');
    const count = await buttons.count();
    checked = 0;
    for (let i = 0; i < count; i += 1) {
      const button = buttons.nth(i);
      if (!(await button.isVisible())) continue;
      const at = (await button.boundingBox())!;
      const label = ((await button.textContent()) ?? (await button.getAttribute('aria-label')) ?? '').trim().slice(0, 40);
      expect(overlaps({ ...door, y: 0, height: 10_000 }, { ...at, y: 0, height: 1 }), `${where}: the ? column ${JSON.stringify([door.x, door.x + door.width])} has "${label}" ${JSON.stringify(at)}`).toBe(false);
      checked += 1;
    }
  }).toPass({ timeout: 10_000 });
  expect(checked, `${where}: some buttons were checked`).toBeGreaterThan(0);
  return checked;
}

/** Same rows for a phone each size and hand: `run` is given a page at the size, the Hand kept, on the Greek Romans 8. */
function sweepForEach(name: string, run: (page: Page) => Promise<void>, { mic = true }: { mic?: boolean } = {}): void {
  for (const size of SIZES) {
    for (const hand of ['right', 'left'] as const) {
      test.describe(`${name} at ${size.name}, ${hand}-handed`, () => {
        // holdFor times each hold on the page's clock, so it is installed before the page opens
        test.beforeEach(async ({ page }) => {
          await page.clock.install();
        });
        test(`keeps its buttons out of the ?'s column`, async ({ page }) => {
          test.setTimeout(120_000);
          await page.setViewportSize(size);
          if (mic) await honestMic(page);
          await openUnlocked(page);
          await page.goto('/');
          await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
          await keepHand(page, hand);
          await run(page);
        });
      });
    }
  }
}

const HOLD_MS = 2800;
const OU_WORD_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' }],
  note: 'Nearly there: one word to say again.',
};

/** Puts Romans 8:28 on the schedule at step 2, due, as Memorize wrote it (tests/e2e/memorize-session.spec.ts). */
async function seedMemorizeVerse(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['reviews'], 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: 'el:Rom.8.28', step: 2, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

sweepForEach('Memorize, its questions and its judgement', async (page) => {
  await seedMemorizeVerse(page);
  await page.goto('/#/memorize/Rom.8.28/el');
  await expect(page.getByRole('heading', { name: 'Romans 8:28', level: 1 })).toBeVisible();
  const screen = page.locator('main');
  // the verse, Hear it and Type it
  await expectClearOfDoorColumn(page, 'Memorize at the verse', screen);
  // the hold says it from memory (the honest recogniser hears it as Greek and judges it): the judgement's Hear it and Done. The note's I had it and Not yet (a phone that cannot take dictation) stand in the row of Hear it above.
  await holdFor(page, page.getByRole('button', { name: 'Hold to say it' }), HOLD_MS);
  await page.getByTestId('judgement').waitFor();
  await expectClearOfDoorColumn(page, 'Memorize at the judgement', screen);
});

sweepForEach('the Reading check, its words to fix and its walk', async (page) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GREEK_READING_ANSWER };
  await routePostern(page, fake);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await expectClearOfDoorColumn(page, 'the Reading check before a reading', panel);
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), HOLD_MS);
  await expect(panel).toContainText('Words to fix');
  await expectClearOfDoorColumn(page, 'the Reading check with words to fix', panel);
  await panel.getByRole('button', { name: 'Read these again', exact: true }).click();
  const walk = panel.getByRole('group', { name: 'Read these again' });
  await expect(walk).toContainText('Word 1 of 2');
  // NextBar's 'view' branch: Next word, then On to the whole verse, and Done
  await expectClearOfDoorColumn(page, 'the walk at Next word', walk);
  await walk.getByRole('button', { name: 'Next word', exact: true }).click();
  await expect(walk).toContainText('Word 2 of 2');
  await expectClearOfDoorColumn(page, 'the walk at On to the whole verse', walk);
  await walk.getByRole('button', { name: 'On to the whole verse', exact: true }).click();
  await expect(walk.locator('[data-walk-verse]')).toBeVisible();
  await expectClearOfDoorColumn(page, 'the walk at the whole verse', walk);
});

sweepForEach('the Reading ladder, Skip for now, Try again and Next verse', async (page) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: PARTIAL_ANSWER };
  await routePostern(page, fake);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await panel.getByRole('button', { name: 'Reading ladder', exact: true }).click();
  await expect(panel).toContainText('Number 1 of');
  // NextBar's 'view' branch: Skip for now alone
  await expectClearOfDoorColumn(page, 'the ladder at Skip for now', panel);
  await holdFor(page, page.getByRole('button', { name: /^Hold to read verse/ }), HOLD_MS);
  await expect(panel.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  // Try again beside Skip for now
  await expectClearOfDoorColumn(page, 'the ladder at Try again', panel);
  await panel.getByRole('button', { name: 'Try again', exact: true }).click();
  fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
  await holdFor(page, page.getByRole('button', { name: /^Hold to read verse/ }), HOLD_MS);
  await expect(panel.getByRole('button', { name: 'Next verse', exact: true })).toBeVisible();
  await expectClearOfDoorColumn(page, 'the ladder at Next verse', panel);
});

/** The header's Done of the Reading drill sheet stands at the sheet's top, not in its scroll box: the sheet is as tall as its card, so it meets the ? when the card is tall (390x844, right-handed, the rule's card: the ? at y 468-524, Done at 504-548): it stands on the side away from the Hand. Its box must be clear of the ?'s. */
async function expectDoneClear(page: Page, drill: Locator, where: string): Promise<void> {
  // the sheet reads the Hand for itself when it mounts (Right until it is read): the check waits for that
  await expect(async () => {
    const done = (await drill.getByRole('button', { name: 'Done', exact: true }).boundingBox())!;
    const door = (await page.locator(FLOATING).boundingBox())!;
    expect(overlaps(door, done), `${where}: the ? ${JSON.stringify(door)} is over Done ${JSON.stringify(done)}`).toBe(false);
  }).toPass({ timeout: 10_000 });
}

sweepForEach('the Reading drill, its card and its Next word', async (page) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: OU_WORD_ANSWER };
  await routePostern(page, fake);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  const bar = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });
  // two misses of ου offer the drill
  await holdFor(page, bar, HOLD_MS);
  await expect(panel).toContainText('Words to fix');
  await holdFor(page, bar, HOLD_MS);
  await panel.getByRole('button', { name: 'Drill this sound', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Reading drill' });
  // its scroll box (the card and NextBar's 'sheet' bar); the header's Done is not in it
  const card = drill.locator('.overflow-y-auto');
  await expectClearOfDoorColumn(page, 'the Reading drill at its rule', card);
  await expectDoneClear(page, drill, 'the Reading drill at its rule');
  await drill.getByRole('button', { name: 'Start the drill', exact: true }).click();
  // NextBar's 'sheet' branch: Skip this word, then Next word once the word is read
  await expect(drill).toContainText('Word 1 of 5');
  await expectClearOfDoorColumn(page, 'the Reading drill at Skip this word', card);
  await expectDoneClear(page, drill, 'the Reading drill at Skip this word');
  fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
  await holdFor(page, drill.getByRole('button', { name: /^Hold to read / }), HOLD_MS);
  await expect(drill).toContainText('Well read');
  await expectClearOfDoorColumn(page, 'the Reading drill at Next word', card);
  await expectDoneClear(page, drill, 'the Reading drill at Next word');
});

/** Quiz me (Practise > Quiz > Start the quiz) opens in the Talk sheet, which has its own composer at the foot and is a screen the ? is not drawn over (src/AskTutor.tsx FloatingTutor: not while a Talk sheet is open, src/tutor/door.ts useTalkOpen), so
 * its answers are never under it (mw-5r3p30.998). The ? is on the Verse view before the quiz and comes back when the sheet is done. */
for (const size of SIZES) {
  for (const hand of ['right', 'left'] as const) {
    test(`Quiz me in the Talk sheet draws no ? over its answers at ${size.name}, ${hand}-handed`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(size);
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: QUIZ_ANSWER };
      await routePostern(page, fake);
      await openUnlocked(page);
      await page.goto('/#/?c=8&view=english&weave=off');
      await expect(page.locator('[data-heading]', { hasText: 'Walking by the Spirit' })).toBeVisible();
      await keepHand(page, hand);
      await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
      const view = page.getByRole('region', { name: 'Verse view' });
      await view.getByRole('button', { name: 'Practise', exact: true }).click();
      await view.getByRole('button', { name: 'Quiz', exact: true }).click();
      await expect(page.locator(FLOATING)).toBeVisible();
      await view.getByRole('button', { name: 'Start the quiz', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Quiz on Romans 8:1-11' });
      await expect(sheet).toContainText(QUIZ_ANSWER.answer);
      await expect(page.locator(FLOATING)).toHaveCount(0);
      await sheet.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(sheet).toHaveCount(0);
      await expect(page.locator(FLOATING)).toBeVisible();
    });
  }
}
