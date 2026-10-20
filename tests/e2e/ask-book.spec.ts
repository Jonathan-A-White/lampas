import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const PHONE = { width: 390, height: 844 };
const MOUNCE = 'Mounce, Basics of Biblical Greek';

test('Ask for another book at phone width: the box and Send fit, offline it waits, back online it goes', async ({ page, context }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/settings?group=study');
  await page.getByRole('switch', { name: 'Logos', exact: true }).click();

  const group = page.getByRole('group', { name: 'Ask for another book' });
  const open = group.getByRole('button', { name: 'Ask for another book' });
  await group.scrollIntoViewIfNeeded();
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  const box = group.getByRole('textbox', { name: 'Book title' });
  const send = group.getByRole('button', { name: 'Send', exact: true });
  await expect(send).toBeDisabled();

  // Every control clears 48 px and fits the phone's width; the field does not make the phone zoom (16 px or more).
  for (const control of [open, box, send]) {
    const size = await control.boundingBox();
    expect(size?.height).toBeGreaterThanOrEqual(47.5);
    expect((size?.x ?? 0) + (size?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  }
  expect(await box.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  // Offline: the request waits on the phone.
  await context.setOffline(true);
  await box.fill(MOUNCE);
  await send.click();
  await expect(group.getByText(`Waiting to send: ${MOUNCE}`)).toBeVisible();
  await expect(group.getByText('It goes when you are back online.')).toBeVisible();
  expect(fake.received).toHaveLength(0);
  await shot(page, 'ask-book-waiting');

  // Back online: it goes by itself.
  await context.setOffline(false);
  await expect(group.getByText(`Asked: ${MOUNCE}`)).toBeVisible();
  await expect(group.getByText(`Waiting to send: ${MOUNCE}`)).toHaveCount(0);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input).toMatchObject({ kind: 'grammar-book', text: MOUNCE });
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'ask-book-asked');
});
