// The results of a drill carry the round Ask the tutor button (mw-5r3p30.649): at the right end of the foot beside Done, inside the phone and over nothing; a tap opens the tutor with the
// drill as its subject, its first suggested question is about the misses, and the request the mill receives holds every question of the run: the idea, what was asked, his answer, the
// right answer and right or wrong. Ends with a shot of the results with the button and of the sheet.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const CONTROL = 'Ask the tutor about this screen';

// A walk's questions follow from its seed (src/data/grammar/drillSeed.ts) and its answers, so a fixed Math.random gives the same questions each time he opens Drill it:
// the spec learns what is right by answering, then walks the same path with the answers it wants.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.37;
  });
});

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
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

/** The idea sheet of The noun, from the Goal screen. */
async function openIdea(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'grammarLevels', ['breathings', 'accents', 'iota-subscript'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })));
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The noun', exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  return idea;
}

const drillOf = (page: Page): Locator => page.getByRole('dialog', { name: 'Drill it', exact: true });

async function startDrill(page: Page, idea: Locator): Promise<Locator> {
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = drillOf(page);
  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
  return drill;
}

/** What the question asked and the answers it gave to choose from, as the screen shows them. */
async function questionOf(drill: Locator): Promise<{ prompt: string; options: string[] }> {
  const prompt = ((await drill.getByTestId('grammar-prompt').textContent()) ?? '').trim();
  const options = (await drill.locator('[data-option]').allTextContents()).map((t) => t.trim());
  return { prompt, options };
}

/** He taps the option `choose` names; the screen then shows which answer was right. */
async function answer(drill: Locator, choose: (options: string[]) => string): Promise<{ prompt: string; picked: string; right: string }> {
  const { prompt, options } = await questionOf(drill);
  const picked = choose(options);
  await drill.locator('[data-option]', { hasText: picked }).first().click();
  await expect(drill.getByTestId('drill-next')).toBeVisible();
  const right = ((await drill.locator('[data-option][data-result="right"]').textContent()) ?? '').trim();
  return { prompt, picked, right };
}

const next = (drill: Locator) => drill.getByTestId('drill-next').click();
const stop = async (page: Page, drill: Locator) => {
  await drill.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(drillOf(page)).toHaveCount(0);
};

test('the results of a drill have the Ask the tutor button, and the tutor is given the questions, his answers and which were wrong', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  const idea = await openIdea(page);

  // right, wrong, right: a miss at step 2 sends the walk back to step 1, and a right there ends it with the edge at step 1 and one miss in the run.
  // The right answers are learned by answering: the same walk is the same questions.
  let drill = await startDrill(page, idea);
  const first = await answer(drill, (options) => options[0]);
  await stop(page, drill);

  drill = await startDrill(page, idea);
  await answer(drill, () => first.right);
  await next(drill);
  const second = await answer(drill, (options) => options[0]);
  await stop(page, drill);

  drill = await startDrill(page, idea);
  await answer(drill, () => first.right);
  await next(drill);
  const miss = await answer(drill, (options) => options.find((o) => o !== second.right)!);
  await next(drill);
  const third = await answer(drill, (options) => options[0]);
  await stop(page, drill);

  // the run itself
  drill = await startDrill(page, idea);
  const asked = [await answer(drill, () => first.right)];
  await next(drill);
  asked.push(await answer(drill, (options) => options.find((o) => o !== second.right)!));
  await next(drill);
  asked.push(await answer(drill, () => third.right));
  expect(asked.map((a) => a.picked === a.right)).toEqual([true, false, true]);
  expect(asked[1].picked).toBe(miss.picked);
  await expect(drill.getByTestId('drill-next')).toHaveText('Finish');

  // no button while the questions are asked; on the results it stands in the foot's right end, beside Done
  await expect(drill.getByRole('button', { name: CONTROL })).toHaveCount(0);
  await next(drill);
  await expect(drill.getByTestId('drill-result')).toBeVisible();
  const control = drill.getByRole('button', { name: CONTROL });
  await expect(control).toBeVisible();
  const box = (await control.boundingBox())!;
  const done = (await drill.getByRole('button', { name: 'Done', exact: true }).boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(box.x, 'the button is beside Done, not over it').toBeGreaterThanOrEqual(done.x + done.width - 0.5);
  const foot = (await drill.locator('[data-ask-beside]').boundingBox())!;
  expect(box.y, 'the button is inside the foot, not over the results').toBeGreaterThanOrEqual(foot.y - 0.5);
  expect(done.height).toBeGreaterThanOrEqual(47.5);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(wide).toBe(true);
  await shot(page, 'drill-results-ask-tutor');

  // a tap opens the tutor with the drill as its subject; its first question is about the misses
  await control.click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Drill it', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-suggestion]').first()).toHaveText('Why did I get these wrong?');
  await shot(page, 'drill-results-tutor-sheet');
  await sheet.locator('[data-suggestion]').first().click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);

  // the request the mill received holds every question: the idea, what was asked, his answer, the right answer and right or wrong
  expect(fake.received).toHaveLength(1);
  const input = fake.received[0].input as { reference: string; question: string; screen: { name: string; facts: { label: string; value: string }[]; drill: Record<string, unknown>[] } };
  expect(input.reference).toBe('Drill it');
  expect(input.question).toBe('Why did I get these wrong?');
  expect(input.screen.name).toBe('Drill it');
  expect(input.screen.facts).toContainEqual({ label: 'Idea', value: 'The noun' });
  expect(input.screen.drill).toHaveLength(3);
  input.screen.drill.forEach((got, i) => {
    expect(typeof got.idea, `question ${i + 1}: the idea`).toBe('string');
    expect(String(got.asked), `question ${i + 1}: what was asked`).toContain(asked[i].prompt.slice(0, 20));
    expect(got.answer, `question ${i + 1}: his answer`).toBe(asked[i].picked.slice(0, 40));
    expect(got.right_answer, `question ${i + 1}: the right answer`).toBe(asked[i].right.slice(0, 40));
    expect(got.right, `question ${i + 1}: right or wrong`).toBe(asked[i].picked === asked[i].right);
  });
  expect(input.screen.drill.filter((d) => d.right === false)).toHaveLength(1);
});
