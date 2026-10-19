// tests/e2e/request-devotional.spec.ts — Settings > Daily > Request a devotional (mw-1fwagb.8): he types the title of a devotional of his Logos library
// and Send posts it through the one feedback sender (a 'feedback' grist of the kind devotional, network stubbed with the fake Postern); the row then
// says Sent: the factory has it. The box and Send fit the phone, and the field does not make the phone zoom.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const PHONE = { width: 390, height: 844 };
const TITLE = "Spurgeon, Faith's Checkbook";

test('Request a devotional: the title goes to the factory as kind devotional, and he is thanked', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/settings');

  const group = page.getByRole('group', { name: 'Request a devotional' });
  await group.scrollIntoViewIfNeeded();
  const open = group.getByRole('button', { name: 'Request a devotional' });
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  const box = group.getByRole('textbox', { name: 'Devotional title' });
  const send = group.getByRole('button', { name: 'Send' });
  await expect(send).toBeDisabled();

  for (const control of [open, box, send]) {
    const size = await control.boundingBox();
    expect(size?.height).toBeGreaterThanOrEqual(47.5);
    expect((size?.x ?? 0) + (size?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  }
  expect(await box.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  await box.fill(TITLE);
  await expect(send).toBeEnabled();
  await send.click();
  await expect(group.getByRole('status')).toHaveText('Sent: the factory has it');
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input).toMatchObject({ kind: 'devotional', name: TITLE });
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'request-devotional-sent');
});
