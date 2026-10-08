import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The engine is a stand-in that records what the page asks of it (headless Chromium has no Greek voice); how a real
// phone's voice sounds, and its long-press menu, are only a phone check (docs/pwa-best-practices.md section 12).
async function openReader(page: Page) {
  await openUnlocked(page);
  await page.addInitScript(() => {
    const spoken: { text: string; lang: string }[] = [];
    const synth = {
      speaking: false,
      pending: false,
      getVoices: () => [
        { lang: 'el-GR', name: 'Greek' },
        { lang: 'en-US', name: 'English' },
      ],
      addEventListener: () => {},
      removeEventListener: () => {},
      resume: () => {},
      cancel: () => {
        synth.speaking = false;
      },
      speak: (u: { text: string; lang: string }) => {
        spoken.push({ text: u.text, lang: u.lang });
        synth.speaking = true;
      },
    };
    class Utterance {
      lang = '';
      rate = 1;
      voice = null;
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
  });
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: { text: string; lang: string }[] }).__spoken);

async function hold(page: Page, selector: string, ms: number, drag = 0) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (drag) await page.mouse.move(x + drag, y, { steps: 4 });
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test('a long press on an English word says it in English, and opens no sheet', async ({ page }) => {
  await openReader(page);
  await hold(page, '[data-verse="1"] [data-chunk="0"]', 650);
  await expect.poll(() => spoken(page)).toEqual([{ text: 'Therefore', lang: 'en-US' }]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-verse="1"] [data-chunk="0"]')).toHaveCSS('user-select', 'none');
  await shot(page, 'long-press-speak');
});

test('a long press on a Greek word says it in Greek; a short tap opens the sheet; a drag says nothing', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await hold(page, '[data-verse="1"] [data-word="0"]', 650);
  await expect.poll(() => spoken(page)).toEqual([{ text: 'Οὐδὲν', lang: 'el-GR' }]);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await hold(page, '[data-verse="1"] [data-word="1"]', 650, 24);
  expect(await spoken(page)).toHaveLength(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await hold(page, '[data-verse="1"] [data-word="1"]', 50);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await spoken(page)).toHaveLength(1);
});
