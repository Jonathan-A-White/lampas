// tests/e2e/paste-cut.spec.ts — a paste past a short field's limit says what was cut (mw-5r3p30.462 sweep): the browser keeps what fits of a paste into a box with a
// maxLength and says nothing, so the box does (src/ui/LimitedField.tsx). Settings > About you > Background, a real paste from the clipboard.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test('a paste past the limit of About you > Background keeps what fits and says the rest was cut', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openUnlocked(page);
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'About you' }).click();
  const box = page.getByRole('textbox', { name: 'Background' });
  const max = Number(await box.getAttribute('maxlength'));
  expect(max).toBeGreaterThan(0);
  await page.evaluate((text) => navigator.clipboard.writeText(text), 'b'.repeat(max + 50));
  await box.click();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(box).toHaveValue('b'.repeat(max));
  const note = page.locator('[data-cut-note]');
  await expect(note).toHaveText(`You pasted ${max + 50} characters and ${max} fit (the box takes ${max}): the rest was cut off.`);
  await expect(note).toBeInViewport();
  await shot(page, 'paste-cut');
  await page.keyboard.press('Backspace');
  await expect(note).toHaveCount(0);
});
