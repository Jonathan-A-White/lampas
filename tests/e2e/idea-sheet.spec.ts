import { expect, test, type Page } from '@playwright/test';
import { swipe } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

/** Puts rows in the app's settings store through raw IndexedDB, as the app wrote them. */
async function put(page: Page, rows: object[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          for (const row of list) tx.objectStore('settings').put(row);
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

test('the idea sheet of the genitive fits the phone, its slider and buttons clear their sizes, and sliding to Learning shows the level', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  const learn = page.getByRole('dialog', { name: 'Grammar', exact: true }).getByRole('button', { name: 'Learn this idea' });
  expect((await learn.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await learn.click();

  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea).toBeVisible();
  await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeVisible();
  await expect(idea.getByTestId('idea-example')).toHaveCount(3);
  // the card teaches a beginner (mw-5r3p30.234): what it is, how to spot it with its table of endings, and a worked example, all inside the phone's width
  for (const part of ['What it is', 'How to spot it', 'Worked example']) await expect(idea.getByRole('heading', { name: part, exact: true })).toBeVisible();
  const table = idea.getByTestId('idea-table');
  await expect(table).toBeVisible();
  const tableFits = await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  expect(tableFits).toBe(true);
  await expect(idea.getByTestId('worked-respelling')).toBeVisible();
  const sheet = await idea.boundingBox();
  expect((sheet?.x ?? 0) + (sheet?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((sheet?.y ?? 0) + (sheet?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  for (const name of ['Drill it', 'Ask the tutor']) {
    const box = await idea.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height, name).toBeGreaterThanOrEqual(47.5);
    expect((box?.y ?? 0) + (box?.height ?? 0), name).toBeLessThanOrEqual(VIEWPORT.height);
  }
  const markKnown = await idea.getByRole('button', { name: 'Mark known without a drill', exact: true }).boundingBox();
  expect(markKnown?.height).toBeGreaterThanOrEqual(43.5);
  const slider = await idea.getByRole('slider', { name: 'Your level' }).boundingBox();
  expect(slider?.height).toBeGreaterThanOrEqual(43.5);
  expect((slider?.y ?? 0) + (slider?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  expect(await idea.getByRole('button', { name: 'Got it', exact: true }).count()).toBe(0);
  expect(await idea.getByRole('button', { name: 'I know this', exact: true }).count()).toBe(0);
  for (const speaker of await idea.getByRole('button', { name: /^Hear / }).all()) {
    expect((await speaker.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  }
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);

  // The nominative case is not solid yet, so sliding up first asks whether to go there: Stay here goes on
  await expect(idea.getByTestId('idea-builds-on')).toContainText('This builds on The nominative case');
  // the slider is disabled until the sheet has found its examples, and a disabled control takes no focus or key (mw-5r3p30.485)
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await idea.getByRole('slider', { name: 'Your level' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Stay here', exact: true }).click();
  await expect(idea.getByTestId('idea-level')).toHaveText('Frontier since today');
  await expect(idea.getByRole('slider', { name: 'Your level' })).toHaveAttribute('aria-valuetext', 'Learning');
  await shot(page, 'idea-sheet');

  await page.reload();
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await page.getByRole('dialog', { name: 'Grammar', exact: true }).getByRole('button', { name: 'Learn this idea' }).click();
  await expect(page.getByRole('dialog', { name: 'Idea', exact: true }).getByTestId('idea-level')).toHaveText('Frontier since today');
});

test('a tap on the middle of the "Your level" track leaves the level where it was, and a drag sets it', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await page.getByRole('dialog', { name: 'Grammar', exact: true }).getByRole('button', { name: 'Learn this idea' }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  const slider = idea.getByRole('slider', { name: 'Your level' });
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
  const box = await slider.boundingBox();
  if (!box) throw new Error('the slider has no box');
  const middle = [box.x + box.width / 2, box.y + box.height / 2] as const;
  const stay = page.getByRole('button', { name: 'Stay here', exact: true });

  // a tap on the middle of the track (with a mouse, then a finger) moves nothing and asks nothing
  await page.mouse.click(middle[0], middle[1]);
  await swipe(page, middle, middle, { with: 'touch', steps: 1 });
  await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
  await expect(stay).toHaveCount(0);
  await expect(idea.getByTestId('idea-level')).toHaveCount(0);

  // a drag of the thumb to the middle sets the level and asks
  await swipe(page, [box.x + 22, middle[1]], [middle[0], middle[1]]);
  await expect(stay).toBeVisible();
  await expect(slider).toHaveAttribute('aria-valuetext', 'Learning');
  await stay.click();
  await expect(idea.getByTestId('idea-level')).toHaveText('Frontier since today');
  await shot(page, 'idea-sheet-track-tap');
});

test('Back from an idea\'s table brings its sheet back scrolled to where he tapped "Table:" (mw-svw421.39)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await put(page, [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();
  await page.getByTestId('goal-strip').click();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The aorist tense', exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByRole('heading', { name: 'The aorist tense' })).toBeVisible();
  await expect(idea.getByTestId('idea-example').first()).toBeVisible();

  // the nearest scrolling ancestor of the 'What it is' line is the sheet's text box
  const textBox = idea.getByTestId('idea-what').locator('xpath=ancestor::div[contains(@class,"overflow-y-auto")][1]');
  const table = idea.getByRole('button', { name: /^Table: Future and aorist/ });
  await table.scrollIntoViewIfNeeded();
  await expect(table).toBeInViewport({ ratio: 1 });
  expect(await textBox.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await table.click();
  await expect(page.getByRole('dialog', { name: 'Idea', exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/#\/paradigms/);

  await page.goBack();
  const back = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(back.getByRole('heading', { name: 'The aorist tense' })).toBeVisible();
  const again = back.getByRole('button', { name: /^Table: Future and aorist/ });
  await expect(again).toBeVisible();
  // its box lies inside the sheet's text box, not scrolled out of it
  await expect.poll(async () => {
    const [button, box] = await Promise.all([again.boundingBox(), back.getByTestId('idea-what').locator('xpath=ancestor::div[contains(@class,"overflow-y-auto")][1]').boundingBox()]);
    if (!button || !box) return false;
    return button.y >= box.y - 0.5 && button.y + button.height <= box.y + box.height + 0.5;
  }).toBe(true);
  await shot(page, 'idea-sheet-back-from-table');
});

test('the genitive card draws a verse as a sentence diagram under "In a diagram", the genitive lit, inside the phone\'s width; a card with none has no such part (mw-5r3p30.791)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await put(page, [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();
  await page.getByTestId('goal-strip').click();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The genitive case', exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeVisible();

  await expect(idea.getByRole('heading', { name: 'In a diagram', exact: true })).toBeVisible();
  const drawn = idea.getByTestId('idea-diagram');
  await drawn.scrollIntoViewIfNeeded();
  await expect(drawn.getByRole('img', { name: 'Sentence diagram of John 1:4, Greek' })).toBeVisible();
  for (const word of ['ζωὴ', 'φῶς', 'ἀνθρώπων']) await expect(drawn.getByRole('button', { name: word, exact: true })).toBeVisible();
  const lit = drawn.locator('button[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toHaveText('ἀνθρώπων');
  // the diagram scrolls sideways in its own box, if ever it must; the page never does
  const box = await drawn.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'idea-sheet-diagram');

  await idea.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(idea).toHaveCount(0);
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The aorist tense', exact: true }).click();
  await expect(idea.getByRole('heading', { name: 'What it is', exact: true })).toBeVisible();
  await expect(idea.getByRole('heading', { name: 'In a diagram' })).toHaveCount(0);
  await expect(idea.getByTestId('idea-diagram')).toHaveCount(0);
});

test('the verb and the preposition each draw a verse under "In a diagram", their part of speech lit, inside the phone\'s width (mw-5r3p30.792)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await put(page, [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();
  await page.getByTestId('goal-strip').click();
  await page.getByTestId('ideas-bar').click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  const cards = [
    { title: 'The verb', lit: ['ἦν'], shot: 'idea-sheet-diagram-verb' },
    { title: 'The preposition', lit: ['Ἐν', 'ἀρχῇ'], shot: 'idea-sheet-diagram-preposition' },
  ];
  for (const card of cards) {
    await page.getByTestId('ideas-list').getByRole('button', { name: card.title, exact: true }).click();
    await expect(idea.getByRole('heading', { name: card.title, exact: true })).toBeVisible();
    await expect(idea.getByRole('heading', { name: 'In a diagram', exact: true })).toBeVisible();
    const drawn = idea.getByTestId('idea-diagram');
    await drawn.scrollIntoViewIfNeeded();
    await expect(drawn.getByRole('img', { name: 'Sentence diagram of John 1:1, Greek' })).toBeVisible();
    await expect(drawn.locator('button[data-lit]')).toHaveCount(card.lit.length);
    for (const word of card.lit) await expect(drawn.locator('button[data-lit]', { hasText: word })).toBeVisible();
    const box = await drawn.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(fits.w).toBeLessThanOrEqual(fits.c);
    await shot(page, card.shot);
    await idea.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(idea).toHaveCount(0);
  }
});
