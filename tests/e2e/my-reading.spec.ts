import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, READING_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
/** The fake clip: 0.2 s of silence as a WAV (8 kHz, 8 bit, mono), so Chromium can decode what the app keeps and plays: 44 header bytes and 1600 samples. */
const CLIP_BYTES = 1644;

// The Chromium of the gate has no microphone and no sound card: a MediaRecorder that keeps a clip of known size and content stands in, and playing is
// recorded rather than heard (the page's audio elements are asked to play; the clip behind their src is checked below).
async function fakeMedia(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const wav = new Uint8Array(44 + 1600);
    const view = new DataView(wav.buffer);
    const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
    text(0, 'RIFF');
    view.setUint32(4, 36 + 1600, true);
    text(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 8000, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    text(36, 'data');
    view.setUint32(40, 1600, true);
    wav.fill(128, 44);
    const stream = { getTracks: () => [{ stop() {} }] };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    class FakeMediaRecorder {
      static isTypeSupported = (mime: string) => mime === 'audio/webm;codecs=opus';
      mimeType = 'audio/webm;codecs=opus';
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob([wav], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
    const played: string[] = [];
    (window as unknown as { played: string[] }).played = played;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      played.push(this.src);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {};
  });
}

async function holdFor(page: Page, button: ReturnType<Page['getByRole']>, ms: number): Promise<void> {
  const box = await button.boundingBox();
  if (!box) throw new Error('the button is not on the page');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Reads verse 28 in English through the fake mill and waits for the result. */
async function readVerse28(page: Page) {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: READING_ANSWER };
  await routePostern(page, fake);
  await fakeMedia(page);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), 1200);
  await expect(panel.locator('[data-fix]')).toHaveText(['together', 'purpose']);
  return panel;
}

async function findDeveloperMode(page: Page): Promise<void> {
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
  const version = page.getByTestId('build-version');
  await version.scrollIntoViewIfNeeded();
  expect((await version.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  for (let i = 0; i < 7; i++) await version.click();
  await expect(page.getByRole('status')).toContainText('Developer mode is on');
}

test('Play my reading plays the clip he recorded, and Download my recording is not there', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const panel = await readVerse28(page);

  const play = panel.getByRole('button', { name: 'Play my reading', exact: true });
  expect((await play.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await expect(panel.getByRole('button', { name: 'Download my recording' })).toHaveCount(0);
  await play.click();
  await expect(panel.getByRole('button', { name: 'Stop my reading', exact: true })).toBeVisible();

  const audio = panel.locator('audio[data-my-reading]');
  const src = await audio.getAttribute('src');
  expect(src).toMatch(/^blob:/);
  expect(await page.evaluate(() => (window as unknown as { played: string[] }).played)).toEqual([src]);
  // the blob behind the src is the recording
  const clip = await page.evaluate(async (url) => {
    const blob = await (await fetch(url)).blob();
    return { size: blob.size, type: blob.type };
  }, src as string);
  expect(clip).toEqual({ size: CLIP_BYTES, type: 'audio/webm' });
  // and the element took it as sound
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(0.1);
  await shot(page, 'my-reading');
});

test('Developer mode: seven taps on the version number on About, its switch in Settings kept across a reload, and Download my recording', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const panel = await readVerse28(page);
  await expect(panel.getByRole('button', { name: 'Download my recording' })).toHaveCount(0);

  await findDeveloperMode(page);
  await page.goto('/#/settings');
  const group = page.getByRole('group', { name: 'Developer mode' });
  await expect(group.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // kept across a reload
  await page.reload();
  await expect(page.getByRole('group', { name: 'Developer mode' }).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // the reading check now offers the download, and it saves lampas-<ref>-<UTC time>.webm
  await page.goto('/#/?c=8');
  await chooseAction(page, 28, 'Read it aloud');
  const result = page.getByRole('region', { name: 'Reading check' });
  const download = result.getByRole('button', { name: 'Download my recording', exact: true });
  await expect(download).toBeVisible();
  expect((await download.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  const [file] = await Promise.all([page.waitForEvent('download'), download.click()]);
  expect(file.suggestedFilename()).toMatch(/^lampas-rom\.8\.28-\d{8}T\d{6}Z\.webm$/);
  await shot(page, 'my-reading-developer');
});
