// tests/e2e/talk-fit.spec.ts — the Reader's Talk bar fits the phone (mw-5r3p30.182): at 844 x 390 (held sideways) the whole bar and the Talk sheet's
// 'Hold to talk' bar are inside the window, at 390 x 844 they are as they were, and every control of them is a 44 px target. jsdom has no layout, so it is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

async function openReader(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await expect(page.locator('[data-talk-bar]')).toBeVisible();
}

async function box(el: Locator) {
  const b = await el.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

async function insideWindow(el: Locator, height: number) {
  const b = await box(el);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(height + 0.5);
}

for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
  const name = `${viewport.width} x ${viewport.height}`;

  test(`${name}: the Reader's Talk bar is whole inside the window and a 44 px target`, async ({ page }) => {
    await openReader(page, viewport);
    await insideWindow(page.locator('[data-talk-bar]'), viewport.height);
    const talk = page.getByRole('button', { name: 'Talk', exact: true });
    await insideWindow(talk, viewport.height);
    expect((await box(talk)).height).toBeGreaterThanOrEqual(43.5);
    // the reading box keeps some height to read in
    expect((await box(page.locator('[data-reader]'))).height).toBeGreaterThan(viewport.height > 500 ? 300 : 120);
    // sideways the box is no smaller than it was (136 px with the chips row up) and the Talk button stays 56 px (mw-5r3p30.194)
    if (viewport.height < 500) {
      await expect(page.getByTestId('reader-chips')).toBeVisible();
      expect((await box(page.locator('[data-reader]'))).height).toBeGreaterThanOrEqual(135.5);
      expect((await box(talk)).height).toBeCloseTo(56, 0);
    }
    // the round Ask button sits above the bar, not over it
    const ask = await box(page.locator('[data-ask-tutor]'));
    expect(ask.y + ask.height).toBeLessThanOrEqual((await box(page.locator('[data-talk-bar]'))).y + 0.5);
    await shot(page, `talk-fit-bar-${viewport.width}`);
  });

  test(`${name}: the Talk sheet's 'Hold to talk' bar is whole inside the window and a 44 px target`, async ({ page }) => {
    await openReader(page, viewport);
    await page.getByRole('button', { name: 'Talk', exact: true }).click();
    const sheet = page.getByRole('dialog');
    const hold = sheet.getByRole('button', { name: 'Hold to talk' });
    await expect(hold).toBeVisible();
    await insideWindow(hold, viewport.height);
    expect((await box(hold)).height).toBeGreaterThanOrEqual(43.5);
    await shot(page, `talk-fit-sheet-${viewport.width}`);
  });
}
