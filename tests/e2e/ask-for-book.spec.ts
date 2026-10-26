// tests/e2e/ask-for-book.spec.ts — Ask for a book at phone width (mw-rfjjzd.14): the sheet opens from the Library card and from Settings > Daily, its controls clear 48 px and fit, offline the request waits and
// back online it goes by itself, and a book already asked is refused with its line. Replaces tests/e2e/ask-book.spec.ts and request-devotional.spec.ts, the two boxes the sheet replaced.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const PHONE = { width: 390, height: 844 };
const MOUNCE = 'Mounce, Basics of Biblical Greek';

test('Ask for a book at phone width: the sheet fits, offline it waits, back online it goes, and asking it again is refused', async ({ page, context }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/library');

  await page.getByRole('button', { name: 'Ask for a book' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask for a book' });
  await expect(sheet).toBeVisible();
  const title = sheet.getByRole('textbox', { name: 'Book title' });
  const send = sheet.getByRole('button', { name: 'Send', exact: true });
  const kind = sheet.getByRole('combobox', { name: 'Kind of book' });
  const why = sheet.getByRole('textbox', { name: 'Why would it help?' });
  await expect(send).toBeDisabled();

  // Every control clears 48 px and fits the phone's width; the fields do not make the phone zoom (16 px or more).
  for (const control of [title, kind, why, send]) {
    const size = await control.boundingBox();
    expect(size?.height).toBeGreaterThanOrEqual(47.5);
    expect((size?.x ?? 0) + (size?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
    expect(await control.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
  const frame = await sheet.boundingBox();
  expect((frame?.y ?? 0) + (frame?.height ?? 0)).toBeLessThanOrEqual(PHONE.height + 0.5);
  await shot(page, 'ask-for-book');

  // Offline: the request waits on the phone.
  await context.setOffline(true);
  await title.fill(MOUNCE);
  await send.click();
  await expect(sheet.getByText(`Waiting to send: ${MOUNCE}`)).toBeVisible();
  await expect(sheet.getByText('It goes when you are back online.')).toBeVisible();
  expect(fake.received).toHaveLength(0);
  await shot(page, 'ask-for-book-waiting');

  // Back online: it goes by itself.
  await context.setOffline(false);
  await expect(sheet.getByText('Sent: the factory has it')).toBeVisible();
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input).toMatchObject({ kind: 'book', title: MOUNCE });
  await shot(page, 'ask-for-book-sent');

  // Asking it again is refused with its line, and nothing more is sent.
  await sheet.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Ask for a book' }).click();
  await sheet.getByRole('textbox', { name: 'Book title' }).fill(MOUNCE);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByText(/^You asked for this on \d{1,2} \w{3}\. Your requests follows it\.$/)).toBeVisible();
  expect(fake.received).toHaveLength(1);
  await shot(page, 'ask-for-book-refused');
});

test('Ask for a devotional on Settings > Daily opens the sheet with the kind a devotional', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/settings?group=daily');

  const open = page.getByRole('button', { name: 'Ask for a devotional' });
  await open.scrollIntoViewIfNeeded();
  const size = await open.boundingBox();
  expect(size?.height).toBeGreaterThanOrEqual(47.5);
  await open.click();
  const sheet = page.getByRole('dialog', { name: 'Ask for a book' });
  await expect(sheet.getByRole('combobox', { name: 'Kind of book' })).toHaveValue('devotional');
  await sheet.getByRole('textbox', { name: 'Book title' }).fill("Spurgeon, Faith's Checkbook");
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByText('Sent: the factory has it')).toBeVisible();
  expect(fake.received[0].input).toMatchObject({ kind: 'book', title: "Spurgeon, Faith's Checkbook", kindWanted: 'devotional' });
  await shot(page, 'ask-for-devotional');
});

test('Ask the makers about these on the import result: one tap sends the list once and the line replaces the button', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/library?import');
  const header = 'ResourceId,Type,AbbreviatedTitle,Title,Series,Languages,ReferenceSupersets';
  const list = [
    header,
    'LLS:HENDRIKSENROM,text.monograph.commentary.bible,,Exposition of Paul\'s Epistle to the Romans,New Testament Commentary,en,"bible.1.1.1-39.4.6\tbible.66.1.1-66.16.27"',
    'LLS:GREEKLEXICON,text.monograph.lexicon,,A Greek Lexicon of the New Testament,,"el,en",',
    'LLS:MANUSCRIPT1,text.monograph.ancient-manuscript,,Codex Sinaiticus,,el,bible.61.1.1-87.22.21',
  ].join('\r\n');
  await page.getByLabel('Logos list file').setInputFiles({ name: 'logos-list.csv', mimeType: 'text/csv', buffer: Buffer.from(list) });
  await expect(page.getByTestId('import-result')).toBeVisible();
  const ask = page.getByRole('button', { name: 'Ask the makers about these' });
  await ask.scrollIntoViewIfNeeded();
  const size = await ask.boundingBox();
  expect(size?.height).toBeGreaterThanOrEqual(47.5);
  expect((size?.x ?? 0) + (size?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  await expect(page.getByTestId('library-sends')).toBeVisible();
  expect(fake.received).toHaveLength(0);
  await shot(page, 'library-ask-makers');

  await ask.click();
  await expect(page.getByTestId('library-asked')).toHaveText(/^Asked on \d{1,2} \w{3}: 2 books\. The makers add what fits with each update\.$/);
  await expect(ask).toHaveCount(0);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input).toMatchObject({ kind: 'library', books: 3, usable: 2 });
  expect(fake.received[0].attachments).toEqual([expect.objectContaining({ mime: 'text/csv', name: 'library.csv' })]);
  expect(fake.attachmentText(fake.received[0].attachments[0])).not.toContain('MANUSCRIPT1');
  await shot(page, 'library-asked');
});
