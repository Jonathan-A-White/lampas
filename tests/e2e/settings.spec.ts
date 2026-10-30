import { expect, test, type Locator } from '@playwright/test';
import { shot } from './shot';
import { leaveSettings, openGroup, turnLogosOn } from './settings-group';
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
  const language = await header.getByRole('group', { name: 'Language', exact: true }).boundingBox();
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
  expect(await page.getByRole('group', { name: 'Weave', exact: true }).count()).toBe(0);
  expect(await header.getByRole('button', { name: 'Words', exact: true }).count()).toBe(0);
  expect(head.height).toBeLessThanOrEqual(72);

  await page.screenshot({ path: 'shots/reader-header.png', clip: { x: 0, y: 0, width: 390, height: Math.ceil(head.y + head.height) + 8 } });
});

test('Settings at phone width: the weave, the voices, the Greek pronunciation, Words and About, each on its group page', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/settings');

  const tappable = async (controls: Locator[]) => {
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(43.5);
      expect(box?.width).toBeGreaterThanOrEqual(43.5);
    }
  };
  const fitsPhone = async () => {
    const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollTop: document.documentElement.scrollTop,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    expect(scrollTop).toBe(0);
  };

  await openGroup(page, 'Reading');
  const solid = page.getByRole('group', { name: 'Weave', exact: true }).getByRole('button', { name: 'Solid', exact: true });
  await expect(solid).toBeVisible();
  await tappable([solid]);
  await fitsPhone();

  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await openGroup(page, 'Listening');
  const picker = page.getByRole('combobox', { name: 'Greek voice' });
  await expect(page.getByRole('radio', { name: 'Modern', exact: true })).toBeChecked();
  await tappable([page.getByRole('combobox', { name: 'English voice' }), picker, page.getByRole('radio', { name: 'Modern', exact: true })]);
  expect(await picker.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await fitsPhone();
  await shot(page, 'settings');

  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await openGroup(page, 'Account');
  await tappable([page.getByRole('button', { name: 'Words', exact: true }), page.getByRole('button', { name: 'About', exact: true })]);
  await fitsPhone();

  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await openGroup(page, 'Reading');
  await solid.click();
  await page.reload();
  await expect(solid).toHaveAttribute('aria-pressed', 'true');
  await leaveSettings(page);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-weave', 'solid');
  await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
});

test('Settings at phone width: Play to has its two choices in one row inside the screen, End of the book chosen', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=listening');
  const group = page.getByRole('group', { name: 'Play to' });
  await expect(group).toBeVisible();
  await expect(page.locator('[data-setting="readSpan"]')).toContainText('Play goes on from here. To hear less, tap a verse, a section heading or the place line.');
  const names = ['End of the book', 'End of the Bible'];
  for (const name of names) {
    const box = await group.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  await expect(group.getByRole('button', { name: 'End of the book', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'End of the Bible', exact: true }).click();
  await expect(group.getByRole('button', { name: 'End of the Bible', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'settings-read-span');
});

test('Settings > Quiz goal at phone width: the label is bold and a disabled Save is plainly grey, still 48 px', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=tutor');
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
  await page.goto('/#/settings?group=tutor');
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
  await expect(group.getByText('Kept: learning to read Romans')).toBeVisible();
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

test('Settings > Daily: a switch per piece, the devotional picker and Tick boxes; a change survives a reload', async ({ page }) => {
  await openUnlocked(page);
  // the Psalms and the devotional rows show only while Logos is On (mw-rfjjzd.23)
  await turnLogosOn(page);
  await page.goto('/#/settings?group=daily');
  const daily = page.locator('section[data-section="daily"]');
  await expect(daily.getByRole('heading', { name: 'Daily', exact: true, level: 2 })).toBeVisible();

  // all four pieces and Tick boxes start On, and each switch is a 44 px target
  for (const name of ['Review', 'Plan chapter', 'Psalms and Proverbs', 'Devotional', 'Tick boxes']) {
    const group = daily.getByRole('group', { name, exact: true });
    await expect(group.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const box = await group.getByRole('button', { name: 'Off', exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
  }

  // Which devotional is a searchable picker of the devotionals that are on in Your Logos library, with Random; it starts at Morning and Evening, and the draw shows only while Random is chosen
  const picker = daily.getByRole('group', { name: 'Which devotional', exact: true });
  const choice = (name: string) => picker.getByRole('radio', { name, exact: true });
  await expect(choice('Random')).toHaveAttribute('aria-checked', 'false');
  await expect(picker.getByRole('radio').first()).toHaveAccessibleName('Morning and Evening');
  await expect(picker.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  expect((await choice('Random').boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  const search = picker.getByRole('searchbox', { name: 'Search Which devotional' });
  expect((await search.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await search.fill('spurgeon');
  await expect(picker.getByRole('radio')).not.toHaveCount(0);
  await search.fill('');
  await expect(daily.getByRole('group', { name: 'In the draw' })).toHaveCount(0);
  await choice('Random').click();
  await expect(choice('Random')).toHaveAttribute('aria-checked', 'true');
  // In the draw follows the shelf: all 37 are on to start, and the button opens the Library's Devotionals page
  const draw = daily.getByRole('group', { name: 'In the draw' });
  await expect(draw).toContainText('37 devotionals are in the draw');
  expect((await draw.getByRole('button', { name: 'Choose them in Your Logos library' }).boundingBox())?.height).toBeGreaterThanOrEqual(43.5);

  await daily.getByRole('group', { name: 'Review', exact: true }).getByRole('button', { name: 'Off', exact: true }).click();
  await daily.getByRole('group', { name: 'Tick boxes', exact: true }).getByRole('button', { name: 'Off', exact: true }).click();
  await draw.getByRole('button', { name: 'Choose them in Your Logos library' }).click();
  await expect(page.getByRole('heading', { name: 'Devotionals', level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/library?kind=devotional');
  await page.getByRole('radiogroup', { name: 'Morning and Evening', exact: true }).getByRole('radio', { name: 'Off', exact: true }).click();
  await page.goto('/#/settings?group=daily');
  await expect(daily.getByRole('group', { name: 'In the draw' })).toContainText('36 devotionals are in the draw');

  await page.reload();
  await expect(daily.getByRole('group', { name: 'Review', exact: true }).getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(daily.getByRole('group', { name: 'Tick boxes', exact: true }).getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(daily.getByRole('group', { name: 'Plan chapter', exact: true }).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(daily.getByRole('group', { name: 'Which devotional', exact: true }).getByRole('radio', { name: 'Random', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(daily.getByRole('group', { name: 'In the draw' })).toContainText('36 devotionals are in the draw');
  await daily.scrollIntoViewIfNeeded();
  await shot(page, 'settings-daily');
});
