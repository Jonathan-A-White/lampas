import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('the phone\'s Back on the word sheet closes it and leaves the Reader on Romans 8 where it was; Done leaves no stray entry', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/words');
  await page.goto('/#/');
  const word = page.locator('[data-verse="20"] [data-chunk="2"]').first();
  await word.scrollIntoViewIfNeeded();
  const box = page.locator('main[data-reader]');
  const before = await box.evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(0);

  await word.click();
  const sheet = page.getByRole('dialog', { name: 'Word' });
  await expect(sheet).toBeVisible();

  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#\/$|#\/\?/);
  await expect(page.getByRole('heading', { name: 'Romans 8' })).toBeVisible();
  expect(await box.evaluate((el) => el.scrollTop)).toBe(before);
  await shot(page, 'sheet-back');

  // Done takes its own entry off: the next Back goes to the Words screen, not to a sheet that is already shut.
  await word.click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/#\/words$/);
});

test('each move inside the sheets is one Back step: τεκνία, plural, singular, then Back shows plural, then τεκνία, then the Reader (mw-5r3p30.239)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=2&view=greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Τεκνία', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word' });
  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  await word.getByTestId('sheet-parse').getByRole('button', { name: 'plural', exact: true }).click();
  await expect(grammar.getByRole('heading', { name: 'plural' })).toBeVisible();
  await grammar.getByRole('group', { name: 'Related terms' }).getByRole('button', { name: 'singular', exact: true }).click();
  await expect(grammar.getByRole('heading', { name: 'singular' })).toBeVisible();

  await page.goBack();
  await expect(grammar.getByRole('heading', { name: 'plural' })).toBeVisible();
  await page.goBack();
  await expect(grammar).toBeHidden();
  await expect(word).toBeVisible();
  await page.goBack();
  await expect(word).toBeHidden();
  await expect(page.getByRole('heading', { name: '1 John 2' })).toBeVisible();
  await shot(page, 'sheet-back-trail');
});

test('an example word tapped on the idea sheet is one Back step: Back brings the idea sheet back, then the Grammar sheet, then the first word (mw-5r3p30.239)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word' });
  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  const idea = page.getByRole('dialog', { name: 'Idea' });
  const first = await word.innerText();
  await word.getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await grammar.getByRole('button', { name: 'Learn this idea' }).click();
  await idea.getByTestId('idea-example').first().click();
  await expect(idea).toBeHidden();
  await expect(grammar).toBeHidden();
  expect(await word.innerText()).not.toBe(first);

  await page.goBack();
  await expect(idea).toBeVisible();
  await expect(grammar).toBeVisible();
  expect(await word.innerText()).toBe(first);
  await page.goBack();
  await expect(idea).toBeHidden();
  await expect(grammar).toBeVisible();
  await page.goBack();
  await expect(grammar).toBeHidden();
  await expect(word).toBeVisible();

  // Done closes it all and leaves no entry: the next Back is not swallowed
  await word.getByRole('button', { name: 'Done' }).click();
  await expect(word).toBeHidden();
});

test('Done on the Grammar sheet or the idea sheet closes the whole stack, the word card too, and leaves no entry (mw-5r3p30.514)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/words');
  await page.goto('/#/?b=1jn&c=2&view=greek');
  const word = page.getByRole('dialog', { name: 'Word' });
  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  const idea = page.getByRole('dialog', { name: 'Idea' });
  const open = async (): Promise<void> => {
    await page.locator('[data-verse="1"]').getByRole('button', { name: 'Τεκνία', exact: true }).click();
    await word.getByTestId('sheet-parse').getByRole('button', { name: 'plural', exact: true }).click();
    await expect(grammar.getByRole('heading', { name: 'plural' })).toBeVisible();
  };

  await open();
  await grammar.getByRole('button', { name: 'Done' }).click();
  await expect(grammar).toBeHidden();
  await expect(word).toBeHidden();
  await expect(page.getByRole('heading', { name: '1 John 2' })).toBeVisible();
  await shot(page, 'sheet-done-all');
  await page.goBack();
  await expect(page).toHaveURL(/#\/words$/);

  await page.goForward();
  await open();
  await grammar.getByRole('button', { name: 'Learn this idea' }).click();
  await expect(idea).toBeVisible();
  await idea.getByRole('button', { name: 'Done' }).click();
  await expect(idea).toBeHidden();
  await expect(grammar).toBeHidden();
  await expect(word).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/#\/words$/);
});

test('after a reload with the word card, plural and singular open, the first Back leaves 1 John 2 at once, for the screen before it (mw-5r3p30.505)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/words');
  await page.goto('/#/?b=1jn&c=2&view=greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Τεκνία', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word' });
  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  await word.getByTestId('sheet-parse').getByRole('button', { name: 'plural', exact: true }).click();
  await grammar.getByRole('group', { name: 'Related terms' }).getByRole('button', { name: 'singular', exact: true }).click();
  await expect(grammar.getByRole('heading', { name: 'singular' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '1 John 2' })).toBeVisible();
  await expect(word).toBeHidden();
  await expect(grammar).toBeHidden();
  // the entries the sheets left are behind him: nothing is drawn over the address, and he stands on the Reader's own entry
  await expect.poll(() => page.evaluate(() => (history.state as { sheet?: number } | null)?.sheet ?? 0)).toBe(0);

  await page.goBack();
  await expect(page).toHaveURL(/#\/words$/);
  await shot(page, 'sheet-back-reload');
});

for (const moves of [0, 1]) {
  test(`after a reload with the word card${moves ? ', then plural,' : ''} open, the first Back leaves 1 John 2 (mw-5r3p30.505)`, async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await openUnlocked(page);
    await page.goto('/#/words');
    await page.goto('/#/?b=1jn&c=2&view=greek');
    await page.locator('[data-verse="1"]').getByRole('button', { name: 'Τεκνία', exact: true }).click();
    const word = page.getByRole('dialog', { name: 'Word' });
    await expect(word).toBeVisible();
    if (moves) await word.getByTestId('sheet-parse').getByRole('button', { name: 'plural', exact: true }).click();
    if (moves) await expect(page.getByRole('dialog', { name: 'Grammar' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: '1 John 2' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (history.state as { sheet?: number } | null)?.sheet ?? 0)).toBe(0);
    await page.goBack();
    await expect(page).toHaveURL(/#\/words$/);
  });
}
