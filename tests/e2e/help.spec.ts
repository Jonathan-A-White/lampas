// Help (mw-5r3p30.823) at 390x844: Settings > Account > More > Help is a short list; a tap on a piece opens its page and Back returns to the list; Ask the tutor at the top opens the
// tutor over Help and Back returns to the list; the Preface no longer shows the licence note. Ends with shots of the list and of a page.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test('Settings > More > Help: a list, a page and Back, and Ask the tutor at the top', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=account');
  await expect(page.getByRole('heading', { name: 'Account', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'More', level: 2 })).toBeVisible();
  const help = page.getByRole('button', { name: 'Help', exact: true });
  await help.scrollIntoViewIfNeeded();
  await help.click();

  await expect(page).toHaveURL(/#\/help$/);
  await expect(page.getByRole('heading', { name: 'Help', exact: true, level: 1 })).toBeVisible();
  const ask = page.getByRole('button', { name: 'Ask the tutor', exact: true });
  await expect(ask).toBeInViewport();
  const rows = page.locator('main li button');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(9);
  expect(count).toBeLessThanOrEqual(12);
  // Ask the tutor is first, above every piece
  const askBox = await ask.boundingBox();
  const firstBox = await rows.first().boundingBox();
  expect(askBox && firstBox && askBox.y + askBox.height <= firstBox.y).toBe(true);
  for (let i = 0; i < count; i++) expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(sideways).toBe(false);
  await shot(page, 'help');

  // a piece opens its page; the page is shorter than the phone screen; Back returns to the list
  await page.getByRole('button', { name: /^The licence/ }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /^The licence/ }).click();
  await expect(page).toHaveURL(/#\/help\?page=licence$/);
  await expect(page.getByRole('heading', { name: 'The licence', level: 2 })).toBeVisible();
  await expect(page.getByText(/up to five devices/)).toBeVisible();
  const { scrollHeight, clientHeight } = await page.locator('main.screen').evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
  expect(scrollHeight, 'a page fits the phone screen').toBeLessThanOrEqual(clientHeight + 1);
  await shot(page, 'help-page');
  await page.getByRole('button', { name: '‹ Help' }).click();
  await expect(page).toHaveURL(/#\/help$/);
  await expect(page.getByRole('heading', { name: 'Help', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^The licence/ })).toBeVisible();

  // Ask the tutor opens the tutor over Help, and Back returns to Help
  await page.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Help' });
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#\/help$/);
  await expect(page.getByRole('heading', { name: 'Help', exact: true, level: 1 })).toBeVisible();
});

test('the Preface says only what we chose: no Free to read, no licence', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/preface');
  await expect(page.getByRole('heading', { name: 'Preface', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Read more' })).toBeVisible();
  await expect(page.getByText('Free to read')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/licen[cs]e|Twilio/i);
});
