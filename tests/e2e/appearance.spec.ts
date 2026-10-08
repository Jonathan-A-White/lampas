// tests/e2e/appearance.spec.ts — Theme, Text size and the speech speeds at phone width: the palettes as the browser
// paints them, the 44 px floor at every text size, and the saved choices after a reload (features/appearance.feature
// proves the same choices in jsdom, where there is no layout and no colour).
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 44 px is the floor; a word must clear it by a pixel so one font's metrics can shave a little and it still holds.
const TAP_WITH_MARGIN = 45;
const DARK_CANVAS = 'rgb(10, 14, 23)';
const LIGHT_CANVAS = 'rgb(243, 245, 249)';

const canvasOf = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const barOf = (page: Page) => page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content'));

async function openReader(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}
async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
}
async function backToReader(page: Page) {
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}
const choose = (page: Page, group: string, label: string) =>
  page.getByRole('group', { name: group }).getByRole('button', { name: label, exact: true }).click();

test('Theme Phone follows a dark colour scheme and a light one', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openReader(page);
  expect(await canvasOf(page)).toBe(DARK_CANVAS);
  expect(await barOf(page)).toBe('#0a0e17');
  // the phone switches while the app is open
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => canvasOf(page)).toBe(LIGHT_CANVAS);
  await expect.poll(() => barOf(page)).toBe('#f3f5f9');
  await openSettings(page);
  await expect(page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Phone', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'settings-light');
});

test('Theme Dark makes the reader dark whatever the phone says', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openReader(page);
  expect(await canvasOf(page)).toBe(LIGHT_CANVAS);
  await openSettings(page);
  await choose(page, 'Theme', 'Dark');
  await expect.poll(() => canvasOf(page)).toBe(DARK_CANVAS);
  expect(await barOf(page)).toBe('#0a0e17');
  await expectFitsPhone(page);
  await shot(page, 'settings-dark');

  await backToReader(page);
  expect(await canvasOf(page)).toBe(DARK_CANVAS);
  const colour = await page.locator('[data-verse="1"]').evaluate((el) => getComputedStyle(el).color);
  expect(colour).toBe('rgb(231, 235, 243)');
  await shot(page, 'reader-dark');

  // Light is light, on a phone that says dark
  await page.emulateMedia({ colorScheme: 'dark' });
  await openSettings(page);
  await choose(page, 'Theme', 'Light');
  await expect.poll(() => canvasOf(page)).toBe(LIGHT_CANVAS);
});

test('Text size Large makes the verse text larger and every tap target stays at least 44 px tall', async ({ page }) => {
  await openReader(page);
  const sizeOf = () => page.locator('[data-verse="1"]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const normal = await sizeOf();

  const tapTargets = async () => {
    const boxes = [
      await page.locator('[data-verse="1"] [data-chunk="0"]').boundingBox(),
      await page.getByRole('button', { name: 'Verse 1', exact: true }).boundingBox(),
      await page.getByRole('button', { name: 'Greek', exact: true }).boundingBox(),
      await page.getByRole('button', { name: 'Settings', exact: true }).boundingBox(),
      await page.locator('[data-verse="1"]').getByRole('button', { name: 'Hear the verse' }).boundingBox(),
    ];
    return boxes.map((b) => b?.height ?? 0);
  };

  for (const label of ['Small', 'Large', 'Largest']) {
    await openSettings(page);
    await choose(page, 'Text size', label);
    // the Settings choices themselves keep their height at this size
    for (const button of await page.getByRole('group', { name: 'Text size' }).getByRole('button').all()) {
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    }
    for (const control of [page.getByRole('group', { name: 'Theme' }).getByRole('button').first(), page.getByRole('slider', { name: 'Greek speed' })]) {
      expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    }
    await expectFitsPhone(page);
    await backToReader(page);
    const size = await sizeOf();
    if (label === 'Small') expect(size).toBeLessThan(normal);
    else expect(size).toBeGreaterThan(normal);
    // the bar keeps the phone's own size, so the chapter title is never cut short by the switch beside it
    const title = page.getByRole('heading', { name: 'Romans 8', level: 1 });
    expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const height of await tapTargets()) expect(height).toBeGreaterThanOrEqual(label === 'Small' ? 43.5 : TAP_WITH_MARGIN - 1);
    // Greek view too: the tallest line
    await page.getByRole('button', { name: 'Greek', exact: true }).click();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
    expect((await page.locator('[data-verse="1"] [data-word="1"]').boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    await expectFitsPhone(page);
    if (label === 'Large') await shot(page, 'reader-large-text');
    await page.getByRole('button', { name: 'English', exact: true }).click();
  }
});

// The engine is a stand-in that records what the page asks of it (headless Chromium has no Greek voice).
async function withVoices(page: Page) {
  await page.addInitScript(() => {
    const spoken: { text: string; lang: string; rate: number }[] = [];
    // one array: Settings lists the voices, and a new array on each call would read as a change forever
    const voices = [{ lang: 'el-GR', name: 'Greek', voiceURI: 'Greek' }];
    const synth = {
      speaking: false,
      pending: false,
      getVoices: () => voices,
      addEventListener: () => {},
      removeEventListener: () => {},
      resume: () => {},
      cancel: () => {
        synth.speaking = false;
      },
      speak: (u: { text: string; lang: string; rate: number }) => {
        spoken.push({ text: u.text, lang: u.lang, rate: u.rate });
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
}
const lastRate = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: { rate: number }[] }).__spoken.at(-1)?.rate);

test('a slower Greek rate slows a Greek speaker button and leaves English at its own rate, and a slower English rate slows English only', async ({ page }) => {
  await withVoices(page);
  await openReader(page);
  const play = page.locator('[data-verse="1"]').getByRole('button', { name: 'Hear the verse' });
  await play.click();
  expect(await lastRate(page)).toBe(1);
  await play.click();
  const showGreek = async () => {
    await page.getByRole('button', { name: 'Greek', exact: true }).click();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  };

  await openSettings(page);
  const english = page.getByRole('slider', { name: 'English speed' });
  const greek = page.getByRole('slider', { name: 'Greek speed' });
  await expect(english).toHaveValue('1');
  await expect(greek).toHaveValue('1');
  expect((await greek.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await greek.fill('0.6');
  await expect(greek).toHaveValue('0.6');
  await expect(english).toHaveValue('1');
  // the English slider changes nothing about Greek
  await english.fill('0.8');
  await expect(english).toHaveValue('0.8');
  await expectFitsPhone(page);
  await shot(page, 'settings-speed');

  await backToReader(page);
  // the reader shows English: its play button reads English, at the English rate
  await play.click();
  expect(await lastRate(page)).toBe(0.8);
  await play.click();
  await showGreek();
  await play.click();
  expect(await lastRate(page)).toBe(0.6);
});

test('Theme, Text size and both rates survive a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await withVoices(page);
  await openReader(page);
  await openSettings(page);
  await choose(page, 'Theme', 'Dark');
  await choose(page, 'Text size', 'Largest');
  await page.getByRole('slider', { name: 'English speed' }).fill('0.7');
  await page.getByRole('slider', { name: 'Greek speed' }).fill('1.3');
  await expect(page.getByRole('slider', { name: 'Greek speed' })).toHaveValue('1.3');
  // let the saves land
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(await canvasOf(page)).toBe(DARK_CANVAS);
  await expect(page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Text size' }).getByRole('button', { name: 'Largest', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'English speed' })).toHaveValue('0.7');
  await expect(page.getByRole('slider', { name: 'Greek speed' })).toHaveValue('1.3');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('25.6px');
  await backToReader(page);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Hear the verse' }).click();
  expect(await lastRate(page)).toBe(1.3);
});
