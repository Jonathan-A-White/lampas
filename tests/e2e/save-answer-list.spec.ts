import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';
import { expectInList } from './talk-list';

// A tutor's answer that names references is saved as a verse list by a quiet button under it (mw-5r3p30.929), at 390x844: every reference, in answer order, a run of chapters as its chapters; Open goes to the list.
const QUESTION = 'Which five books should I read to understand Revelation?';
const ANSWER = 'Here is a top five. 1. Daniel, above all chapters 2, 7 and 10 to 12: the statue and kingdoms. 2. Ezekiel 1:26-28, the throne, and Isaiah 6.';

// A tap on the phone, which also ends the box's settling after an answer draws (a touch in the box is his hand taking over, src/Talk.tsx).
test.use({ hasTouch: true });

test('save the answer\'s references as a list, and open it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: ANSWER, words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill(QUESTION);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const save = sheet.getByRole('button', { name: 'Save 7 references as a list' });
  await expect(save).toBeVisible();
  await save.tap();
  await expect(sheet.getByRole('textbox', { name: 'List name' })).toHaveValue(QUESTION);
  // the form is in view in the conversation box, not left below its fold
  await expectInList(sheet, sheet.getByRole('textbox', { name: 'List name' }), 'the name field');
  await shot(page, 'save-answer-list-form');
  await sheet.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(sheet.getByText(`Saved 7 references to ${QUESTION}`)).toBeVisible();
  await expectInList(sheet, sheet.getByRole('button', { name: 'Open', exact: true }), 'Open');
  await shot(page, 'save-answer-list-saved');

  // Open goes to the list, the Talk sheet closed; the references are in the answer's order, the chapters of 'Daniel 10 to 12' each
  await sheet.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('heading', { name: QUESTION, level: 1 })).toBeVisible();
  await expect(page.getByRole('link')).toHaveText(['Daniel 2', 'Daniel 7', 'Daniel 10', 'Daniel 11', 'Daniel 12', 'Ezekiel 1:26-28', 'Isaiah 6']);
  await shot(page, 'save-answer-list-list');
});
