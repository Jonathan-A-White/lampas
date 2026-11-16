// The 'Study this' row under a wrong answer (mw-indx1x6.6) at 390x844: the ending card of ἁμαρτία (accusative plural, 1 John 1) answered wrong in Review shows the row under the answer with a
// link to the table, the lesson and the word, each a full-width button clear of the floating ?, and Next still in view; the table link opens Noun endings on This word with the asked cell lit
// and reading ἁμαρτίας, and Back returns to the card and its row. See the table is not drawn beside the row: the row's table link is the same place.
// The lesson over a drill (mw-indx1x6.57, from the Tester's mw-indx1x6.59): opened from the row in a Drill it, the idea sheet has no Drill it, no level slider and no Mark known
// without a drill, so a second drill cannot open over the first; it has no foot, its text ends clear of the phone's bar, and Done returns to the question he missed.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

test.use({ viewport: { width: 390, height: 844 } });

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'reviews' | 'settings' | 'grammarLevels', rows: object[]) {
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

/**
 * Opens Review with one row due and starts its round. The seed of tests/e2e/see-table-this-word.spec.ts: with Case: accusative due and Noun endings open the round's first question is
 * "Fill in the ending: accusative plural of ἁμαρτία" from 1 John 1; with the table Noun endings itself due it asks cells of that table.
 */
async function startRound(page: Page, due: { kind: 'grammar' | 'paradigm'; id: string }): Promise<void> {
  await openUnlocked(page);
  await page.addInitScript(() => {
    Math.random = () => 7 / 2 ** 32;
  });
  await page.goto('/');
  await waitForDue(page);
  await put(page, 'settings', [
    { key: 'goal', value: '1 John 1' },
    { key: 'paradigmsOpened', value: JSON.stringify(['noun-endings']) },
  ]);
  await put(page, 'reviews', [{ ...due, step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  await put(
    page,
    'grammarLevels',
    ['noun', 'case-accusative', 'number-plural', 'gender-feminine'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' })),
  );
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('grammar-prompt')).toBeVisible();
}

const ENDING_ASKED = 'Fill in the ending: accusative plural of ἁμαρτία';

test('a wrong ending in Review shows Study this under the answer, clear of the tutor button, and its table link opens the asked cell', async ({ page }) => {
  await startRound(page, { kind: 'grammar', id: 'case-accusative' });

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveText(ENDING_ASKED);
  const row = page.getByRole('group', { name: 'Study this', exact: true });
  await expect(row).toHaveCount(0);
  // any ending but the right one (ίας)
  await page.locator('[data-option]').filter({ hasNotText: /^ίας$/ }).first().click();
  await expect(page.getByTestId('feedback')).toContainText('Not quite.');

  await expect(row).toBeVisible();
  const links = row.getByRole('button');
  await expect(links).toHaveText(['Table: Noun endings', /^Lesson: /, 'Word: ἁμαρτία']);
  await expect(page.getByTestId('see-table')).toHaveCount(0);
  // every link is a thumb's height, inside the screen, and ends before the floating ? begins
  const door = await page.locator('[data-floating-tutor]').boundingBox();
  for (const link of await links.all()) {
    const box = (await link.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(door ? door.x : 390);
  }
  // what next is never below the fold: Next stays in view with the row drawn
  await expect(page.getByTestId('next')).toBeInViewport();
  await shot(page, 'study-this-review');

  await links.first().click();
  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toBeVisible();
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toHaveText('ἁμαρτίας');
  await expect(lit).toHaveAttribute('data-cell', /accusative plural/i);
  await expect(lit).toBeInViewport();

  await page.goBack();
  await expect(prompt).toHaveText(ENDING_ASKED);
  await expect(row).toBeVisible();

  // the word's card opens over the question and closes back to it
  await row.getByRole('button', { name: 'Word: ἁμαρτία' }).click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-word')).toHaveText('ἁμαρτία');
  await expect(sheet.getByTestId('sheet-word')).toBeInViewport();
  await shot(page, 'study-this-word');
});

// Back from a page a sheet over Review opened (mw-indx1x6.56): the lesson's own Table link leaves Review as the row's does, and Back is the question he missed with its row,
// not the next question of the round. The table Noun endings is due, so the miss is a cell of it and its lesson (The first declension) has the link 'Table: Noun endings'.
test("Back from the lesson's Table link in Review is the question he missed, with its Study this row", async ({ page }) => {
  await startRound(page, { kind: 'paradigm', id: 'noun-endings' });
  const asked = 'Noun endings: first declension, feminine in η (φωνή), accusative plural';
  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveText(asked);
  // a round of more than one question: the next one is there to land on
  await expect(page.getByText('1 of 11', { exact: true })).toBeVisible();

  // any ending but the right one (-ας)
  await page.locator('[data-option]').filter({ hasNotText: /^-ας$/ }).first().click();
  const feedback = page.getByTestId('feedback');
  await expect(feedback).toContainText('Not quite. It is -ας.');
  const row = page.getByRole('group', { name: 'Study this', exact: true });
  await expect(row.getByRole('button')).toHaveText(['Table: Noun endings', 'Lesson: The first declension']);

  await row.getByRole('button', { name: 'Lesson: The first declension' }).click();
  const lesson = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(lesson.getByRole('heading', { name: 'The first declension' })).toBeVisible();
  await expect(lesson.getByTestId('idea-loading')).toHaveCount(0);
  await lesson.getByRole('button', { name: 'Table: Noun endings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toBeVisible();
  await expect(prompt).toHaveCount(0);

  await page.goBack();
  // Review is where he stood: the question he missed, his answer and its row, not question 2
  await expect(prompt).toHaveText(asked);
  await expect(page.getByText('1 of 11', { exact: true })).toBeVisible();
  await expect(page.getByText('2 of 11', { exact: true })).toHaveCount(0);
  await expect(feedback).toContainText('Not quite. It is -ας.');
  await expect(row.getByRole('button')).toHaveText(['Table: Noun endings', 'Lesson: The first declension']);
  // the lesson he left for the table comes back over the question (src/ideaReturn.ts), and Done closes it on the row
  await expect(lesson.getByRole('heading', { name: 'The first declension' })).toBeVisible();
  await lesson.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(lesson).toHaveCount(0);
  await expect(row).toBeInViewport();
  await expect(page.getByTestId('next')).toBeInViewport();
  await shot(page, 'study-this-review-back-from-lesson-table');

  // Next goes on from there: the question he missed is not asked twice
  await page.getByTestId('next').click();
  await expect(page.getByText('2 of 11', { exact: true })).toBeVisible();
  await expect(row).toHaveCount(0);
});

test('the lesson over a drill has no Drill it, no level slider and no Mark known without a drill', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 2' }]);
  // what The noun builds on, so its sheet offers Drill it at once
  await put(
    page,
    'grammarLevels',
    ['breathings', 'accents', 'iota-subscript'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })),
  );
  await page.goto('/#/goal');
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The noun', exact: true }).click();

  // the idea sheet on a plain screen: the slider, Mark known and Drill it are all there
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByRole('heading', { name: 'The noun' })).toBeVisible();
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeVisible();
  await expect(idea.getByRole('button', { name: 'Mark known without a drill', exact: true })).toBeVisible();
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Drill it', exact: true });
  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();

  // he answers with the first answer until one is wrong: the row is under a wrong answer only
  const row = drill.getByRole('group', { name: 'Study this', exact: true });
  for (let asked = 0; asked < 12; asked += 1) {
    await drill.locator('[data-option]:not(:disabled)').first().click();
    await expect(drill.getByTestId('drill-next')).toBeVisible();
    if (await row.isVisible()) break;
    await drill.getByTestId('drill-next').click();
  }
  await expect(row).toBeVisible();
  const missed = await drill.getByTestId('grammar-prompt').textContent();

  await row.getByRole('button', { name: /^Lesson: / }).click();
  // the lesson is drawn inside the drill's own layer, over it
  const lesson = drill.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(lesson.getByRole('heading', { level: 2 }).first()).toBeVisible();
  await expect(lesson.getByTestId('idea-loading')).toHaveCount(0);
  await expect(lesson.getByText('Worked example')).toHaveCount(1);
  await expect(lesson.getByRole('button', { name: 'Drill it', exact: true })).toHaveCount(0);
  await expect(lesson.getByRole('slider', { name: 'Your level' })).toHaveCount(0);
  await expect(lesson.getByTestId('level-slider')).toHaveCount(0);
  await expect(lesson.getByRole('button', { name: 'Mark known without a drill', exact: true })).toHaveCount(0);
  await expect(lesson.getByRole('button', { name: 'Try it on a verse', exact: true })).toHaveCount(0);
  // one drill, the one he is in
  await expect(page.getByRole('dialog', { name: 'Drill it', exact: true })).toHaveCount(1);
  // with no foot the sheet still stands inside the screen, and its Done is in reach
  const box = (await lesson.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844.5);
  await expect(lesson.getByRole('button', { name: 'Done', exact: true })).toBeInViewport();

  // on its side the sheet with no foot is one column: the text takes the width the slider's column would have had (18rem of 844)
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await lesson.getByTestId('idea-what').boundingBox())?.width ?? 0).toBeGreaterThan(700);
  await expect(lesson.getByRole('button', { name: 'Done', exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });

  // Done returns to the question he missed, its row still there
  await lesson.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(lesson).toHaveCount(0);
  await expect(drill.getByTestId('grammar-prompt')).toHaveText(missed ?? '');
  await expect(row).toBeVisible();

  // and the lesson opens again from the row, as it was
  await row.getByRole('button', { name: /^Lesson: / }).click();
  await expect(lesson.getByText('Worked example')).toHaveCount(1);
  await expect(lesson.getByRole('slider', { name: 'Your level' })).toHaveCount(0);
  await shot(page, 'study-this-lesson-over-drill');
});
