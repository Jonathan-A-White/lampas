// tests/e2e/installed.ts — makes a page behave as the INSTALLED app on a phone with three-button navigation (mw-njqj1b0): display-mode standalone,
// the window as tall as the screen (the 'shots' project's viewport is its screen), and, where `inset` is given, the safe-area bottom the phone reports.
// The 48 px floor under the foot of the page applies only there (src/layout/barFloor.ts); a spec that asks for it calls this before it opens the page.
import type { Page } from '@playwright/test';

export type DisplayMode = 'standalone' | 'minimal-ui' | 'fullscreen' | 'browser';

/** Makes `(display-mode: <mode>)` match, for this page and each page it opens next (call before the first goto). Chromium's CDP media override has no
 * display-mode feature (Emulation.setEmulatedMedia ignores it), so window.matchMedia is wrapped: only a display-mode query is answered here. */
export async function setDisplayMode(page: Page, mode: DisplayMode): Promise<void> {
  await page.addInitScript((wanted) => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string): MediaQueryList => {
      const m = /^\(display-mode:\s*([a-z-]+)\)$/.exec(query.trim());
      if (!m) return real(query);
      const list = real('all');
      Object.defineProperty(list, 'matches', { value: m[1] === wanted });
      Object.defineProperty(list, 'media', { value: query });
      return list;
    };
  }, mode);
}

/** The phone reports a bottom inset of `px` (0 clears the override). */
export async function setReportedInset(page: Page, px: number): Promise<void> {
  if (px === 0) return;
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: px, right: 0 } });
}

/** The installed app on a phone that does not report its navigation bar: the Governor's case. */
export async function asInstalledApp(page: Page): Promise<void> {
  await setDisplayMode(page, 'standalone');
}
