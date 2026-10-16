import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { asSpoken } from '../support/lone-word';

// The engine is bsv-kit's honest fake (tests/support/honest-fakes.ts; headless Chromium has no Greek voice); how a real
// phone's voice sounds, and its long-press menu, are only a phone check (docs/pwa-best-practices.md section 12).
async function openReader(page: Page, msPerWord?: number) {
  await openUnlocked(page);
  await honestSpeech(page, msPerWord === undefined ? {} : { msPerWord });
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // The Due and New words strips draw once the words have been read from the store, and each pushes the text down
  // 24 px. A press aimed at where a word was before they came lands on a strip instead (the full-run failure), so
  // measure only once the page has stopped moving.
  await expect(page.getByRole('button', { name: /^Due: \d+$/ })).toBeVisible();
  await expect(page.getByTestId('new-words')).toBeVisible();
}


async function hold(page: Page, selector: string, ms: number, drag = 0) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (drag) await page.mouse.move(x + drag, y, { steps: 4 });
  await page.waitForTimeout(ms); // a real-time hold: with page.clock.install() the Reader's Due chip did not draw on a loaded host (7 of 18 runs, mw-5r3p30.388), so this spec stays on the real clock until that is found
  await page.mouse.up();
}

test('a long press on an English word says it in English, and opens no sheet', async ({ page }) => {
  await openReader(page);
  await hold(page, '[data-verse="1"] [data-chunk="0"]', 650);
  await expect.poll(() => spoken(page)).toMatchObject([{ text: 'Therefore', lang: 'en-US' }]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-verse="1"] [data-chunk="0"]')).toHaveCSS('user-select', 'none');
  await shot(page, 'long-press-speak');
});

test('a long press on a Greek word says it in Greek; a short tap opens the sheet; a drag says nothing', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await hold(page, '[data-verse="1"] [data-word="0"]', 650);
  await expect.poll(() => spoken(page)).toMatchObject([{ text: asSpoken('οὐδὲν'), lang: 'el-GR' }]);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await hold(page, '[data-verse="1"] [data-word="1"]', 650, 24);
  expect(await spoken(page)).toHaveLength(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await hold(page, '[data-verse="1"] [data-word="1"]', 50);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await spoken(page)).toHaveLength(1);
});

test('a word long-pressed and let go is still being spoken, and ends by itself', async ({ page }) => {
  // a slow reader (3 s a word): the word is still going when the finger is lifted at 650 ms
  await openReader(page, 3000);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await hold(page, '[data-verse="1"] [data-word="0"]', 650);
  const outcome = async () => (await spoken(page)).map((e) => ({ text: e.text, outcome: e.outcome }));
  expect(await outcome()).toEqual([{ text: asSpoken('οὐδὲν'), outcome: 'speaking' }]);
  await expect.poll(outcome).toEqual([{ text: asSpoken('οὐδὲν'), outcome: 'ended' }]);
});
