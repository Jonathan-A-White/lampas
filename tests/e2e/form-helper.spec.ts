import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 412 px: the width the Governor asked the pictures at (mw-5r3p30.117).
const PHONE = { width: 412, height: 915 };

const answered = (answer: string, ask?: string, values: { field: string; value: string }[] = []) => ({
  status: 'answered' as const,
  answer: { answer, words: [], ...(values.length ? { form_values: values } : {}), ...(ask ? { form_ask: ask } : {}) },
});

test('Let the tutor help me fill this in at phone width: the button, a question with a field filling, the finished form', async ({ page }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/settings');
  const open = page.getByRole('button', { name: 'Ask for another approach' });
  await open.scrollIntoViewIfNeeded();
  await open.click();

  const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
  const start = sheet.getByRole('button', { name: 'Let the tutor help me fill this in' });
  await expect(start).toBeVisible();
  // the button is the first control under the title and clears 48 px
  const startBox = await start.boundingBox();
  expect(startBox?.height).toBeGreaterThanOrEqual(47.5);
  expect((startBox?.x ?? 0) + (startBox?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  await shot(page, 'form-helper-button');

  fake.autoReply = answered('What approach would you like to suggest, and how does it teach?', 'approach');
  await start.click();
  const helper = sheet.getByRole('region', { name: 'The tutor is helping with this form' });
  await expect(helper.getByText('What approach would you like to suggest, and how does it teach?')).toBeVisible();

  const text = sheet.getByLabel('What approach, and how does it teach?');
  const name = sheet.getByLabel('Who to credit', { exact: true });
  const link = sheet.getByLabel('Link', { exact: true });
  const send = sheet.getByRole('button', { name: 'Send' });
  await expect(send).toBeDisabled();

  // he answers; the tutor's next question shows with the approach field filled and in view beneath it
  fake.autoReply = answered('Who made this approach, so we can credit them?', 'credit', [{ field: 'approach', value: 'Teach the cases with colours, one case at a time.' }]);
  await helper.getByLabel('Your answer').fill('I want the cases taught with colours, one case at a time.');
  await helper.getByRole('button', { name: 'Reply' }).click();
  await expect(helper.getByText('Who made this approach, so we can credit them?')).toBeVisible();
  await expect(text).toHaveValue('Teach the cases with colours, one case at a time.');
  await expect(text).toBeInViewport();
  await shot(page, 'form-helper-filling');

  // the photo question offers the form's own picker
  fake.autoReply = answered('Do you have a screenshot or a photo of it?', 'pictures', [{ field: 'credit', value: 'Anna Example' }]);
  await helper.getByLabel('Your answer').fill('Anna Example');
  await helper.getByRole('button', { name: 'Reply' }).click();
  await expect(name).toHaveValue('Anna Example');
  const chooser = page.waitForEvent('filechooser');
  await helper.getByRole('button', { name: 'Choose a photo' }).click();
  expect((await chooser).isMultiple()).toBe(true);
  fake.autoReply = answered('Is there a link where it can be found?', 'link');
  await helper.getByRole('button', { name: 'No photo' }).click();
  await expect(helper.getByText('Is there a link where it can be found?')).toBeVisible();

  fake.autoReply = answered('That is everything I need: every required field is filled in.', undefined, [{ field: 'link', value: 'example.org/greek' }]);
  await helper.getByLabel('Your answer').fill('example.org/greek');
  await helper.getByRole('button', { name: 'Reply' }).click();
  await expect(link).toHaveValue('example.org/greek');
  await expect(helper.getByText(/Everything required is filled in/)).toBeVisible();
  await expect(send).toBeEnabled();

  // every control of the panel clears 48 px and fits the phone; nothing was sent
  for (const control of await helper.getByRole('button').all()) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  }
  expect(await helper.getByLabel('Your answer').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
  expect(fake.received.filter((r) => r.grist.kind === 'feedback')).toHaveLength(0);
  await shot(page, 'form-helper-finished');
});
