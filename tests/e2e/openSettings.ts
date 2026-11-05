// tests/e2e/openSettings.ts — the one place a Playwright spec names the Reader header's Settings door and the Settings screen's heading (mw-5r3p30.839).
// When the door moves (a menu, a Tools screen), this file changes and the specs do not. The jsdom twin is tests/unit/openSettings.tsx.
import type { Locator, Page } from '@playwright/test';

/** Where to look: the whole page, or a box on it (the Reader's header). */
type Scope = Page | Locator;

/** The Settings door, for a check of where it sits or whether it shows. */
export const settingsDoor = (where: Scope): Locator => where.getByRole('button', { name: 'Settings', exact: true });

/** The Settings screen's heading, for a check that Settings is open (or is not). */
export const settingsHeading = (where: Scope): Locator => where.getByRole('heading', { name: 'Settings', exact: true, level: 1 });

/** Taps the Settings door. It does not wait for the heading: Settings may open on the page it was last left on (a group's page, with that group's title), so a spec that expects the home waits with `expect(settingsHeading(page)).toBeVisible()`. */
export async function openSettings(where: Scope): Promise<void> {
  await settingsDoor(where).click();
}
