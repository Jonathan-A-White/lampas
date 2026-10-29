// A verse link's Open brings the verse to the top of the Reader, from a lesson too (mw-5r3p30.857): in 'Why manuscripts differ' the Governor tapped "Revelation 3:5", then Open,
// and the Reader showed Revelation 3 from its first verse. The verse's top is within 80 px of the reading area's top, with no saved place and with one kept in that chapter. 390x844.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const LESSON = '/#/lessons/variants/2';

/** How far the verse's top is below the top of the reading area. */
const below = (page: Page, verse: number) =>
  page.locator('[data-reader]').evaluate((box, n) => {
    const el = box.querySelector(`[data-verse="${n}"]`);
    return el ? el.getBoundingClientRect().top - box.getBoundingClientRect().top : Number.NaN;
  }, verse);

async function openFromLesson(page: Page): Promise<void> {
  if (!page.url().includes('/lessons/')) await page.goto(LESSON);
  await expect(page.getByRole('heading', { name: 'Why manuscripts differ', level: 1 })).toBeVisible();
  const link = page.getByRole('link', { name: 'Revelation 3:5', exact: true });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  const card = page.getByRole('dialog', { name: 'Revelation 3:5' });
  await expect(card.locator('[data-reference-text]')).not.toBeEmpty();
  await card.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(card).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Revelation 3', level: 1 })).toBeVisible();
}

test('Open on "Revelation 3:5" in a lesson brings verse 5 to the top of the Reader', async ({ page }) => {
  await openUnlocked(page);
  await openFromLesson(page);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '5');
  await expect.poll(() => below(page, 5)).toBeLessThan(80);
  expect(await below(page, 5)).toBeGreaterThanOrEqual(-1);
  await shot(page, 'reference-open-verse');
});

test('a place kept in Revelation 3 does not win over the card\'s verse', async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('lampas.scrolls')) window.localStorage.setItem('lampas.scrolls', JSON.stringify({ '#/?b=rev&c=3': { '#/?b=rev&c=3#reader': 700 } }));
  });
  await openUnlocked(page);
  await openFromLesson(page);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '5');
  await expect.poll(() => below(page, 5)).toBeLessThan(80);
  expect(await below(page, 5)).toBeGreaterThanOrEqual(-1);
});

// The Reader keeps its place per address with the view and weave in it ('#/?b=rev&c=3&view=english&weave=off'): a place he left in Revelation 3 earlier in the sitting is kept under that
// address, and Open has to forget it whichever view it was kept in (the failure of mw-5r3p30.857).
for (const view of ['english', 'greek']) {
  test(`the place he left in Revelation 3 in the ${view} view, earlier in the sitting, does not win over the card's verse`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto(`/#/?b=rev&c=3&view=${view}`);
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await page.locator('[data-reader]').evaluate((el) => (el.scrollTop = 700));
    await expect.poll(() => page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(700);
    // the scroll is kept 250 ms after its last event; a lesson is reached by the address, as the Back trail and Help do
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      window.history.pushState(null, '', '/#/lessons/variants/2');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await openFromLesson(page);
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '5');
    await expect.poll(() => below(page, 5)).toBeLessThan(80);
    expect(await below(page, 5)).toBeGreaterThanOrEqual(-1);
  });
}

// The tutor's answer (Markdown in the Talk sheet, as a lesson's page is) opens the same card: with a place kept in Hebrews 7 from earlier in the sitting, Open still brings verse 2 to the top.
test('Open on a reference in the tutor\'s answer brings its verse to the top, past a place kept in that chapter', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Melchizedek is the thread: see Heb 7:2 for his name and what it means.', words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?b=heb&c=7');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.locator('[data-reader]').evaluate((el) => (el.scrollTop = 700));
  await expect.poll(() => page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(700);
  await page.waitForTimeout(600);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('Who is Melchizedek?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await sheet.getByRole('link', { name: 'Heb 7:2', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Hebrews 7:2' });
  await expect(card.locator('[data-reference-text]')).not.toBeEmpty();
  await card.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hebrews 7', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '2');
  await expect.poll(() => below(page, 2)).toBeLessThan(80);
  expect(await below(page, 2)).toBeGreaterThanOrEqual(-1);
});
