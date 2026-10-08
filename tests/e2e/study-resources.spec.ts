import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('Study resources at phone width: thumb-sized switches in Settings, and a Study row on the word sheet', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const section = page.getByRole('region', { name: 'Study resources' });
  await section.scrollIntoViewIfNeeded();
  for (const name of ["Strong's", 'Logos', 'Accordance']) {
    const control = section.getByRole('switch', { name, exact: true });
    await expect(control).toHaveAttribute('aria-checked', 'false');
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await section.getByRole('switch', { name: "Strong's", exact: true }).click();
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  await section.getByRole('textbox', { name: 'Logos resource' }).fill('bdag');
  const field = await section.getByRole('textbox', { name: 'Logos resource' }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(field).toBeGreaterThanOrEqual(16);
  await shot(page, 'settings-resources');

  await page.reload();
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  const study = page.getByRole('dialog', { name: 'Word' }).getByRole('group', { name: 'Study' });
  await expect(study).toBeInViewport();
  await expect(study.getByRole('link', { name: 'G4903', exact: true })).toHaveAttribute('href', 'https://www.stepbible.org/?q=strong=G4903');
  const logos = study.getByRole('link', { name: 'Open in Logos', exact: true });
  await expect(logos).toHaveAttribute('href', /^https:\/\/ref\.ly\/logosres\/bdag\?hw=/);
  const box = await logos.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await shot(page, 'word-sheet-study');
});
