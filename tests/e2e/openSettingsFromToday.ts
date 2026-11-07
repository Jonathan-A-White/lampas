// tests/e2e/openSettingsFromToday.ts — Settings from Today, whose header has no Menu: it has its own Settings button (src/today/Today.tsx), so this wraps the shared openSettings (tests/e2e/openSettings.ts) for the one screen without the Reader's Menu.
import { type Page } from '@playwright/test';
import { menuButton, openSettings } from './openSettings';

/** Opens Settings from Today by the Settings button of its header; from a screen that does hold the Reader's Menu, through the Menu. */
export async function openSettingsFromToday(page: Page): Promise<void> {
  if ((await menuButton(page).count()) > 0) return openSettings(page);
  await page.getByRole('banner').getByRole('button', { name: 'Settings', exact: true }).click();
}
