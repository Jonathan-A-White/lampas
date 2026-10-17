// tests/e2e/talk-offer-speaking.spec.ts — a setting offer taken in the Talk sheet while the answer is being read aloud (mw-5r3p30.224): at 390 x 844 the
// speaking bar (Pause, Restart, Stop) and the composer leave the sheet's scroll box about 190 px, and the confirmation line (Changed: ..., Undo, Copy) that
// the tap draws sat partly under the bar until he scrolled to it. The box now scrolls to the confirmation, and the bar stays whole. jsdom has no layout.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('while the answer is read aloud, taking a setting offer shows the whole confirmation line in the sheet, and the speaking bar is whole', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: {
      answer:
        'Greek can be hard to follow at full speed. I can read the Greek a little slower for you, and you can change it back at any time in Settings. ' +
        'Some people like it at eighty percent, others at sixty, so tell me if you want a different pace and I will offer that instead. ' +
        'The change takes effect the next time a verse is read to you.',
      words: [],
      setting_offer: { key: 'greekRate', value: 0.8 },
    },
  };
  await routePostern(page, fake);
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Can the Greek be slower?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-setting-offer]')).toBeVisible();

  // read the answer aloud: the bar shows between the scroll box and the composer
  await sheet.getByRole('button', { name: 'Read aloud', exact: true }).click();
  const bar = page.getByRole('region', { name: 'Speaking', exact: true });
  await expect(bar).toBeVisible();

  // he has read down to the offer (its button at the foot of the scroll box, as the sheet leaves it when the answer comes) and taps it
  const offer = sheet.locator('[data-setting-offer]').getByRole('button');
  await offer.evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await offer.click();
  const changed = sheet.locator('[data-talk-change]');
  await expect(changed).toBeVisible();

  // the whole confirmation (the Changed line with Undo, and the Copy beneath it) is inside the scroll box, above the bar
  const list = sheet.locator('[data-talk-list]');
  const copyButton = sheet.getByRole('button', { name: 'Copy this exchange', exact: true });
  await expect
    .poll(async () => {
      const l = await list.boundingBox();
      const inside = async (el: typeof changed) => {
        const c = await el.boundingBox();
        return !!l && !!c && c.y >= l.y - 0.5 && c.y + c.height <= l.y + l.height + 0.5;
      };
      return (await inside(changed)) && (await inside(copyButton));
    }, { message: 'the Changed line and the Copy under it lie inside the scroll box' })
    .toBe(true);
  const l = (await list.boundingBox())!;
  const b = (await bar.boundingBox())!;
  expect(l.y + l.height).toBeLessThanOrEqual(b.y + 1);
  const undo = (await sheet.getByRole('button', { name: 'Undo Greek speed' }).boundingBox())!;
  expect(undo.y + undo.height).toBeLessThanOrEqual(l.y + l.height + 0.5);

  // the speaking bar is whole: its three buttons are thumb-sized and inside the window
  await expect(bar.getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  for (const name of ['Pause', 'Restart', 'Stop']) {
    const k = (await bar.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(k.height).toBeGreaterThanOrEqual(43.5);
    expect(k.x).toBeGreaterThanOrEqual(0);
    expect(k.x + k.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(k.y + k.height).toBeLessThanOrEqual(VIEWPORT.height);
  }
  await shot(page, 'talk-offer-speaking');
});
