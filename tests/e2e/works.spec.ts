import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openGroup } from './settings-group';

const VIEWPORT = { width: 390, height: 844 };

// The Works row left Settings with the library (mw-rfjjzd.5): a commentary or a book is a row of Library > Commentaries, Off to start with, kept across a reload (it was mw-5r3p30.675).

test('Settings no longer lists the works; Library > Commentaries does, each Off to start with, a thumb-sized control, kept across a reload', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  // the door to the library is the first row of Study resources (mw-5r3p30.837)
  await expect(section.getByRole('button', { name: /^Your Logos library · \d+ books on$/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Works in your Logos library' })).toHaveCount(0);
  await expect(page.getByRole('switch', { name: "Calvin's Commentaries", exact: true })).toHaveCount(0);

  await page.goto('/#/library?kind=commentary');
  await expect(page.getByRole('heading', { name: 'Commentaries', level: 1 })).toBeVisible();
  const romans = page.getByRole('radiogroup', { name: 'CC Ro', exact: true });
  await expect(page.getByText('Commentary on the Epistle of Paul the Apostle to the Romans · John Calvin')).toBeVisible();
  await expect(romans.getByRole('radio', { name: 'Off', exact: true })).toHaveAttribute('aria-checked', 'true');
  for (const radio of await romans.getByRole('radio').all()) {
    const box = await radio.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
  }
  const row = await romans.boundingBox();
  expect((row?.x ?? 0) + (row?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await romans.getByRole('radio', { name: 'On', exact: true }).click();
  await expect(romans.getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'library-commentaries-calvin');

  await page.reload();
  await expect(page.getByRole('radiogroup', { name: 'CC Ro', exact: true }).getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radiogroup', { name: 'CC Jn', exact: true }).getByRole('radio', { name: 'Off', exact: true })).toHaveAttribute('aria-checked', 'true');
});
