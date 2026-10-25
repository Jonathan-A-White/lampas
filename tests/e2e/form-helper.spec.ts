import { expect, test } from '@playwright/test';
import { START_LABEL } from '../../src/formHelper/startLabel';
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

test(`${START_LABEL} at phone width: the button, a question with a field filling, the finished form`, async ({ page }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/settings?group=greek');
  const open = page.getByRole('button', { name: 'Ask for another approach' });
  await open.scrollIntoViewIfNeeded();
  await open.click();

  const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
  const start = sheet.getByRole('button', { name: START_LABEL });
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
  const send = sheet.getByRole('button', { name: 'Send', exact: true });
  await expect(send).toBeDisabled();

  // he answers; the tutor's next question shows with the approach field filled and in view beneath it
  fake.autoReply = answered('Who made this approach, so we can credit them?', 'credit', [{ field: 'approach', value: 'Teach the cases with colours, one case at a time.' }]);
  await helper.getByLabel('Your answer').fill('I want the cases taught with colours, one case at a time.');
  await helper.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(helper.getByText('Who made this approach, so we can credit them?')).toBeVisible();
  await expect(text).toHaveValue('Teach the cases with colours, one case at a time.');
  await expect(text).toBeInViewport();
  await shot(page, 'form-helper-filling');

  // the photo question offers the form's own picker
  fake.autoReply = answered('Do you have a screenshot or a photo of it?', 'pictures', [{ field: 'credit', value: 'Anna Example' }]);
  await helper.getByLabel('Your answer').fill('Anna Example');
  await helper.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(name).toHaveValue('Anna Example');
  const chooser = page.waitForEvent('filechooser');
  await helper.getByRole('button', { name: 'Choose a photo' }).click();
  expect((await chooser).isMultiple()).toBe(true);
  fake.autoReply = answered('Is there a link where it can be found?', 'link');
  await helper.getByRole('button', { name: 'No photo' }).click();
  await expect(helper.getByText('Is there a link where it can be found?')).toBeVisible();

  fake.autoReply = answered('That is everything I need: every required field is filled in.', undefined, [{ field: 'link', value: 'example.org/greek' }]);
  await helper.getByLabel('Your answer').fill('example.org/greek');
  await helper.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(link).toHaveValue('example.org/greek');
  // the approach form has a command (ask-for-approach): the panel ends with its offer line and a Send, and the sheet's own Send stays below
  await expect(helper.getByText('Send this approach, credit Anna Example?')).toBeVisible();
  await expect(send.last()).toBeEnabled();

  // every control of the panel clears 48 px and fits the phone; nothing was sent
  for (const control of await helper.getByRole('button').all()) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  }
  expect(await helper.getByLabel('Your answer').count()).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
  expect(fake.received.filter((r) => r.grist.kind === 'feedback')).toHaveLength(0);
  await shot(page, 'form-helper-finished');
});

test('The door on Ask for a book at phone width: the panel, the choice filling the select, and its own Send', async ({ page }) => {
  const fake = makeFakePostern();
  fake.kindReplies = { feedback: { status: 'answered', answer: { status: 'sent' } } };
  fake.autoReply = answered('Which book would you like to ask the makers for?', 'title');
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/library');
  await page.getByRole('button', { name: 'Ask for a book' }).click();

  const sheet = page.getByRole('dialog', { name: 'Ask for a book' });
  const start = sheet.getByRole('button', { name: START_LABEL });
  await expect(start).toBeVisible();
  const startBox = await start.boundingBox();
  expect(startBox?.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'form-helper-book-button');

  await start.click();
  const helper = sheet.getByRole('region', { name: 'The tutor is helping with this form' });
  await expect(helper.getByText('Which book would you like to ask the makers for?')).toBeVisible();

  const title = sheet.getByRole('textbox', { name: 'Book title' });
  const kind = sheet.getByRole('combobox', { name: 'Kind of book' });
  fake.autoReply = answered('That is everything I need. Tell me the kind of book or why it would help, or tap Send.', undefined, [{ field: 'title', value: 'Lenski, Romans' }]);
  await helper.getByLabel('Your answer').fill('Lenski, Romans');
  await helper.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(title).toHaveValue('Lenski, Romans');
  await expect(helper.getByText('Send: Lenski, Romans?')).toBeVisible();

  fake.autoReply = answered('Anything else you want to add?', undefined, [{ field: 'kind', value: 'Commentary' }]);
  await helper.getByLabel('Your answer').fill('It is a commentary.');
  await helper.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(kind).toHaveValue('commentary');
  await expect(helper.getByText('Send: Lenski, Romans, Commentary?')).toBeVisible();

  // every control of the panel clears 48 px and fits the phone; the sheet stays inside it; nothing was sent
  for (const control of await helper.getByRole('button').all()) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  }
  const frame = await sheet.boundingBox();
  expect((frame?.y ?? 0) + (frame?.height ?? 0)).toBeLessThanOrEqual(PHONE.height + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
  expect(fake.received.filter((r) => r.grist.kind === 'feedback')).toHaveLength(0);
  await shot(page, 'form-helper-book-ready');

  await helper.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByText('Sent: the factory has it')).toBeVisible();
  expect(fake.received.filter((r) => r.grist.kind === 'feedback')[0].input).toMatchObject({ kind: 'book', title: 'Lenski, Romans', kindWanted: 'commentary' });
  await shot(page, 'form-helper-book-sent');
});
