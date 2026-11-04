// tests/e2e/open-in-app.spec.ts — 'Open in the app' (mw-5r3p30.1041): in a Chrome tab on Android where navigator.getInstalledRelatedApps (stubbed here: a real install
// cannot be made in a test) reports the app, one labelled control shows at 360x740 and 390x844, at 100 % and at larger text. It is clear of the floating ? and of the Reader's
// heading and text, no wider than the phone, and 'Not now' puts it away for the session. Nothing leaves the page by itself: the address is as it was opened. The tap's intent: URL is
// proven in tests/unit/open-in-app.test.tsx (a desktop Chromium cannot follow an intent: address). Ends with a shot.
import { expect, test, type Page } from '@playwright/test';
import { openWithTextSize, PHONES } from './next-in-view';
import { FLOATING } from './open-tutor';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
test.use({ hasTouch: true, userAgent: ANDROID });

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function stubApi(page: Page, apps: unknown[]): Promise<void> {
  await page.addInitScript((list) => {
    Object.defineProperty(navigator, 'getInstalledRelatedApps', { value: () => Promise.resolve(list), configurable: true });
  }, apps);
}

const WEBAPP = [{ platform: 'webapp', url: 'https://lampas.allmymind.org/manifest.webmanifest' }];

for (const phone of PHONES.filter((p) => p.size.width < 400)) {
  for (const percent of [100, 130, 160]) {
    test(`${phone.name} at ${percent} % text: the control is clear of the ? and the reading text, fits, and Not now puts it away`, async ({ page }) => {
      const navigations: string[] = [];
      page.on('framenavigated', (frame) => frame.parentFrame() === null && navigations.push(frame.url()));
      await page.setViewportSize(phone.size);
      await stubApi(page, WEBAPP);
      await openUnlocked(page);
      await openWithTextSize(page, '#/', percent);
      const origin = new URL(page.url()).origin;
      const strip = page.locator('[data-open-in-app]');
      const open = strip.getByRole('button', { name: 'Open in the app' });
      await expect(open).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      const view = page.viewportSize()!;
      const stripBox = (await strip.boundingBox())!;
      expect(stripBox.x, 'strip left').toBeGreaterThanOrEqual(0);
      expect(stripBox.x + stripBox.width, 'strip right').toBeLessThanOrEqual(view.width);
      for (const control of [open, strip.getByRole('button', { name: 'Not now' })]) {
        const box = (await control.boundingBox())!;
        expect(box.height, 'a thumb-sized target').toBeGreaterThanOrEqual(43.5);
        expect(box.x + box.width).toBeLessThanOrEqual(view.width);
        expect(await control.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'its label is not clipped').toBe(true);
        const door = page.locator(FLOATING);
        if (await door.isVisible()) expect(meets(box, (await door.boundingBox())!), 'the ? is over it').toBe(false);
      }
      // the reading text starts below the strip: the strip is in the flow, not over it
      const heading = (await page.getByRole('heading', { name: 'Romans 8', level: 1 }).boundingBox())!;
      expect(meets(stripBox, heading), `the strip ${JSON.stringify(stripBox)} covers the heading ${JSON.stringify(heading)}`).toBe(false);
      const text = (await page.locator('[data-shell] .screen, [data-shell] main').first().boundingBox())!;
      expect(text.y, 'the reading box starts below the strip').toBeGreaterThanOrEqual(stripBox.y + stripBox.height - 1);
      // nothing left the page by itself: no top-level navigation to another document or an intent: address, still the app's own origin
      await page.waitForTimeout(500); // a short hold so an automatic hand-over would have happened
      expect(navigations.filter((url) => !url.startsWith(origin)), 'left the app').toEqual([]);
      await shot(page, `open-in-app-${phone.name}-${percent}`);

      await strip.getByRole('button', { name: 'Not now' }).click();
      await expect(strip).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      await expect(strip).toHaveCount(0);
    });
  }
}

test('shows nothing where the API reports nothing, or is absent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, []);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-open-in-app]')).toHaveCount(0);
  await shot(page, 'open-in-app-none');
});

test('never shows inside the installed app (display-mode standalone)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, WEBAPP);
  await page.emulateMedia({ media: null });
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => (/display-mode:\s*standalone/.test(query) ? Object.assign(real('all'), { matches: true, media: query }) : real(query));
  });
  await openUnlocked(page);
  await page.goto('/#/?ref=Rom.8.28');
  await expect(page.locator('[data-shell]')).toBeVisible();
  await expect(page.locator('[data-open-in-app]')).toHaveCount(0);
  expect(page.url()).toMatch(/^http:\/\/localhost/);
});
