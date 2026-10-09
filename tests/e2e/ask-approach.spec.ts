import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const PHONE = { width: 390, height: 844 };

/** A real 3000x2000 PNG, drawn by the page's own canvas, so the phone's shrinking has something to do. */
async function bigPicture(page: import('@playwright/test').Page, shade: number): Promise<Buffer> {
  const url = await page.evaluate((s) => {
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 2000;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    const gradient = context.createLinearGradient(0, 0, 3000, 2000);
    gradient.addColorStop(0, `hsl(${s}, 70%, 40%)`);
    gradient.addColorStop(1, `hsl(${s + 120}, 70%, 70%)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 3000, 2000);
    context.fillStyle = '#fff';
    context.font = '200px serif';
    context.fillText('ἀγάπη', 200, 600);
    return canvas.toDataURL('image/png');
  }, shade);
  return Buffer.from(url.split(',')[1], 'base64');
}

test('Ask for another approach at phone width: the sheet, two shrunk pictures, Send above the keyboard, Sent', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/settings');

  const open = page.getByRole('button', { name: 'Ask for another approach' });
  await open.scrollIntoViewIfNeeded();
  expect((await open.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await open.click();

  const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
  await expect(sheet).toBeVisible();
  const text = sheet.getByLabel('What approach, and how does it teach?');
  const name = sheet.getByLabel('Who to credit', { exact: true });
  const link = sheet.getByLabel('Link', { exact: true });
  const send = sheet.getByRole('button', { name: 'Send' });
  const done = sheet.getByRole('button', { name: 'Done' });
  await expect(send).toBeDisabled();

  await sheet.getByLabel('Add a screenshot or photo').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: await bigPicture(page, 10) },
    { name: 'two.png', mimeType: 'image/png', buffer: await bigPicture(page, 200) },
  ]);
  await expect(sheet.locator('[data-picture]')).toHaveCount(2);
  await text.fill('Teach the cases with colours, one at a time.');
  await name.fill('Anna Example');
  await link.fill('example.org/greek');
  await expect(send).toBeEnabled();

  // Every control clears 48 px and fits the phone's width; the fields do not make the phone zoom (16 px or more).
  const controls = [done, send, sheet.getByRole('textbox').first(), name, link, ...(await sheet.getByRole('button', { name: /^Remove picture/ }).all())];
  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect(box?.width).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
  }
  const picker = await sheet.getByText('Add a screenshot or photo').boundingBox();
  expect(picker?.height).toBeGreaterThanOrEqual(47.5);
  for (const field of [text, name, link]) expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);

  // The keyboard takes about 300 px of the height (interactive-widget=resizes-content): Send is still on the screen.
  await name.focus();
  await page.setViewportSize({ width: PHONE.width, height: 544 });
  const sendBox = await send.boundingBox();
  expect(sendBox).not.toBeNull();
  expect((sendBox?.y ?? 0) + (sendBox?.height ?? 0)).toBeLessThanOrEqual(544);
  expect(sendBox?.y).toBeGreaterThanOrEqual(0);
  await page.setViewportSize(PHONE);
  await text.evaluate((el) => {
    (el.parentElement?.parentElement as HTMLElement).scrollTop = 0;
  });
  await shot(page, 'ask-approach');

  await send.click();
  await expect(sheet.getByText('Sent: the factory has it')).toBeVisible();
  expect(fake.received).toHaveLength(1);
  const [got] = fake.received;
  expect(got.grist).toMatchObject({ app: 'lampas', kind: 'feedback' });
  expect(got.input).toMatchObject({ kind: 'grammar-approach', credit: { name: 'Anna Example', url: 'https://example.org/greek' } });
  expect(got.attachments).toHaveLength(2);
  for (const file of got.attachments) {
    expect(file.mime).toBe('image/jpeg');
    expect(file.size).toBeLessThan(300 * 1024 + 200);
  }
  await done.click();
  await expect(sheet).toHaveCount(0);
});
