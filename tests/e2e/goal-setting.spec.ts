import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The bounds below are the phone's screen, so the spec sets it (the chromium project is 1280 wide).
test.use({ viewport: { width: 390, height: 844 } });

test('Settings > Goal at phone width: three pickers, each 48 px tall, write Read 1 John 1:1 and keep it across a reload', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=greek');
  const group = page.getByRole('group', { name: 'Goal', exact: true });
  await expect(group).toBeVisible();
  await expect(group.getByTestId('goal-now')).toHaveText('Goal: none');

  const book = group.getByRole('combobox', { name: 'Book', exact: true });
  const chapter = group.getByRole('combobox', { name: 'Chapter', exact: true });
  const verse = group.getByRole('combobox', { name: 'Verse', exact: true });
  await expect(chapter).toBeDisabled();
  await expect(verse).toBeDisabled();

  await book.selectOption({ label: '1 John' });
  await chapter.selectOption({ label: '1' });
  await verse.selectOption({ label: '1' });
  await expect(group.getByTestId('goal-now')).toHaveText('Read 1 John 1:1');

  for (const picker of [book, chapter, verse, group.getByRole('button', { name: 'Clear', exact: true })]) {
    const box = await picker.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  for (const picker of [book, chapter, verse]) {
    expect(await picker.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }

  await page.reload();
  await expect(page.getByRole('group', { name: 'Goal', exact: true }).getByTestId('goal-now')).toHaveText('Read 1 John 1:1');
  await expect(page.getByRole('group', { name: 'Goal', exact: true }).getByRole('combobox', { name: 'Verse', exact: true })).toHaveValue('1');
  // the screen scrolls in its own box: bring the Goal to the top so the shot shows it
  await page.getByRole('heading', { name: 'Goal', exact: true, level: 2 }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'goal-setting');
});
