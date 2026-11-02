// The tutor's paradigm link (mw-5r3p30.990) at 390x844: an answer that carries {kind: 'paradigm', table} is drawn as the chip 'Table: The article' under the answer; a tap leaves the Talk
// sheet and opens that table on the Paradigms screen, and Back (the screen's own '‹ Talk', or the phone's Back) returns to the Talk sheet with the turn still there.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openTutor } from './open-tutor';
import { openUnlocked } from './unlocked';
import { talkField } from './talk-field';
import { askAboutVerse } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

async function askForTheForms(page: import('@playwright/test').Page) {
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: {
      answer: 'The article has every gender and case in one table: ἡ and τῆς are the feminine ones. Tap the link to see them laid out.',
      question: 'Can I see the forms?',
      words: [],
      links: [{ kind: 'paradigm', table: 'article' }, { kind: 'paradigm', table: 'no-such-table' }],
    },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const sheet = await askAboutVerse(page, 28, 'Can I see the forms?');
  const links = sheet.locator('[data-tutor-links]');
  await expect(links).toBeVisible();
  // the unknown id draws no chip: one group, named by the table's own name
  await expect(links.locator('[data-tutor-link]')).toHaveCount(1);
  const chip = links.getByRole('button', { name: 'Table: The article', exact: true });
  await expect(chip).toBeVisible();
  const box = await chip.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  await links.scrollIntoViewIfNeeded();
  await shot(page, 'tutor-paradigm-link-chip');
  return { sheet, chip };
}

test('the Table chip opens the table, and the screen\'s ‹ Talk returns to the talk with the turn still there', async ({ page }) => {
  const { sheet, chip } = await askForTheForms(page);
  await chip.click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#\/paradigms\?t=article$/);
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await shot(page, 'tutor-paradigm-link-table');

  await page.getByRole('button', { name: '‹ Talk', exact: true }).click();
  const back = page.getByRole('dialog', { name: /^Talk about / });
  await expect(back).toBeVisible();
  await expect(back.locator('[data-turn]')).toHaveCount(1);
  await expect(back.getByText('ἡ and τῆς are the feminine ones', { exact: false })).toBeVisible();
  await expect(back.getByRole('button', { name: 'Table: The article', exact: true })).toBeVisible();
  await shot(page, 'tutor-paradigm-link-back');
});

test('the phone\'s Back from the table returns to the talk too', async ({ page }) => {
  const { chip } = await askForTheForms(page);
  await chip.click();
  await expect(page).toHaveURL(/#\/paradigms\?t=article$/);
  await page.goBack();
  const back = page.getByRole('dialog', { name: /^Talk about / });
  await expect(back).toBeVisible();
  await expect(back.locator('[data-turn]')).toHaveCount(1);
});

test('from a talk about a screen (the Paradigms list) the chip opens the table and Back returns to that screen\'s talk', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: { answer: 'Start with the article: it shows the genders and cases most plainly.', question: 'Which table first?', words: [], links: [{ kind: 'paradigm', table: 'article' }] },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/paradigms');
  const sheet = await openTutor(page, { sheet: 'Ask the tutor: Paradigms' });
  await (await talkField(sheet)).fill('Which table first?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await sheet.getByRole('button', { name: 'Table: The article', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#\/paradigms\?t=article$/);
  await page.getByRole('button', { name: '‹ Talk', exact: true }).click();
  const back = page.getByRole('dialog', { name: 'Ask the tutor: Paradigms', exact: true });
  await expect(back).toBeVisible();
  await expect(back.locator('[data-turn]')).toHaveCount(1);
  await expect(page).toHaveURL(/#\/paradigms$/);
});
