import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { leaveSettings } from './settings-group';
import { talkField } from './talk-field';

// A Bible reference in the tutor's answer opens a card under it (mw-5r3p30.133, features/reference-card.feature) at a small phone's width.
const VIEWPORT = { width: 360, height: 740 };
const ANSWER = 'Compare Ps. 110 with Heb 7:1-3 and Romans 8:28; Melchizedek is the thread between them, and the letter to the Hebrews draws it out at length for its readers.';

test('a reference in the tutor\'s answer opens a card that fits a 360 px phone, does not cover the reference and Open goes there', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: ANSWER, words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('Who is Melchizedek?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const link = sheet.getByRole('link', { name: 'Heb 7:1-3', exact: true });
  await expect(link).toBeVisible();
  await expect(sheet.getByRole('link')).toHaveCount(3);
  const before = page.url();

  await link.click();
  const card = page.getByRole('dialog', { name: 'Hebrews 7:1-3' });
  await expect(card).toBeVisible();
  await expect(card.getByText('This Melchizedek was king of Salem')).toBeVisible();
  await expect(card.getByText('Majority Standard Bible', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  expect(page.url()).toBe(before);

  // It fits the screen and stands clear of the words tapped.
  const box = await card.boundingBox();
  const tapped = await link.boundingBox();
  expect(box && tapped).toBeTruthy();
  if (box && tapped) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
    const apart = box.y >= tapped.y + tapped.height - 0.5 || box.y + box.height <= tapped.y + 0.5;
    expect(apart, 'the card stands clear of the reference').toBe(true);
    const open = await card.getByRole('button', { name: 'Open', exact: true }).boundingBox();
    expect(open?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
  await shot(page, 'reference-card');

  // A tap outside closes it and nothing moves; so does Back.
  await page.mouse.click(VIEWPORT.width / 2, 8);
  await expect(card).toBeHidden();
  expect(page.url()).toBe(before);
  await expect(sheet).toBeVisible();
  await link.click();
  await expect(card).toBeVisible();
  await page.goBack();
  await expect(card).toBeHidden();
  await expect(sheet).toBeVisible();

  // An Old Testament reference Lampas holds is a card like the New Testament's: the text, Open, and nothing that says it is missing (mw-5r3p30.840).
  await sheet.getByRole('link', { name: 'Ps. 110', exact: true }).click();
  const psalm = page.getByRole('dialog', { name: 'Psalm 110' });
  await expect(psalm.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  await expect(psalm.locator('[data-reference-text]')).not.toBeEmpty();
  await expect(psalm.getByText('Not in Lampas yet')).toHaveCount(0);
  await psalm.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(psalm).toBeHidden();

  // Open takes him to the chapter with the verse at the top, not the one-verse screen, and the card and the sheet are gone (mw-5r3p30.697).
  await link.click();
  await card.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(card).toBeHidden();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Hebrews 7', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  expect(page.url()).toContain('b=heb');
  expect(page.url()).toContain('c=7');
  expect(page.url()).not.toContain('v=');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
});

// An Old Testament passage Lampas holds (mw-5r3p30.840, which replaced mw-5r3p30.345's 'Not in Lampas yet'): Open goes to the Reader, and once Logos is linked Open in Logos
// is on the card, second to Open, in his Bible. The 'Not in Lampas yet' card of a book with no data, and its Link Logos in Settings, are proved by tests/unit/reference-card-unheld.test.tsx
// (every book is held today, so no screen reaches them: mw-5r3p30.427's scrolled-Settings test went with that door).
test('an Old Testament reference opens in the Reader, and in Logos once Logos is linked', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'The end of the matter is in Ecclesiastes 12:13 and the whole of Psalm 110.', words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('How does it end?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  await sheet.getByRole('link', { name: 'Ecclesiastes 12:13', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Ecclesiastes 12:13' });
  await expect(card.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  await expect(card.getByText('Not in Lampas yet')).toHaveCount(0);
  await expect(card.getByRole('link', { name: 'Open in Logos' })).toHaveCount(0);
  await shot(page, 'reference-card-old-testament');

  // Logos is linked in Settings
  await page.goto('/#/settings?section=resources');
  const logos = page.getByRole('switch', { name: 'Logos', exact: true });
  await logos.click();
  await expect(logos).toBeChecked();
  await leaveSettings(page);

  await openTalkAbout(page, 28);
  await page.getByRole('dialog', { name: 'Talk about Romans 8:28' }).getByRole('link', { name: 'Ecclesiastes 12:13', exact: true }).click();
  const open = card.getByRole('link', { name: 'Open in Logos' });
  await expect(open).toBeVisible();
  await expect(open).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Ec12.13');
  await expect(card.getByText('Not in Lampas yet')).toHaveCount(0);
  const door = await card.getByRole('button', { name: 'Open', exact: true }).boundingBox();
  const logosBox = await open.boundingBox();
  const cardBox = await card.boundingBox();
  expect(door && logosBox && cardBox).toBeTruthy();
  if (door && logosBox && cardBox) {
    expect(logosBox.y, 'Open in Logos comes after Open').toBeGreaterThan(door.y);
    expect(logosBox.height).toBeGreaterThanOrEqual(43.5);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(VIEWPORT.height);
  }
  await shot(page, 'reference-card-open-in-logos');

  // Open takes him to the chapter in the Reader
  await card.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ecclesiastes 12', level: 1 })).toBeVisible();
  expect(page.url()).toContain('b=ecc');
});

// A second tap on the reference a moment after the first (mw-5r3p30.429): the card's backdrop covers the reference, but that tap is not one outside the card.
test('a quick second tap on the reference leaves its card on screen', async ({ page }) => {
  await page.clock.install(); // tapTwice times the two taps on the page's clock (tests/support/gesture.ts)
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'The end of the matter is in Ecclesiastes 12:13 and the whole of Psalm 110.', words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('Where does Ecclesiastes end?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const link = sheet.getByRole('link', { name: 'Ecclesiastes 12:13', exact: true });
  const card = page.getByRole('dialog', { name: 'Ecclesiastes 12:13' });
  // the second tap, 150 ms of the page's clock after the first, lands on the link again once the card it opened is up
  await tapTwice(page, link, 150, { between: () => expect(card).toBeVisible() });
  await page.waitForTimeout(300);
  await expect(card).toBeVisible();
  await expect(sheet).toBeVisible();
  await shot(page, 'reference-card-second-tap');

  // A tap elsewhere still closes it.
  await page.mouse.click(VIEWPORT.width / 2, 8);
  await expect(card).toBeHidden();
});

// Open in Logos on a phone with no Logos app (mw-5r3p30.428): the scheme goes nowhere, 1.5 s later the https fallback opens in a new tab and Lampas itself stays where it is.
test('Open in Logos with no Logos app keeps the Lampas page on screen', async ({ page, context }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'The end of the matter is in Ecclesiastes 12:13.', words: [] } };
  await routePostern(page, fake);
  const refly: string[] = [];
  await context.route('https://ref.ly/**', (route) => {
    refly.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>ref.ly</title>' });
  });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await page.goto('/#/settings?section=resources');
  const logos = page.getByRole('switch', { name: 'Logos', exact: true });
  await logos.click();
  await expect(logos).toBeChecked();
  await leaveSettings(page);

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('Where does Ecclesiastes end?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await sheet.getByRole('link', { name: 'Ecclesiastes 12:13', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Ecclesiastes 12:13' });
  const lampas = page.url();
  const pagesBefore = context.pages().length;

  await card.getByRole('link', { name: 'Open in Logos' }).click();
  await page.waitForTimeout(2500);

  expect(page.url(), 'Lampas is still the page in front').toBe(lampas);
  await expect(card).toBeVisible();
  expect(refly.length, 'the https fallback was asked for once').toBe(1);
  expect(context.pages().length - pagesBefore, 'one new tab holds the fallback').toBe(1);
});
