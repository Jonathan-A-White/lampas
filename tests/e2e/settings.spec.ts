import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// These specs measure a 390 px phone screen, so they pin it themselves: run under the 'chromium' project (a bare
// `npx playwright test <file>`) they would otherwise get Desktop Chrome's 1280 px and fail every width check.
test.use({ viewport: { width: 390, height: 844 } });

test('the reader header holds the chapter, English | Greek and the gear, in one row at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  const header = page.locator('header').first();
  const title = await header.getByRole('heading', { name: 'Romans 8', level: 1 }).boundingBox();
  const language = await header.getByRole('group', { name: 'Language' }).boundingBox();
  const gear = await header.getByRole('button', { name: 'Settings', exact: true }).boundingBox();
  const head = await header.boundingBox();
  if (!title || !language || !gear || !head) throw new Error('the header is missing a part');

  expect(gear.width).toBeGreaterThanOrEqual(43.5);
  expect(gear.height).toBeGreaterThanOrEqual(43.5);
  // left to right, no overlap, all inside the 390 px screen, and the title is not squeezed to nothing
  expect(title.x + title.width).toBeLessThanOrEqual(language.x + 0.5);
  expect(language.x + language.width).toBeLessThanOrEqual(gear.x + 0.5);
  expect(gear.x + gear.width).toBeLessThanOrEqual(390);
  expect(title.width).toBeGreaterThanOrEqual(90);
  // nothing else in the header, and no Weave switch or Words button in the reader's top
  expect(await page.getByRole('group', { name: 'Weave' }).count()).toBe(0);
  expect(await header.getByRole('button', { name: 'Words', exact: true }).count()).toBe(0);
  expect(head.height).toBeLessThanOrEqual(72);

  await page.screenshot({ path: 'shots/reader-header.png', clip: { x: 0, y: 0, width: 390, height: Math.ceil(head.y + head.height) + 8 } });
});

test('Settings at phone width: the weave, the voices, the Greek pronunciation, Words and About', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/settings');

  const solid = page.getByRole('group', { name: 'Weave' }).getByRole('button', { name: 'Solid', exact: true });
  await expect(solid).toBeVisible();
  for (const control of [
    solid,
    page.getByRole('combobox', { name: 'English voice' }),
    page.getByRole('combobox', { name: 'Greek voice' }),
    page.getByRole('radio', { name: 'Modern Greek' }),
    page.getByRole('button', { name: 'Words', exact: true }),
    page.getByRole('button', { name: 'About', exact: true }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
  }
  await expect(page.getByRole('radio', { name: 'Modern Greek' })).toBeChecked();
  const picker = page.getByRole('combobox', { name: 'Greek voice' });
  expect(await picker.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
  await shot(page, 'settings');

  await solid.click();
  await page.reload();
  await expect(solid).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-weave', 'solid');
  await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
});

test('Settings at phone width: Read aloud span has its four choices in one row inside the screen, Chapter chosen', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const group = page.getByRole('group', { name: 'Read aloud span' });
  await expect(group).toBeVisible();
  const names = ['Verse', 'Passage', 'Chapter', 'Book'];
  for (const name of names) {
    const box = await group.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  await expect(group.getByRole('button', { name: 'Chapter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'Book', exact: true }).click();
  await expect(group.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'settings-read-span');
});

test('Settings > Quiz goal at phone width: the label is bold and a disabled Save is plainly grey, still 48 px', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const group = page.getByRole('group', { name: 'Quiz goal', exact: true });
  await group.scrollIntoViewIfNeeded();
  await expect(group).toBeVisible();

  const label = group.locator('label', { hasText: 'Quiz goal' });
  expect(await label.evaluate((el) => parseInt(getComputedStyle(el).fontWeight, 10))).toBeGreaterThanOrEqual(600);

  const save = group.getByRole('button', { name: 'Save', exact: true });
  const look = (): Promise<{ opacity: string; color: string; background: string; height: number }> =>
    save.evaluate((el) => {
      const s = getComputedStyle(el);
      return { opacity: s.opacity, color: s.color, background: s.backgroundColor, height: el.getBoundingClientRect().height };
    });

  // nothing kept and nothing typed: Save is off
  await expect(save).toBeDisabled();
  const off = await look();
  expect(off.height).toBeGreaterThanOrEqual(47.5);
  expect(off.opacity).toBe('1'); // greyed by colour, not a faded amber

  await group.getByRole('textbox').fill('learning to read the Greek');
  await expect(save).toBeEnabled();
  const on = await look();
  expect(on.height).toBeGreaterThanOrEqual(47.5);
  expect(on.background).not.toBe(off.background);
  expect(on.color).not.toBe(off.color);

  await group.getByRole('textbox').fill('');
  await expect(save).toBeDisabled();
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'settings-quiz-goal-save-off');
});

test('Settings > Quiz goal at phone width: an off Save looks as off as an off Clear, and Clear does not move when Save turns on', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const group = page.getByRole('group', { name: 'Quiz goal', exact: true });
  await group.scrollIntoViewIfNeeded();
  await expect(group).toBeVisible();
  const save = group.getByRole('button', { name: 'Save', exact: true });
  const clear = group.getByRole('button', { name: 'Clear', exact: true });
  const field = group.getByRole('textbox');
  const look = (button: typeof save): Promise<{ color: string; background: string; border: string; x: number; width: number }> =>
    button.evaluate((el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { color: s.color, background: s.backgroundColor, border: s.borderTopColor, x: box.x, width: box.width };
    });

  // nothing kept, nothing typed: both are off and look the same
  await expect(save).toBeDisabled();
  await expect(clear).toBeDisabled();
  const bothOffSave = await look(save);
  const bothOffClear = await look(clear);
  expect(bothOffSave.background).toBe(bothOffClear.background);
  expect(bothOffSave.color).toBe(bothOffClear.color);
  expect(bothOffSave.border).toBe(bothOffClear.border);

  // typing turns Save on; Clear stays where it was
  await field.fill('learning to read Romans');
  await expect(save).toBeEnabled();
  const saveOn = await look(save);
  const clearBesideSaveOn = await look(clear);
  expect(saveOn.width).toBeCloseTo(bothOffSave.width, 1);
  expect(clearBesideSaveOn.x).toBeCloseTo(bothOffClear.x, 1);

  // a goal kept and the field unchanged: Save is off, Clear is on, and the two differ plainly
  await save.click();
  await expect(group.getByText('Quiz goal: learning to read Romans')).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(clear).toBeEnabled();
  const keptSave = await look(save);
  const keptClear = await look(clear);
  expect(keptSave.background).toBe(bothOffSave.background); // off Save is the off look, not a white box
  expect(keptSave.color).toBe(bothOffSave.color);
  expect(keptSave.color).not.toBe(keptClear.color); // off Save is faded, on Clear is not
  expect(keptClear.color).not.toBe(bothOffClear.color);
  expect(keptSave.width).toBeCloseTo(saveOn.width, 1);
  expect(keptClear.x).toBeCloseTo(bothOffClear.x, 1);
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'settings-quiz-goal-kept');
});
