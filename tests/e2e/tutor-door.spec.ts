// tests/e2e/tutor-door.spec.ts — the tutor door at 390x844 (mw-5r3p30.880, part B of mw-5r3p30.843; mw-5r3p30.882, part C2): the floating ? at the Hand side on every screen and over sheets, the one door,
// and no door at all without a licence. A two-finger tap opens no tutor (tests/e2e/tutor-door-absent.spec.ts); the older buttons are gone.
import { expect, test, type Page } from '@playwright/test';
import { GRAMMAR_HELP_ANSWER, makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { leaveSettings, openGroup } from './settings-group';
import { shot } from './shot';
import { TALK_SHEET, twoFingers } from './open-tutor';
import { keepHand } from './tutor-door';
import { openDrillIt, openShortDrill } from './large-text-titles';
import { openUnlicensed, openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT, hasTouch: true });

// the variants chip's long press is held on the page's clock (tests/support/hold.ts)
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

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

test('Floating ?: on the teach sheet it closes the sheet and the tutor opens in front, asking about the new word (mw-5r3p30.949)', async ({ page }) => {
  await openReader(page);
  await keepHand(page, 'right');
  await page.getByTestId('new-words').click();
  const teach = page.getByRole('dialog', { name: 'New word', exact: true });
  await expect(teach).toBeVisible();
  await expect(teach.getByRole('button', { name: 'Ask the tutor', exact: true })).toHaveCount(0);
  await expect(floating(page)).toBeVisible();
  await shot(page, 'tutor-door-floating-teach-sheet');
  await floating(page).click();
  await expect(teach).toHaveCount(0);
  const talk = page.getByRole('dialog', { name: /^Talk about Romans 8:/ });
  await expect(talk).toBeVisible();
  // the Talk sheet is in front: what is at its centre is inside it, not under another sheet
  const centre = (await talk.boundingBox())!;
  expect(await talk.evaluate((el, { x, y }) => el.contains(document.elementFromPoint(x, y)), { x: centre.x + centre.width / 2, y: centre.y + centre.height / 2 })).toBe(true);
  await expect(talk.locator('[data-turn]').first()).toContainText('αὐτός');
  await shot(page, 'tutor-door-teach-sheet-talk');
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

// --- over a sheet the tutor's Talk would open beneath (mw-5r3p30.953, found by the sweep of mw-5r3p30.949) -------------------------------------------------------------------------------------
// The Talk sheet is z-10, so over a sheet at z-30 or z-35 (or the chapter picker, drawn after it) a tap on the ? opened the tutor UNDER the sheet and, to him, did nothing. Each of these has no way to ask the
// tutor about itself, so it registers a hidden door target: the ? is not drawn over it, and is back, with a Talk in front, when the sheet is closed.

const chip = (page: Page) => page.getByTestId('variants-chip');
const dialog = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

/** One overlay of the Reader. `door`: what the ? does over it, 'hidden' (not drawn) or 'talk' (a tutor Talk sheet opens in front). A new overlay is one more row (mw-5r3p30.953). */
interface Overlay {
  name: string;
  open: (page: Page) => Promise<void>;
  sheet: string;
  door: 'hidden' | 'talk';
}

const OVERLAYS: Array<Omit<Overlay, 'door'> & { door?: Overlay['door'] }> = [
  {
    name: 'the chapter picker',
    sheet: 'Choose a chapter',
    open: async (page) => {
      await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
    },
  },
  {
    name: 'a word sheet opened by a link (#/?word=G3551)',
    sheet: 'Word',
    open: async (page) => {
      // a link is read as the page starts: a full load, as a link from another app is
      await page.goto('about:blank');
      await page.goto('/#/?word=G3551');
    },
  },
  {
    name: 'a word sheet of another chapter (an example on the idea sheet)',
    sheet: 'Word',
    open: async (page) => {
      // the idea sheet's examples come from his goal, and a goal in 1 John is another chapter than Romans 8
      await page.goto('/#/settings?group=greek');
      const goal = page.getByRole('group', { name: 'Goal', exact: true });
      await goal.getByRole('combobox', { name: 'Book', exact: true }).selectOption({ label: '1 John' });
      await goal.getByRole('combobox', { name: 'Chapter', exact: true }).selectOption({ label: '1' });
      await goal.getByRole('combobox', { name: 'Verse', exact: true }).selectOption({ label: '1' });
      await expect(goal.getByTestId('goal-now')).toHaveText('Read 1 John 1:1');
      await page.goto('/#/?b=rom&c=8');
      await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
      await dialog(page, 'Word').getByTestId('sheet-parse').getByRole('button', { name: 'indicative', exact: true }).click();
      await dialog(page, 'Grammar').getByRole('button', { name: 'Learn this idea' }).click();
      const idea = dialog(page, 'Idea');
      const away = idea.getByTestId('idea-example').first();
      await expect(away.getByTestId('idea-verse')).toContainText('1 John');
      await away.click();
      await expect(idea).toBeHidden();
    },
  },
  {
    name: 'the RP 2026 sheet',
    sheet: 'RP 2026: English from the 2026 Greek',
    open: async (page) => {
      await page.goto('/#/settings?group=reading');
      const setting = page.getByRole('group', { name: 'English from the 2026 Greek', exact: true });
      await setting.scrollIntoViewIfNeeded();
      await setting.getByRole('button', { name: 'On', exact: true }).click();
      await expect(setting.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.goto('/#/?b=phm&c=1');
      await page.locator('[data-verse="1"] [data-rp2026-mark]').click();
    },
  },
  {
    name: 'the key to the marks of a variant brace',
    sheet: 'What the marks in a brace mean',
    open: async (page) => {
      await page.goto('/#/?b=rev&c=10&weave=solid');
      await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
      await chip(page).click();
      await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
      const brace = page.locator('[data-brace-key]').first();
      await brace.scrollIntoViewIfNeeded();
      await brace.click();
    },
  },
  {
    name: 'the variants filter sheet',
    sheet: 'Variants',
    open: async (page) => {
      await page.goto('/#/?b=rev&c=3');
      await expect(page.locator('[data-verse="7"] [data-text]')).toBeVisible();
      await holdFor(page, chip(page), 700);
    },
  },
];

/** The Talk sheet is open and in front: what is at its centre is inside it, not under another sheet. */
async function expectTalkInFront(page: Page): Promise<void> {
  const talk = page.getByRole('dialog', { name: TALK_SHEET });
  await expect(talk).toBeVisible();
  const centre = (await talk.boundingBox())!;
  expect(await talk.evaluate((el, { x, y }) => el.contains(document.elementFromPoint(x, y)), { x: centre.x + centre.width / 2, y: centre.y + centre.height / 2 })).toBe(true);
}

// The guard (mw-5r3p30.953): over every overlay of the Reader the ? either brings a Talk on top or is not drawn, never a tap that opens the tutor beneath. The rows below are the six with nothing to ask about
// (the ? is not drawn; closed, it is back and a Talk opens in front) and the six the ? asks about (a Talk opens in front of them).
OVERLAYS.push(
  {
    name: 'a word sheet with a chapter word',
    sheet: 'Word',
    door: 'talk',
    open: async (page) => {
      await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
    },
  },
  {
    name: 'the Grammar sheet',
    sheet: 'Grammar',
    door: 'talk',
    open: async (page) => {
      await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
      await dialog(page, 'Word').getByTestId('sheet-parse').getByRole('button', { name: 'indicative', exact: true }).click();
    },
  },
  {
    name: 'the idea sheet',
    sheet: 'Idea',
    door: 'talk',
    open: async (page) => {
      await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
      await dialog(page, 'Word').getByTestId('sheet-parse').getByRole('button', { name: 'indicative', exact: true }).click();
      await dialog(page, 'Grammar').getByRole('button', { name: 'Learn this idea' }).click();
    },
  },
  {
    name: 'the variant brace sheet',
    sheet: 'Variant reading',
    door: 'talk',
    open: async (page) => {
      await page.goto('/#/?b=rev&c=3');
      await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
      await chip(page).click();
      await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
      await page.locator('[data-verse="2"] [data-brace]').first().locator('[data-witness]').first().click();
    },
  },
  {
    name: 'the Verse view',
    sheet: 'Verse view',
    door: 'talk',
    open: async (page) => {
      await openVerseView(page, 28);
    },
  },
  {
    name: 'the teach sheet',
    sheet: 'New word',
    door: 'talk',
    open: async (page) => {
      await page.getByTestId('new-words').click();
    },
  },
);

for (const overlay of OVERLAYS) {
  const door = overlay.door ?? 'hidden';
  test(`Floating ?: over ${overlay.name} it is ${door === 'hidden' ? 'not drawn (back, with a Talk in front, once it is closed)' : 'a door that opens a Talk in front'} (mw-5r3p30.953)`, async ({ page }) => {
    await openReader(page);
    await keepHand(page, 'right');
    await expect(floating(page)).toBeVisible();
    await overlay.open(page);
    // the Verse view is a region, every other overlay a dialog
    const sheet = overlay.sheet === 'Verse view' ? page.getByRole('region', { name: 'Verse view' }) : dialog(page, overlay.sheet);
    await expect(sheet).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await shot(page, `tutor-door-overlay-${overlay.sheet.replace(/\W+/g, '-').toLowerCase()}`);
    if (door === 'talk') {
      await expect(floating(page)).toBeVisible();
      await floating(page).click();
      await expectTalkInFront(page);
      return;
    }
    await expect(page.locator('[data-floating-tutor]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(floating(page)).toBeVisible();
    await floating(page).click();
    await expectTalkInFront(page);
  });
}

// Drill it and the short drill (mw-5r3p30.985): the ? asks about the drill on every step, not only on the results. Before, the dialog drew its Talk only once there was a result, so on a step the newest
// door target was the idea sheet or the screen under the z-40 drill: the Talk opened beneath it and the ? hid, a tap that did nothing. The rule (docs/layout/tutor.md): at every state of a full-screen dialog
// either the ? is drawn and opens a Talk in front, or no ? is drawn; never a ? that is gone with no Talk visible.

/** At this moment the tutor is reachable: the ? is drawn, or a Talk is open. */
async function expectNotLost(page: Page, where: string): Promise<void> {
  const open = await page.getByRole('dialog', { name: TALK_SHEET }).count();
  expect(open + (await floating(page).count()), `${where}: no ? and no Talk on screen`).toBeGreaterThan(0);
}

/** A tap on the ? opens a Talk in front of the dialog; its first suggestion is asked when `ask` is given, and the request the mill got is returned. Done puts the Talk away again (Escape is not used: every open sheet listens for it). */
async function tapThroughDoor(page: Page, where: string, fake: ReturnType<typeof makeFakePostern>, ask: boolean): Promise<{ name: string; facts: { label: string; value: string }[] } | null> {
  await expectNotLost(page, where);
  await expect(floating(page), `${where}: the ? is drawn`).toBeVisible();
  await floating(page).click();
  await expectTalkInFront(page);
  let screen: { name: string; facts: { label: string; value: string }[] } | null = null;
  if (ask) {
    const before = fake.received.length;
    const talk = page.getByRole('dialog', { name: TALK_SHEET });
    await talk.locator('[data-suggestion]').first().click();
    await expect.poll(() => fake.received.length, { message: `${where}: the question reached the mill` }).toBe(before + 1);
    screen = (fake.received[before].input as { screen: { name: string; facts: { label: string; value: string }[] } }).screen;
  }
  await page.getByRole('dialog', { name: TALK_SHEET }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog', { name: TALK_SHEET })).toHaveCount(0);
  await expectNotLost(page, `${where} (Talk put away)`);
  return screen;
}

for (const hand of ['right', 'left'] as const) {
  test(`Floating ?: on every step of Drill it the ? opens the Talk in front of the drill, about its question (${hand} Hand) (mw-5r3p30.985)`, async ({ page }) => {
    const fake = makeFakePostern();
    fake.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER };
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await keepHand(page, hand);
    const drill = await openDrillIt(page, 'The noun');
    await expect(drill.getByTestId('drill-step')).toBeVisible();
    for (let step = 1; ; step += 1) {
      const prompt = ((await drill.getByTestId('grammar-prompt').textContent()) ?? '').trim();
      // unanswered
      const unanswered = await tapThroughDoor(page, `step ${step}, unanswered`, fake, step === 1);
      if (unanswered) {
        expect(unanswered.facts, 'the Talk is told the idea').toContainEqual({ label: 'Idea', value: 'The noun' });
        expect(unanswered.facts.find((f) => f.label === 'Question on screen')?.value, 'the Talk is told the question').toContain(prompt.slice(0, 20));
      }
      await expect(drill.getByTestId('grammar-prompt'), 'closed, the same step is there').toHaveText(prompt);
      if (step === 1) await shot(page, `tutor-door-drill-it-${hand}`);
      // answered: the answer, the Next and the ? are all there
      await drill.locator('[data-option]:not(:disabled)').first().click();
      await expect(drill.getByTestId('drill-next')).toBeVisible();
      const answered = await tapThroughDoor(page, `step ${step}, answered`, fake, step === 1);
      if (answered) expect(answered.facts.find((f) => f.label === 'Question on screen')?.value).toContain(prompt.slice(0, 20));
      await expect(drill.locator('[data-option][data-result="right"]'), 'closed, the answer is still shown').toBeVisible();
      await expect(drill.getByTestId('drill-next')).toBeVisible();
      const last = (await drill.getByTestId('drill-next').textContent()) === 'Finish';
      await drill.getByTestId('drill-next').click();
      if (last) break;
    }
    await expect(drill.getByTestId('drill-result')).toBeVisible();
    await tapThroughDoor(page, 'the results', fake, false);
  });
}

test('Floating ?: on every step of the short drill the ? opens the Talk in front of it, about its question (mw-5r3p30.985)', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keepHand(page, 'left');
  const short = await openShortDrill(page);
  for (let step = 1; ; step += 1) {
    const prompt = ((await short.getByTestId('grammar-prompt').textContent()) ?? '').trim();
    const unanswered = await tapThroughDoor(page, `short drill question ${step}, unanswered`, fake, step === 1);
    if (unanswered) expect(unanswered.facts.find((f) => f.label === 'Question on screen')?.value).toContain(prompt.slice(0, 20));
    await expect(short.getByTestId('grammar-prompt')).toHaveText(prompt);
    await short.locator('[data-option]:not(:disabled)').first().click();
    await expect(short.getByTestId('plan-drill-next')).toBeVisible();
    await tapThroughDoor(page, `short drill question ${step}, answered`, fake, false);
    await expect(short.getByTestId('plan-drill-next')).toBeVisible();
    const last = (await short.getByTestId('plan-drill-next').textContent()) === 'Finish';
    await short.getByTestId('plan-drill-next').click();
    if (last) break;
  }
  await expect(short.getByTestId('plan-drill-result')).toBeVisible();
  await tapThroughDoor(page, 'the short drill result', fake, false);
});
