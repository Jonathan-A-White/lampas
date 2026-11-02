// tests/e2e/door-overlap.spec.ts — the floating ? does not sit over a foot button (mw-5r3p30.961, the Deputy's job 8 on 0.7.71: "in a Hard sounds lesson the round ? sits partly over the right end of the
// 'Next' button"). The ? is fixed at the Hand side's edge (src/AskTutor.tsx FloatingTutor, z-50, over everything), so a screen whose foot runs the full width must leave its room. Each case opens
// the screen at 390x844 on a licensed phone, once for each hand, scrolls the screen's box so the foot passes the ?'s height (the worst place), and compares boxes. A tap at the right (left) end of
// the button nearest the ? must reach the button, not the ?. The sibling of tutor-door.spec.ts, which mw-5r3p30.956 owns.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openCheck, openDrillIt, openShortDrill, openTryIt } from './large-text-titles';
import { FLOATING } from './open-tutor';
import { shot } from './shot';
import { keepHand } from './tutor-door';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT, hasTouch: true });

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Scrolls `box` as far as it will go toward putting `button`'s middle at the ?'s middle, the place a foot button is most likely to be under it. */
async function scrollToTheDoor(page: Page, box: Locator, button: Locator): Promise<void> {
  const door = (await page.locator(FLOATING).boundingBox())!;
  const at = (await button.boundingBox())!;
  const delta = at.y + at.height / 2 - (door.y + door.height / 2);
  await box.evaluate((el, by) => void (el.scrollTop += by), delta);
}

/** Asserts no foot button's box meets the ?'s, with the foot at the ?'s height. */
async function expectClear(page: Page, box: Locator, names: string[]): Promise<void> {
  for (const name of names) {
    const button = box.getByRole('button', { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    await scrollToTheDoor(page, box, button);
    const door = (await page.locator(FLOATING).boundingBox())!;
    const at = (await button.boundingBox())!;
    expect(overlaps(door, at), `the ? ${JSON.stringify(door)} is over ${name} ${JSON.stringify(at)}`).toBe(false);
  }
}

const HANDS = ['right', 'left'] as const;

for (const hand of HANDS) {
  test(`a Hard sounds lesson leaves the ? its room: the foot buttons are clear of it, ${hand}-handed, and a tap at the end nearest it reaches Next`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await keepHand(page, hand);
    await page.goto('/#/sounds?l=tapped-r&s=0');
    const lesson = page.getByTestId('sound-lesson');
    await expect(lesson.getByRole('heading', { name: 'Why it is hard for you', level: 2 })).toBeVisible();
    await expect(page.locator(FLOATING)).toBeVisible();

    // every step of the lesson: the first (Next alone), the middle (Previous and Next) and the last (Previous and Done)
    for (let step = 0; step < 7; step += 1) {
      await expect(lesson.getByTestId('sound-step')).toHaveText(`Step ${step + 1} of 7`);
      const last = step === 6;
      await expectClear(page, lesson, step === 0 ? ['Next'] : last ? ['Previous', 'Done'] : ['Previous', 'Next']);
      if (last) break;
      // a tap at Next's end nearest the ? moves on, so it was Next that was under the finger
      const next = lesson.getByRole('button', { name: 'Next', exact: true });
      await next.scrollIntoViewIfNeeded();
      await scrollToTheDoor(page, lesson, next);
      const at = (await next.boundingBox())!;
      const x = hand === 'right' ? at.x + at.width - 3 : at.x + 3;
      await page.touchscreen.tap(x, at.y + at.height / 2);
      await expect(lesson.getByTestId('sound-step')).toHaveText(`Step ${step + 2} of 7`);
    }
    await shot(page, `door-overlap-${hand}`);
  });
}

test('the Hebrew ayin lesson (the Deputy’s screen) leaves the ? clear of Next at its first step', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/sounds?l=hebrew-ayin&s=0');
  const lesson = page.getByTestId('sound-lesson');
  await expect(lesson.getByTestId('sound-step')).toHaveText(/^Step 1 of /);
  await expect(page.locator(FLOATING)).toBeVisible();
  await expectClear(page, lesson, ['Next']);
});

// ---- the answer buttons of a question card (mw-5r3p30.981): Drill it, the short drill, Check and Try it draw GrammarCard's choices in a scroll box under the ? ----

/** The scroll box a locator stands in: its nearest ancestor that scrolls in y. */
const scrollBoxOf = (inside: Locator): Locator => inside.locator('xpath=ancestor::div[contains(@class,"overflow-y-auto")][1]');

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them, and reloads so the app reads them. */
async function keepSettings(page: Page, values: Record<string, string>): Promise<void> {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
  await page.reload();
}

const CARDS = [
  { name: 'Drill it', open: (page: Page) => openDrillIt(page, 'The noun') },
  { name: 'the short drill', open: openShortDrill },
  { name: 'Check', open: openCheck },
  { name: 'Try it', open: openTryIt },
];

const CONDITIONS = [
  { name: '390x844', size: { width: 390, height: 844 }, textSize: '100' },
  { name: '360x640', size: { width: 360, height: 640 }, textSize: '100' },
  { name: '390x844, text size 160', size: { width: 390, height: 844 }, textSize: '160' },
];

const QUESTIONS = 3;

for (const { name: card, open } of CARDS) {
  for (const { name: where, size, textSize } of CONDITIONS) {
    for (const hand of HANDS) {
      test(`${card} leaves the ? its room at ${where}, ${hand}-handed: no answer button is under it and a tap at the end nearest it chooses`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize(size);
        await openUnlocked(page);
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
        await keepSettings(page, { hand, textSize });
        const screen = await open(page);
        await expect(page.locator(FLOATING)).toBeVisible();

        for (let question = 0; question < QUESTIONS; question += 1) {
          // a full parsing is steps one after the other: each step's buttons are checked, and a tap goes on or ends the question
          for (let step = 0; step < 8; step += 1) {
            const options = screen.locator('[data-option]:not(:disabled)');
            await expect(options.first()).toBeVisible();
            const box = scrollBoxOf(options.first());
            const count = await options.count();
            let nearest = { index: 0, edge: hand === 'right' ? -Infinity : Infinity };
            for (let i = 0; i < count; i += 1) {
              const button = options.nth(i);
              await button.scrollIntoViewIfNeeded();
              await scrollToTheDoor(page, box, button);
              const door = (await page.locator(FLOATING).boundingBox())!;
              const at = (await button.boundingBox())!;
              const label = (await button.textContent()) ?? '';
              expect(overlaps(door, at), `the ? ${JSON.stringify(door)} is over ${label} ${JSON.stringify(at)}`).toBe(false);
              const edge = hand === 'right' ? at.x + at.width : at.x;
              if (hand === 'right' ? edge > nearest.edge : edge < nearest.edge) nearest = { index: i, edge };
            }
            // the button that reaches furthest toward the ?, with the foot at the ?'s height, is tapped at its end nearest the ?
            const target = options.nth(nearest.index);
            const label = (await target.textContent()) ?? '';
            await target.scrollIntoViewIfNeeded();
            await scrollToTheDoor(page, box, target);
            const at = (await target.boundingBox())!;
            const before = (await screen.getByTestId('parse-step').count()) ? await screen.getByTestId('parse-step').textContent() : null;
            await page.touchscreen.tap(hand === 'right' ? at.x + at.width - 3 : at.x + 3, at.y + at.height / 2);
            await expect
              .poll(
                async () =>
                  (await screen.locator('[data-option][data-result]').count()) > 0 ||
                  (before !== null && (await screen.getByTestId('parse-step').textContent()) !== before),
                { message: `a tap at the end of ${label} nearest the ? chose it` },
              )
              .toBe(true);
            if ((await screen.locator('[data-option][data-result]').count()) > 0) break;
          }
          const next = screen.getByTestId(/-next$/);
          await expect(next).toBeVisible();
          const foot = (await next.boundingBox())!;
          expect(overlaps((await page.locator(FLOATING).boundingBox())!, foot), 'the ? is over the foot button').toBe(false);
          await next.click();
          if (!(await screen.locator('[data-option]').first().isVisible().catch(() => false))) break;
        }
        await shot(page, `door-overlap-${card.replaceAll(' ', '-')}-${where.replaceAll(/[ ,]/g, '-')}-${hand}`);
      });
    }
  }
}
