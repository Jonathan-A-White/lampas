// tests/e2e/door-overlap-sweep.spec.ts — the sweep of mw-5r3p30.981: every screen that asks a question with buttons to tap, with the floating ? (src/AskTutor.tsx FloatingTutor, z-50) over it. Each screen is walked through its
// states (the question, the answer shown, the grades, the foot's Next) at 390x844 and 360x640, once for each hand; at each state every answer button, grade and foot button is scrolled to the ?'s height (the worst place)
// and its box must not meet the ?'s. The card of Drill it, the short drill, Check and Try it (GrammarCard) has its own rows, with taps, in tests/e2e/door-overlap.spec.ts. A screen that fails here is named in the story's
// closing comment, not skipped: it is left out of SCREENS only with a reason in a comment.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { FLOATING } from './open-tutor';
import { openLetterDrill } from './large-text-titles';
import { keepHand } from './tutor-door';
import { openUnlocked } from './unlocked';

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
    else if (!(await buttonsOf(page).first().waitFor({ timeout: 3000 }).then(() => true, () => false))) break;
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
