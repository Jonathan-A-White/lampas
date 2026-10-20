import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { dueOnToday, reviewPiece, todayChip, waitForDue } from './today-chip';

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

test('the Reader shows the Today chip, Today shows Review with N due and opens it; a round ends with what comes back tomorrow', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  const badge = todayChip(page);
  await expect(badge).toBeVisible();
  expect((await badge.boundingBox())?.height).toBeGreaterThanOrEqual(38);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Due: / })).toHaveCount(0);
  await expectFitsPhone(page);

  // his learning words are due on the first open
  const due = await dueOnToday(page);
  await reviewPiece(page).getByRole('button', { name: new RegExp(`^${due} due`) }).click();
  await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByTestId('due-today')).toHaveText(`Due today: ${due} ${due === 1 ? 'word' : 'words'}`);
  const start = page.getByRole('button', { name: 'Start', exact: true });
  expect((await start.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  await start.click();
  await expect(page.getByTestId('prompt')).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    // a strong word (his solid words start on step 4) comes as a flashcard, a weak one as multiple choice
    const show = page.getByRole('button', { name: 'Show', exact: true });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: 'I knew it' }).click();
    } else {
      await page.locator('[data-option]').first().click();
    }
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('score')).toHaveText(/^\d+ of 10$/);
  await expect(page.getByTestId('comes-back')).toHaveText(/^\d+ comes? back tomorrow, \d+ later$/);
  const back = page.getByRole('button', { name: 'Back to reading' });
  await expect(back).toBeVisible();
  const box = await back.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  await expectFitsPhone(page);

  await shot(page, 'review');
});

test('the Today chip fits the Reader at 360 px and leaves the header as it was', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await openUnlocked(page);
  await page.goto('/');
  const badge = todayChip(page);
  await expect(badge).toBeVisible();
  const box = await badge.boundingBox();
  expect(box && box.x + box.width).toBeLessThanOrEqual(360);
  expect(box?.height).toBeGreaterThanOrEqual(38);
  // the chip sits under the header, so the header's own buttons keep their room
  expect((await page.getByRole('button', { name: 'Settings', exact: true }).boundingBox())?.width).toBeGreaterThanOrEqual(48);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expectFitsPhone(page);
  await context.close();
});

test('Review is reached from Settings and a reload keeps him on it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
});

// Every due word on step 3 or higher is asked as a flashcard: seed the schedule through raw IndexedDB, as the app wrote it.
async function makeAllDueStrong(page: Page) {
  await page.goto('/');
  await waitForDue(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('reviews', 'readwrite');
          const store = tx.objectStore('reviews');
          const all = store.getAll();
          all.onsuccess = () => {
            for (const row of all.result) store.put({ ...row, step: 3, due: Date.now() - 60_000 });
          };
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('a strong word is a flashcard: the lemma large, Show reveals the meaning, then I knew it / Not yet', async ({ page }) => {
  await openUnlocked(page);
  await makeAllDueStrong(page);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const prompt = page.getByTestId('prompt');
  await expect(prompt).toBeVisible();
  await expect(page.locator('[data-option]')).toHaveCount(0);
  const lemma = await prompt.getAttribute('data-lemma');
  expect(await prompt.textContent()).toBe(lemma);
  expect((await prompt.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  const bar = page.getByTestId('tap-to-hear');
  expect((await bar.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  const show = page.getByRole('button', { name: 'Show', exact: true });
  expect((await show.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await expect(page.getByTestId('flash-gloss')).toHaveText('');
  await expect(page.getByTestId('picture')).toHaveCount(0);
  await expectFitsPhone(page);
  await shot(page, 'flashcard');

  await show.click();
  await expect(page.getByTestId('flash-gloss')).not.toHaveText('');
  for (const name of ['I knew it', 'Not yet']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
    expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  }
  await expectFitsPhone(page);
  await shot(page, 'flashcard-shown');

  await page.getByRole('button', { name: 'I knew it' }).click();
  await expect(page.getByTestId('next')).toBeVisible();
  await expectFitsPhone(page);
});

// A box overlaps another when they share any area.
type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('the end card labels its score, so it is not read as the question counter', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('prompt')).toBeVisible();
  // in the round the counter under the title is a bare 'N of 10' with no label
  await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText('1 of 10', { exact: true })).toBeVisible();
  await expect(page.getByTestId('score-label')).toHaveCount(0);
  for (let i = 0; i < 10; i += 1) {
    const show = page.getByRole('button', { name: 'Show', exact: true });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: 'I knew it' }).click();
    } else {
      await page.locator('[data-option]').first().click();
    }
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('score')).toHaveText(/^\d+ of 10$/);
  const label = page.getByTestId('score-label');
  await expect(label).toBeVisible();
  await expect(label).toHaveText(/score|right/i);
  // the label sits right above the number
  const [labelBox, scoreBox] = [await label.boundingBox(), await page.getByTestId('score').boundingBox()];
  expect(labelBox && scoreBox && labelBox.y + labelBox.height <= scoreBox.y + 1).toBe(true);
});

test('sideways (844x390) the round Ask button keeps clear of every answer option', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  await openUnlocked(page);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('prompt')).toBeVisible();
  const ask = page.locator('[data-ask-tutor]');
  await expect(ask).toBeVisible();
  let checked = 0;
  for (let i = 0; i < 10; i += 1) {
    const show = page.getByRole('button', { name: 'Show', exact: true });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: 'I knew it' }).click();
    } else {
      // the options scroll: bring each into view, then measure it against the (fixed) button
      const options = page.locator('[data-option]');
      const askBox = await ask.boundingBox();
      for (let o = 0; o < (await options.count()); o += 1) {
        await options.nth(o).scrollIntoViewIfNeeded();
        const box = await options.nth(o).boundingBox();
        expect(box && askBox && !overlaps(box, askBox)).toBe(true);
        checked += 1;
      }
      await options.first().click();
    }
    await page.getByTestId('next').click();
  }
  expect(checked).toBeGreaterThan(0);
  await context.close();
});
