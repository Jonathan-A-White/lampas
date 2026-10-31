// tests/e2e/shot.ts: one full-page screenshot per e2e spec, taken at whatever viewport the running
// Playwright project sets (the 'shots' project uses 390x844), written to shots/<name>.png.
// While the Talk sheet is open the PAGE is as tall as the conversation (src/talk/documentScroll.ts, so the phone's scroll capture can scroll it), and a full-page
// picture would be that whole height with the sheet fixed in its first screen: the shot is the window then, which is what he sees.
import type { Page } from '@playwright/test';

export async function shot(page: Page, name: string): Promise<void> {
  const talkScrolls = await page.evaluate(() => document.documentElement.classList.contains('lp-talk-scroll')).catch(() => false);
  await page.screenshot({ path: `shots/${name}.png`, fullPage: !talkScrolls });
}
