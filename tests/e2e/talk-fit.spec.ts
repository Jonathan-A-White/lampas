// tests/e2e/talk-fit.spec.ts — the Talk sheet fits the phone (mw-5r3p30.182; the Reader's Talk bar went in mw-5r3p30.882): at 844 x 390 (held sideways) the sheet's
// 'Hold to talk' bar is inside the window, at 390 x 844 it is as it was, and every control of it is a 44 px target. jsdom has no layout, so it is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openTutor } from './open-tutor';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

async function openReader(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await expect(page.locator('[data-floating-tutor]')).toBeVisible();
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

  test(`${name}: the Talk sheet's 'Hold to talk' bar is whole inside the window and a 44 px target`, async ({ page }) => {
    await openReader(page, viewport);
    await openTutor(page);
    const sheet = page.getByRole('dialog');
    const hold = sheet.getByRole('button', { name: 'Hold to talk' });
    await expect(hold).toBeVisible();
    await insideWindow(hold, viewport.height);
    expect((await box(hold)).height).toBeGreaterThanOrEqual(43.5);
    await shot(page, `talk-fit-sheet-${viewport.width}`);
  });
}
