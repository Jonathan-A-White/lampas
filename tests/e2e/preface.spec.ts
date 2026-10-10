import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 412, height: 915 } });

test('the Preface opens from the picker at phone width, with its links', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  const row = picker.getByRole('button', { name: 'Preface', exact: true });
  await expect(row).toBeVisible();
  const [rowBox, matthewBox] = [await row.boundingBox(), await picker.getByRole('button', { name: 'Matthew', exact: true }).first().boundingBox()];
  expect(rowBox && matthewBox && rowBox.y < matthewBox.y).toBe(true);
  expect(rowBox?.height).toBeGreaterThanOrEqual(47.5);
  await row.click();

  await expect(page).toHaveURL(/#\/preface$/);
  await expect(page.getByRole('heading', { name: 'Preface', level: 1 })).toBeVisible();
  const essay = page.getByRole('button', { name: /The Case for Byzantine Priority/ });
  const original = page.getByRole('link', { name: 'Original (TC Journal, 2001)' });
  const msb = page.getByRole('link', { name: /Majority Standard Bible/ });
  await essay.scrollIntoViewIfNeeded(); // the edition paragraph (mw-5r3p30.136) pushes it below the first screen
  await expect(essay).toBeInViewport();
  await expect(original).toHaveAttribute('href', 'http://rosetta.reltech.org/TC/vol06/Robinson2001.html');
  await expect(original).toHaveAttribute('target', '_blank');
  await expect(original).toHaveAttribute('rel', /noreferrer/);
  await expect(page.getByText('An old-format page, small on a phone.')).toBeVisible();
  await msb.scrollIntoViewIfNeeded();
  await expect(msb).toBeVisible();
  await expect(msb).toHaveAttribute('href', 'https://majoritybible.com/');

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  const sideways = await page.evaluate(() => [...document.querySelectorAll('main a')].filter((a) => a.getBoundingClientRect().right > innerWidth).length);
  expect(sideways).toBe(0);

  await page.locator('main.screen').evaluate((el) => el.scrollTo(0, 0));
  await shot(page, 'preface');
});

test('About links to the Preface', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/about');
  await page.getByRole('button', { name: 'Preface', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Preface', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
});

test('the Robinson entry opens the essay inside the app, readable at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/preface');
  await page.getByRole('button', { name: /The Case for Byzantine Priority/ }).click();
  await expect(page).toHaveURL(/#\/preface\/robinson$/);
  await expect(page.getByRole('heading', { name: 'The Case for Byzantine Priority', level: 1 })).toBeVisible();
  const first = page.getByRole('heading', { name: 'Introduction', level: 2 });
  await expect(first).toBeVisible();
  const body = page.locator('main [data-essay-paragraph]').first();
  await expect(body).toBeVisible();
  expect(await body.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  const wide = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length);
  expect(wide).toBe(0);

  await page.getByRole('button', { name: 'Footnote 1' }).first().click();
  await expect(page.locator('[data-footnote="1"]')).toBeVisible();
  await shot(page, 'essay-robinson');

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Preface', level: 1 })).toBeVisible();
});
