// A lesson has an Ask the tutor (mw-5r3p30.818): the idea sheet (Enclitics: the worked example μου in 1 John 2:1) opened from the Goal screen carries it among its buttons, a tap opens the tutor
// over the sheet with the lesson as its subject, a question typed there reaches the mill with the lesson's id, title, worked example and steps, and Back brings him to the sheet as he left it.
// Ends with a shot of the sheet's foot and of the tutor over it.
import { expect, test, type Page } from '@playwright/test';
import { openTutor } from './open-tutor';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const QUESTION = 'Why has μου no accent?';

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
async function put(page: Page, store: 'settings', rows: object[]) {
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

test('the idea sheet has Ask the tutor; the question reaches the mill with the lesson, and Back returns to the sheet where he was', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 2:1' }]);
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'Enclitics', exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await expect(idea.getByTestId('worked-word')).toHaveText('μου');

  // he reads down to the worked example, then asks: the button is among the sheet's own, in reach
  const text = idea.locator('div.min-h-0.overflow-y-auto').first();
  await idea.getByTestId('idea-worked').scrollIntoViewIfNeeded();
  const scrolled = await text.evaluate((el) => el.scrollTop);
  const ask = idea.getByRole('button', { name: 'Ask the tutor', exact: true });
  await expect(ask).toBeVisible();
  const box = (await ask.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(47.5);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await shot(page, 'idea-ask-tutor');

  await openTutor(page, { sheet: 'Ask the tutor: Lesson' });
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Lesson', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-suggestion]')).toHaveCount(2);
  const field = await talkField(sheet);
  await field.fill(QUESTION);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  await shot(page, 'idea-ask-tutor-sheet');

  // the mill received the lesson: its id and title, the worked word and verse, the steps
  expect(fake.received).toHaveLength(1);
  const input = fake.received[0].input as { reference: string; question: string; greek?: string; screen: { name: string; facts: { label: string; value: string }[] } };
  expect(input.reference).toBe('Lesson');
  expect(input.question).toBe(QUESTION);
  expect(input.greek).toBeUndefined();
  const fact = (label: string) => input.screen.facts.find((f) => f.label === label)?.value;
  expect(input.screen.name).toBe('Lesson');
  expect(fact('Lesson id')).toBe('enclitics');
  expect(fact('Lesson')).toBe('Enclitics');
  expect(fact('Worked example')).toContain('μου');
  expect(fact('Worked example')).toContain('1 John 2:1');
  expect(fact('Steps shown')).toContain('μου has no accent: it is an enclitic.');
  expect(new TextEncoder().encode(JSON.stringify(fake.received[0].input)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);

  // Back closes the tutor and leaves the sheet as it was, at the same place in its text
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(idea).toBeVisible();
  await expect(idea.getByTestId('worked-word')).toHaveText('μου');
  expect(await text.evaluate((el) => el.scrollTop)).toBe(scrolled);
});
