import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Swipe the Reader's text to the next or previous chapter (mw-5r3p30.126) at 412x915. A phone-width layout claim: it runs under --project=shots.
test.use({ viewport: { width: 412, height: 915 }, hasTouch: true });

/** A drag with the mouse across the text, from (x1, y) to (x2, y). */
async function mouseSwipe(page: Page, x1: number, x2: number, y = 500) {
  await page.mouse.move(x1, y);
  await page.mouse.down();
  await page.mouse.move((x1 + x2) / 2, y + 4, { steps: 3 });
  await page.mouse.move(x2, y + 8, { steps: 3 });
  await page.mouse.up();
}

/** A finger drag, as touch input to the browser (pointer events of type touch). */
async function touchDrag(page: Page, from: [number, number], to: [number, number]) {
  const cdp = await page.context().newCDPSession(page);
  const at = (t: number) => ({ x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: at(i / 8).x, y: at(i / 8).y }] });
    await page.waitForTimeout(10);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('a left swipe on Romans 8 opens Romans 9 from the top; Back returns; a right swipe goes to Romans 7', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await mouseSwipe(page, 300, 120);
  await expect(page.getByRole('heading', { name: 'Romans 9', level: 1 })).toBeVisible();
  expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await mouseSwipe(page, 120, 300);
  await expect(page.getByRole('heading', { name: 'Romans 7', level: 1 })).toBeVisible();
});

test('a finger swipe changes chapter; a mostly vertical drag does not; the first and last chapters leave a note', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await touchDrag(page, [250, 600], [230, 200]);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-swipe-note]')).toHaveCount(0);
  await touchDrag(page, [330, 500], [90, 510]);
  await expect(page.getByRole('heading', { name: 'Romans 9', level: 1 })).toBeVisible();

  await page.goto('/#/?b=mat&c=1');
  await expect(page.getByRole('heading', { name: 'Matthew 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await touchDrag(page, [90, 500], [330, 500]);
  const note = page.locator('[data-swipe-note]');
  await expect(note).toContainText('This is the first chapter. Before it: the Preface');
  await expect(page.getByRole('heading', { name: 'Matthew 1', level: 1 })).toBeVisible();
  await shot(page, 'chapter-swipe-first');
  await note.getByRole('button', { name: 'the Preface' }).click();
  await expect(page).toHaveURL(/#\/preface$/);

  await page.goto('/#/?b=rev&c=22');
  await expect(page.getByRole('heading', { name: 'Revelation 22', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await touchDrag(page, [330, 500], [90, 500]);
  await expect(page.locator('[data-swipe-note]')).toContainText('You have reached the end of Revelation. Well done.');
  await expect(page.getByRole('heading', { name: 'Revelation 22', level: 1 })).toBeVisible();
});
