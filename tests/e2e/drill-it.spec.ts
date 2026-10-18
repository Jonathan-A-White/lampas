import { expect, test, type Page } from '@playwright/test';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { SETTLE_MS } from '../../src/ui/settle';
import { openUnlocked } from './unlocked';

// Drill it on the idea sheet (mw-i7xe0n.3): the level slider, the question and its answers all stand inside the screen, upright (390x844) and sideways (844x390).
// tapTwice (tests/support/gesture.ts) times the two taps on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const VIEWPORTS = [
  { name: 'upright', size: { width: 390, height: 844 } },
  { name: 'sideways', size: { width: 844, height: 390 } },
];

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

/** Every box is inside the screen: nothing is cut off at the right or the bottom, and nothing starts above or left of it. */
async function expectInside(size: { width: number; height: number }, locators: ReturnType<Page['locator']>[]) {
  for (const locator of locators) {
    const box = await locator.boundingBox();
    expect(box, String(locator)).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-0.5);
    expect(box!.y).toBeGreaterThanOrEqual(-0.5);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 0.5);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 0.5);
  }
}

for (const { name, size } of VIEWPORTS) {
  test(`Drill it on The noun fits the screen ${name}: the slider, the question and its answers`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
    // what The noun builds on (mw-5r3p30.234: the breathings and the iota under a letter as well as the accents)
    await put(page, 'grammarLevels', ['breathings', 'accents', 'iota-subscript'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })));
    await page.goto('/#/goal');
    // the app reads what was put in its store behind its back only when it starts
    await page.reload();
    await page.getByTestId('ideas-bar').click();
    await page.getByTestId('ideas-list').getByRole('button', { name: 'The noun', exact: true }).click();

    const idea = page.getByRole('dialog', { name: 'Idea' });
    await expect(idea.getByRole('heading', { name: 'The noun' })).toBeVisible();
    await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
    const slider = idea.getByRole('slider', { name: 'Your level' });
    await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
    expect((await slider.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    await expectInside(size, [slider, idea.getByTestId('level-stops'), idea.getByRole('button', { name: 'Drill it', exact: true })]);

    // the thumb: sliding to I know it starts Drill it
    await slider.focus();
    await page.keyboard.press('End');
    const drill = page.getByRole('dialog', { name: 'Drill it' });
    await expect(drill.getByTestId('drill-step')).toHaveText(/^Step 1 of \d+$/);
    await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
    const options = drill.locator('[data-option]');
    expect(await options.count()).toBeGreaterThanOrEqual(2);
    await expectInside(size, [
      drill.getByRole('heading', { name: 'The noun' }),
      drill.getByTestId('grammar-prompt'),
      ...(await options.all()),
      drill.getByRole('button', { name: 'Hint', exact: true }),
      drill.getByRole('button', { name: 'Stop', exact: true }),
    ]);
    const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(fits.w).toBeLessThanOrEqual(fits.c);

    // a Hint takes answers away; an answer shows Next, which also stands inside the screen
    await drill.getByRole('button', { name: 'Hint', exact: true }).click();
    const taken = drill.locator('[data-option][data-taken]');
    expect(await taken.count()).toBeGreaterThan(0);
    for (const option of await taken.all()) {
      await expect(option).toHaveCSS('text-decoration-line', 'line-through');
      await expect(option).toHaveCSS('opacity', '0.4');
    }
    await expect(drill.getByTestId('hint-line')).toHaveText(`Hint: ${await taken.count()} wrong ${(await taken.count()) === 1 ? 'answer' : 'answers'} taken away`);
    await expect(drill.getByRole('button', { name: 'Hint used', exact: true })).toBeDisabled();
    await drill.locator('[data-option]:not(:disabled)').first().click();
    const nextButton = drill.getByTestId('drill-next');
    await expectInside(size, [nextButton, drill.getByTestId('feedback')]);
    if (name === 'upright') await shot(page, 'drill-it');

    // Stop leaves the idea where it was
    await drill.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(drill).toHaveCount(0);
    await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
  });
}

/** An idea sheet (The noun unless named) at phone width, with a new card ignoring taps for its moment (src/ui/settle.ts) as on his phone: openUnlocked turns that moment off. */
async function openIdea(page: Page, name = 'The noun') {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  // init scripts run in order: this one puts the moment back after openUnlocked's '0'
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'grammarLevels', ['breathings', 'accents', 'iota-subscript'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })));
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name, exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  return idea;
}

/** Drill it, from the idea sheet: a new walk, on its first question. He taps it after the moment a sheet that opens or closes swallows taps for
 * (src/ui/tapGuard.ts, mw-i7xe0n.26). */
async function startDrill(page: Page, idea: ReturnType<Page['locator']>) {
  await page.waitForTimeout(SETTLE_MS + 100);
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
  return drill;
}

/** He reads the question, then answers it with the first answer left: right or wrong, it is a choice he made. */
async function answerOne(page: Page, drill: ReturnType<Page['locator']>) {
  await page.waitForTimeout(SETTLE_MS + 100);
  await drill.locator('[data-option]:not(:disabled)').first().click();
  await expect(drill.getByTestId('drill-next')).toBeVisible();
}


// The Tester (mw-5r3p30.430): a double tap on Next gave the next question a Hint he never tapped, because Hint stands where Next was.
// Each gap is a new walk, so a miss can never end it before the next question: one answer at step 1 always leads to a second question.
// 300 ms is the moment itself (SETTLE_MS): a second tap that close to it races the browser's own delay, so the gaps stop short of it.
test('a double tap on Next takes no answers away from the next question', async ({ page }) => {
  const idea = await openIdea(page);
  for (const gap of [80, 120, 200]) {
    const drill = await startDrill(page, idea);
    await answerOne(page, drill);
    // two taps on the same spot `gap` ms apart on the page's clock, as a thumb's double tap: the second lands on whatever now stands there
    await tapTwice(page, drill.getByTestId('drill-next'), gap);
    await expect(drill.getByTestId('drill-next'), `${gap} ms`).toHaveCount(0);
    await expect(drill.getByTestId('drill-result'), `${gap} ms`).toHaveCount(0);
    // the next question is up, unanswered, with nothing taken away
    await expect(drill.locator('[data-option]').first(), `${gap} ms`).toBeVisible();
    await expect(drill.locator('[data-option][data-result]'), `${gap} ms`).toHaveCount(0);
    await expect(drill.getByTestId('hint-line'), `${gap} ms`).toHaveCount(0);
    await expect(drill.locator('[data-option][data-taken]'), `${gap} ms`).toHaveCount(0);
    await expect(drill.getByRole('button', { name: 'Hint', exact: true }), `${gap} ms`).toBeEnabled();
    if (gap === 200) {
      // a Hint he taps after reading the question still takes answers away
      await page.waitForTimeout(SETTLE_MS + 100);
      await drill.getByRole('button', { name: 'Hint', exact: true }).click();
      await expect(drill.getByTestId('hint-line')).toBeVisible();
      await expect(drill.getByRole('button', { name: 'Hint used', exact: true })).toBeDisabled();
    }
    await drill.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(drill).toHaveCount(0);
  }
});

// The sweep (mw-5r3p30.430): Done stands where Finish was, so a double tap on Finish closed the result before he could read it.
test('a double tap on Finish leaves the result of Drill it on screen', async ({ page }) => {
  const drill = await startDrill(page, await openIdea(page));
  await answerToFinish(page, drill);
  await tapTwice(page, drill.getByTestId('drill-next'), 120);
  await expect(drill.getByTestId('drill-result')).toBeVisible();
  await expect(drill.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  // a Done he taps after reading it closes the screen
  await page.waitForTimeout(SETTLE_MS + 100);
  await drill.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(drill).toHaveCount(0);
});

/** He answers until the last question of the walk shows Finish. */
async function answerToFinish(page: Page, drill: ReturnType<Page['locator']>) {
  for (;;) {
    await answerOne(page, drill);
    if ((await drill.getByTestId('drill-next').textContent()) === 'Finish') return;
    await drill.getByTestId('drill-next').click();
  }
}

// The sweep (mw-5r3p30.430): in a short drill of Your drill plan, Done stands where Finish was.
test('a double tap on Finish leaves the result of a short drill on screen', async ({ page }) => {
  const idea = await openIdea(page);
  // a run that proves the idea makes no plan: run again until one does not (his answers are the first left, so most runs miss)
  let plan = idea.getByRole('button', { name: 'Start the first drill' });
  for (let run = 0; run < 5 && !(await plan.count()); run += 1) {
    if (run > 0) {
      await page.waitForTimeout(SETTLE_MS + 100);
      await page.getByRole('dialog', { name: 'Drill it' }).getByRole('button', { name: 'Done', exact: true }).click();
    }
    const drill = await startDrill(page, idea);
    await answerToFinish(page, drill);
    await drill.getByTestId('drill-next').click();
    await expect(drill.getByTestId('drill-result')).toBeVisible();
    plan = drill.getByRole('button', { name: 'Start the first drill' });
  }
  await plan.click();
  const short = page.getByRole('dialog', { name: 'Short drill' });
  for (;;) {
    await page.waitForTimeout(SETTLE_MS + 100);
    await short.locator('[data-option]').first().click();
    if ((await short.getByTestId('plan-drill-next').textContent()) === 'Finish') break;
    await short.getByTestId('plan-drill-next').click();
  }
  await tapTwice(page, short.getByTestId('plan-drill-next'), 120);
  await expect(short.getByTestId('plan-drill-result')).toBeVisible();
  await page.waitForTimeout(SETTLE_MS + 100);
  await short.getByTestId('plan-drill-done').click();
  await expect(short).toHaveCount(0);
});

// The sweep (mw-5r3p30.430): in the letter drill, Done stands where Finish the round was, so a double tap on it ended the sitting unread.
test('a double tap on Finish the round leaves the round result of the letter drill on screen', async ({ page }) => {
  const idea = await openIdea(page, 'The Greek alphabet');
  // Learning on The Greek alphabet opens the letter drill; the slider is disabled until the sheet has found its examples, and a disabled control takes no focus or key (mw-5r3p30.567)
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await idea.getByRole('slider', { name: 'Your level' }).focus();
  await page.keyboard.press('ArrowRight');
  const drill = page.getByRole('dialog', { name: 'Letter drill' });
  for (;;) {
    await page.waitForTimeout(SETTLE_MS + 100);
    // a phone that can hear him is asked Say it as the third question (mw-86e9r1.12): it has no answers to tap, so he skips it, which costs him nothing
    const skip = drill.getByRole('button', { name: 'Skip this one' });
    if (await skip.count()) {
      await skip.click();
      continue;
    }
    await drill.locator('[data-option]').first().click();
    if ((await drill.getByTestId('letter-next').textContent()) === 'Finish the round') break;
    await drill.getByTestId('letter-next').click();
  }
  await tapTwice(page, drill.getByTestId('letter-next'), 120);
  await expect(drill.getByTestId('letter-round-result')).toBeVisible();
  await expect(drill.getByTestId('letter-drill-step')).toHaveText('Round 1 done');
  // after reading it, Another round starts the next
  await page.waitForTimeout(SETTLE_MS + 100);
  await drill.getByRole('button', { name: 'Another round', exact: true }).click();
  await expect(drill.getByTestId('letter-drill-step')).toHaveText(/^Round 2 · Question 1 of \d+$/);
});
