// The 48 px floor under the foot of the page is kept only where the phone's bar can cover it (mw-njqj1b0, src/layout/barFloor.ts).
// A browser tab at 390x844 (the 'shots' project; the window is the screen) reports no inset and has no bar over the page: the space under the lowest
// pinned bar or sheet and under the last row of a scroll box is the inset (0 px), not 48. The installed app on the same phone (display-mode standalone,
// inset 0, the window the whole screen) keeps the 48 px, which the Governor's three-button bar needs (mw-5r3p30.42).
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { asInstalledApp, setDisplayMode, setReportedInset } from './installed';
import { openUnlocked } from './unlocked';

test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

const floorOf = (page: Page, name: '--lp-bar-inset' | '--lp-end-inset') =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:fixed;left:0;top:0;width:0;visibility:hidden;padding-bottom:var(${n})`;
    document.body.appendChild(probe);
    const px = parseFloat(getComputedStyle(probe).paddingBottom);
    probe.remove();
    return px;
  }, name);

/** The distance from the foot of the window to the bottom of the lowest pinned bar or of the last row of the box. */
async function gapUnder(page: Page, selector: string): Promise<number> {
  const rect = await page.locator(selector).last().boundingBox();
  const height = await page.evaluate(() => window.innerHeight);
  if (!rect) throw new Error(`${selector} has no box`);
  return height - (rect.y + rect.height);
}

/** Scrolls the first scroll box to its end and returns how far its lowest descendant ends above the box's foot. */
const lastRowGap = (page: Page): Promise<number> =>
  page.locator('.screen').first().evaluate((box) => {
    box.scrollTop = box.scrollHeight;
    const foot = box.getBoundingClientRect().bottom;
    let lowest = 0;
    for (const el of box.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.height > 0) lowest = Math.max(lowest, r.bottom);
    }
    return foot - lowest;
  });

async function openSettingsAccount(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/settings?group=account');
  await expect(page.getByRole('heading', { name: 'Account', exact: true, level: 1 })).toBeVisible();
}

test.describe('a browser tab (display mode browser, inset 0)', () => {
  test('both bottom insets are the reported inset, 0 px, and the last row of a scroll box ends at the foot', async ({ page }) => {
    await setDisplayMode(page, 'browser');
    await openSettingsAccount(page);
    expect(await floorOf(page, '--lp-bar-inset')).toBe(0);
    expect(await floorOf(page, '--lp-end-inset')).toBe(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-bar-overlap', /.*/);
    // scrolled to its end, the lowest thing in the box ends the box's own 1rem plus the inset (0 px here) above its foot
    const under = { gap: await lastRowGap(page) };
    // the box's own 1rem and the inset: 16 px, not 64
    expect(under.gap).toBeLessThanOrEqual(16.5);
    await shot(page, 'bar-floor-browser');
  });

  test('a pinned bottom sheet (the Talk sheet\'s composer) has no 48 px band under it', async ({ page }) => {
    await setDisplayMode(page, 'browser');
    await openUnlocked(page);
    await page.goto('/#/?c=8');
    const door = page.locator('[data-floating-tutor]');
    await expect(door).toBeVisible();
    await door.click();
    const composer = page.locator('[data-composer]').first();
    await expect(composer).toBeVisible();
    expect(await gapUnder(page, '[data-composer]')).toBeLessThanOrEqual(0.5);
    const padding = await composer.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    // 0.75rem of its own padding, no floor
    expect(padding).toBeLessThan(24);
  });

  test('a phone that reports an inset keeps it as reported', async ({ page }) => {
    await setDisplayMode(page, 'browser');
    await setReportedInset(page, 24);
    await openSettingsAccount(page);
    expect(await floorOf(page, '--lp-bar-inset')).toBe(24);
    expect(await floorOf(page, '--lp-end-inset')).toBe(24);
  });
});

test.describe('the installed app (display mode standalone, inset 0, the window is the screen)', () => {
  test('keeps the 48 px floor under the foot: the Talk sheet\'s composer and the last row', async ({ page }) => {
    await asInstalledApp(page);
    await openSettingsAccount(page);
    await expect(page.locator('html')).toHaveAttribute('data-bar-overlap', '');
    expect(await floorOf(page, '--lp-bar-inset')).toBe(48);
    expect(await floorOf(page, '--lp-end-inset')).toBe(48);
    expect(await lastRowGap(page)).toBeGreaterThanOrEqual(64 - 0.5);
    await page.goto('/#/?c=8');
    const door = page.locator('[data-floating-tutor]');
    await expect(door).toBeVisible();
    // the floating ? stands clear of the bar
    expect(await gapUnder(page, '[data-floating-tutor]')).toBeGreaterThanOrEqual(47.5);
    await door.click();
    const composer = page.locator('[data-composer]').first();
    await expect(composer).toBeVisible();
    const send = composer.getByRole('button').last();
    expect(await gapUnder(page, '[data-composer] button')).toBeGreaterThanOrEqual(47.5);
    await expect(send).toBeVisible();
    await shot(page, 'bar-floor-installed');
  });

  test('a window shorter than the screen drops the floor again', async ({ page }) => {
    await asInstalledApp(page);
    await openSettingsAccount(page);
    await expect(page.locator('html')).toHaveAttribute('data-bar-overlap', '');
    // the screen stays 844 px tall while the window is 700: the bar is outside the window
    await page.evaluate(() => {
      Object.defineProperty(window.screen, 'height', { configurable: true, value: 844 });
    });
    await page.setViewportSize({ width: 390, height: 700 });
    await expect(page.locator('html')).not.toHaveAttribute('data-bar-overlap', /.*/);
    expect(await floorOf(page, '--lp-bar-inset')).toBe(0);
  });
});
