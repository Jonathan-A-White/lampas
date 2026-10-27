import { expect, test, type Page } from '@playwright/test';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { makeFakePostern, WELL_READ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { chooseAction } from './verse-view';
import { expectInView, openWithTextSize, PHONES } from './next-in-view';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { holdFor } from '../support/hold';

// After he answers, the button that moves on is in view with no scroll (mw-5r3p30.377). He read Review on his phone and the Next button sat below the fold:
// 'Right.' and the help button were the last thing on the screen and 'what next' was not obvious. Each screen that asks and then moves on is walked at the
// phone sizes and, as a reader with a larger text size, at 130 %.

// An ου word to fix, so each reading adds a miss of the sound to the tally (tests/e2e/reading-drill.spec.ts).
const OU_WORD_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' }],
  note: 'Nearly there: one word to say again.',
};

// He read part of the verse and stopped: the card for the word he stopped at has a tip as long as the grind writes one (mw-5r3p30.397).
const PARTIAL_LONG_TIP_ANSWER = {
  verdict: 'partial',
  focus_words: [{ word: 'πάντων', index: 2, chunks: ['πάν', 'των'], tip: 'The ντ is a d, as in pándon.' }],
  note: 'Good start: I heard the first words, then you stopped.',
  reached: 1,
  next_word: {
    word: 'ἀγαπῶσιν',
    index: 2,
    chunks: ['ἀ', 'γα', 'πῶ', 'σιν'],
    tip: 'Say the stress on the third piece, πῶ. The γ before α is a soft sound made at the back of the throat, and the σ is a plain s.',
  },
};

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'settings' | 'grammarLevels', rows: object[]) {
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

// The Drill it walk opens the idea sheet on The noun with a goal of 1 John 1. `holdChapters` keeps the chapter fetches back until the returned release is called,
// as a loaded host does (mw-5r3p30.485): the sheet's slider is disabled until its examples have loaded.
async function openIdeaSheet(page: Page, percent: number, holdChapters = false): Promise<() => void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'grammarLevels', ['breathings', 'accents', 'iota-subscript'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })));
  await openWithTextSize(page, '#/goal', percent);
  await expect(page.getByTestId('ideas-bar')).toBeVisible();
  let release = (): void => {};
  if (holdChapters) {
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/data\/.*\.json/, async (route) => {
      await gate;
      await route.continue();
    });
  }
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The noun', exact: true }).click();
  return release;
}

// The slider is one thumb: End slides it to I know it, which opens Drill it. It is disabled until the sheet has found its examples, and a disabled
// control takes no focus and no key, so the walk waits for it first (mw-5r3p30.485).
async function slideToKnowIt(page: Page): Promise<void> {
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  const slider = idea.getByRole('slider', { name: 'Your level' });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await expect(slider).toBeEnabled();
  await slider.focus();
  await page.keyboard.press('End');
}

for (const phone of PHONES) {
  for (const percent of [100, 130]) {
    const at = `${phone.name} at ${percent} % text`;

    test.describe(at, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(phone.size);
        await openUnlocked(page);
      });

      test('Review: after every answer of a round Next (Finish at the end) is in view', async ({ page }) => {
        await openWithTextSize(page, '#/review', percent);
        await page.getByRole('button', { name: 'Start', exact: true }).click();
        await expect(page.getByTestId('prompt')).toBeVisible();
        for (let i = 0; i < 10; i += 1) {
          const show = page.getByRole('button', { name: 'Show', exact: true });
          if (await show.isVisible()) {
            await show.click();
            await page.getByRole('button', { name: /^(Not yet|Don't know)$/ }).click();
          } else {
            await page.locator('[data-option]').last().click();
          }
          const next = page.getByTestId('next');
          await expectInView(page, next, `Review ${i + 1} of 10`);
          if (i === 0) await shot(page, `next-in-view-review-${phone.name}-${percent}`);
          await next.click();
        }
        await expect(page.getByTestId('score')).toBeVisible();
      });

      test('Quick test: after every answer Next (Finish at the end) is in view', async ({ page }) => {
        await openWithTextSize(page, '#/test', percent);
        for (let i = 0; i < 10; i += 1) {
          await page.locator('[data-option]').last().click();
          const next = page.getByTestId('next');
          await expectInView(page, next, `Quick test ${i + 1} of 10`);
          if (i === 0) await shot(page, `next-in-view-quiz-${phone.name}-${percent}`);
          await next.click();
        }
        await expect(page.getByTestId('score')).toBeVisible();
      });

      test('Parsing drill: after every answer Next step, Next word or Finish is in view', async ({ page }) => {
        await openWithTextSize(page, '#/drill', percent);
        // the reload that applies the text size finds the round the first look kept
        const fresh = page.getByRole('button', { name: 'New round' });
        if (await fresh.isVisible()) await fresh.click();
        for (let words = 0; words < 2; words += 1) {
          for (let step = 0; step < 8; step += 1) {
            await page.locator('[data-option]').last().click();
            const next = page.getByTestId('next');
            await expectInView(page, next, `Parsing drill word ${words + 1} step ${step + 1}`);
            if (words === 0 && step === 0) await shot(page, `next-in-view-drill-${phone.name}-${percent}`);
            const label = await next.textContent();
            await next.click();
            if (label !== 'Next step') break;
          }
        }
      });

      test('Placement: after every answer of the walk and of the quick round Next is in view', async ({ page }) => {
        await honestSpeech(page, { langs: ['el-GR'] });
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
        await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
        await openWithTextSize(page, '#/placement', percent);
        await page.getByRole('button', { name: 'Start', exact: true }).click();
        const end = page.getByTestId('where');
        for (let i = 0; i < 30 && !(await end.isVisible()); i += 1) {
          await expect(page.getByTestId('placement-question')).toBeVisible();
          // a sound heard and picked: the card is drawn at once, the options are the buttons
          await page.locator('[data-option]').last().click();
          const next = page.getByTestId('next');
          await expectInView(page, next, `Placement answer ${i + 1}`);
          if (i === 0) await shot(page, `next-in-view-placement-${phone.name}-${percent}`);
          await next.click();
          await expect(page.getByTestId('placement-question').or(end)).toBeVisible();
        }
      });

      test('Drill it (a dialog with a footer of its own): Next is in view after an answer', async ({ page }) => {
        await openIdeaSheet(page, percent);
        await slideToKnowIt(page);
        const drill = page.getByRole('dialog', { name: 'Drill it' });
        await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
        await drill.locator('[data-option]').last().click();
        await expectInView(page, drill.getByTestId('drill-next'), 'Drill it');
      });

      test('Reading ladder: after a good reading Next verse is in view', async ({ page }) => {
        await page.clock.install();
        const fake = makeFakePostern();
        fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
        await routePostern(page, fake);
        await honestMic(page);
        await openWithTextSize(page, '', percent);
        await page.getByRole('button', { name: 'Greek', exact: true }).click();
        const view = await chooseAction(page, 28, 'Read it aloud');
        const panel = page.getByRole('region', { name: 'Reading check' });
        await panel.getByRole('button', { name: 'Reading ladder', exact: true }).click();
        await expect(view.getByRole('heading', { level: 2 })).toHaveText('1 Thessalonians 5:16');
        await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 16', exact: true }), 2800);
        await expect(panel).toContainText('Well read');
        const next = panel.getByRole('button', { name: 'Next verse', exact: true });
        await expectInView(page, next, 'Next verse');
        await shot(page, `next-in-view-ladder-${phone.name}-${percent}`);
      });

      for (const speaking of [true, false]) {
        test(`Reading ladder, partial reading, read-aloud bar ${speaking ? 'showing' : 'not showing'}: the Next word card is whole, above the bottom stack`, async ({ page }) => {
          await page.clock.install();
          const fake = makeFakePostern();
          fake.autoReply = { status: 'answered', answer: PARTIAL_LONG_TIP_ANSWER };
          await routePostern(page, fake);
          await honestMic(page);
          await honestSpeech(page, { msPerWord: 800 });
          await page.goto('/');
          await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
          if (!speaking) await put(page, 'settings', [{ key: 'readTutor', value: 'off' }]);
          await openWithTextSize(page, '', percent);
          await page.getByRole('button', { name: 'Greek', exact: true }).click();
          const view = await chooseAction(page, 28, 'Read it aloud');
          const panel = page.getByRole('region', { name: 'Reading check' });
          await panel.getByRole('button', { name: 'Reading ladder', exact: true }).click();
          await expect(view.getByRole('heading', { level: 2 })).toHaveText('1 Thessalonians 5:16');
          await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 16', exact: true }), 2800);
          await expect(panel).toContainText('Part of the verse');
          const card = panel.locator('[data-next-word]');
          const tip = card.getByText('Say the stress');
          await expect(card).toBeVisible();
          if (speaking) await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
          else await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
          // the card, its heading and its whole tip stand inside the window and above the topmost thing drawn under the text
          await expect
            .poll(async () => {
              const measured = await page.evaluate(() => {
                const el = document.querySelector('[data-next-word]');
                const box = document.querySelector('[data-verse-view] .screen');
                if (!el || !box) return null;
                const cardBox = el.getBoundingClientRect();
                const boxRect = box.getBoundingClientRect();
                const tops = [...document.querySelectorAll('[data-next-bar], [data-verse-bar], [data-speaking-slot]')]
                  .filter((n) => n.getBoundingClientRect().height > 0)
                  .map((n) => n.getBoundingClientRect().top);
                const stackTop = Math.min(boxRect.bottom, ...tops);
                return { top: cardBox.top, bottom: cardBox.bottom, boxTop: boxRect.top, stackTop };
              });
              if (!measured) return 'no card';
              if (measured.top < measured.boxTop - 0.5) return `card top ${measured.top} is above the scroll box ${measured.boxTop}`;
              if (measured.bottom > measured.stackTop + 0.5) return `card bottom ${measured.bottom} is under the stack (top ${measured.stackTop})`;
              return 'ok';
            })
            .toBe('ok');
          await expect(tip).toBeInViewport({ ratio: 1 });
          await shot(page, `next-in-view-partial-${speaking ? 'bar' : 'nobar'}-${phone.name}-${percent}`);
        });
      }

      test('Reading drill (a sheet): after a word is read Next word is in view', async ({ page }) => {
        await page.clock.install();
        const fake = makeFakePostern();
        fake.autoReply = { status: 'answered', answer: OU_WORD_ANSWER };
        await routePostern(page, fake);
        await honestMic(page);
        await openWithTextSize(page, '', percent);
        await page.getByRole('button', { name: 'Greek', exact: true }).click();
        await chooseAction(page, 28, 'Read it aloud');
        const panel = page.getByRole('region', { name: 'Reading check' });
        const bar = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });
        await holdFor(page, bar, 2800);
        await expect(panel).toContainText('Words to fix');
        await holdFor(page, bar, 2800);
        await panel.getByRole('button', { name: 'Drill this sound', exact: true }).click();
        const drill = page.getByRole('dialog', { name: 'Reading drill' });
        await drill.getByRole('button', { name: 'Start the drill', exact: true }).click();
        // the answer with a word to fix is the tallest card the drill draws
        await expect(drill).toContainText('Word 1 of 5');
        await holdFor(page, drill.getByRole('button', { name: /^Hold to read / }), 2800);
        await expect(drill).toContainText('Words to fix');
        await expectInView(page, drill.getByRole('button', { name: 'Next word', exact: true }), 'Reading drill: Next word');
        await shot(page, `next-in-view-reading-drill-${phone.name}-${percent}`);
      });
    });
  }
}

test('Drill it opens from the idea sheet even when its examples are slow to load (the slider waits, then End slides it)', async ({ page }) => {
  await page.setViewportSize(PHONES[0].size);
  await openUnlocked(page);
  const release = await openIdeaSheet(page, 100, true);
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByTestId('idea-loading')).toBeVisible();
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeDisabled();
  setTimeout(release, 1500);
  await slideToKnowIt(page);
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
});
