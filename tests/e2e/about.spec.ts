import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 412, height: 915 } });

test('About credits the data at phone width, reached from Home', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const about = page.getByRole('button', { name: 'About', exact: true });
  await about.scrollIntoViewIfNeeded();
  const tap = await about.boundingBox();
  expect(tap?.height).toBeGreaterThanOrEqual(43.5);
  await about.click();

  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
  await expect(page.getByRole('blockquote')).toContainText('If I have seen further it is by standing on the shoulders of Giants.');
  await expect(page.getByRole('blockquote')).toContainText('Isaac Newton');
  const licence = page.getByRole('link', { name: 'CC BY 4.0', exact: true });
  await licence.scrollIntoViewIfNeeded();
  await expect(licence).toBeVisible();
  await expect(licence).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
  await expect(page.getByText('Tyndale House').first()).toBeVisible();

  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);

  // no link breaks mid-word: a link's text is a name, and the credits wrap inside the screen
  const sideways = await page.evaluate(() => [...document.querySelectorAll('main a')].filter((a) => a.getBoundingClientRect().right > innerWidth).length);
  expect(sideways).toBe(0);

  // the round tutor button must not cover the last line
  const main = page.locator('main.screen');
  await main.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  const last = await page.locator('main li').last().boundingBox();
  const button = await page.locator('[data-ask-tutor]').boundingBox();
  expect(last && button && last.y + last.height).toBeLessThanOrEqual(button?.y ?? 0);
  await main.evaluate((el) => el.scrollTo(0, 0));

  await shot(page, 'about');
});
