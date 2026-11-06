// tests/e2e/openSettings.ts — the one place a Playwright spec names the Reader header's Menu, the doors in it (Settings, Tools) and the headings of the screens they open (mw-5r3p30.839, mw-5r3p30.754).
// The Menu (three lines) stood where the gear was: Tools and Settings are its two rows. When a door moves again, this file changes and the specs do not. The jsdom twin is tests/unit/openSettings.tsx.
import { expect, type Locator, type Page } from '@playwright/test';

/** Where to look: the whole page, or a box on it (the Reader's header). */
type Scope = Page | Locator;

/** The Reader header's Menu button, for a check of where it sits or whether it shows. */
export const menuButton = (where: Scope): Locator => where.getByRole('button', { name: 'Menu', exact: true });

/** One row of the open Menu: 'Settings' or 'Tools'. */
export const menuRow = (where: Scope, name: 'Settings' | 'Tools'): Locator => where.getByRole('menuitem', { name, exact: true });

/** The Settings screen's heading, for a check that Settings is open (or is not). */
export const settingsHeading = (where: Scope): Locator => where.getByRole('heading', { name: 'Settings', exact: true, level: 1 });

/** The Tools screen's heading. */
export const toolsHeading = (where: Scope): Locator => where.getByRole('heading', { name: 'Tools', exact: true, level: 1 });

/** Taps the Menu and waits for its rows. */
export async function openMenu(where: Scope): Promise<void> {
  await menuButton(where).click();
  await expect(menuRow(where, 'Tools')).toBeVisible();
}

/** Opens Settings through the Menu. It does not wait for the heading: Settings may open on the page it was last left on (a group's page, with that group's title), so a spec that expects the home waits with `expect(settingsHeading(page)).toBeVisible()`. */
export async function openSettings(where: Scope): Promise<void> {
  await openMenu(where);
  await menuRow(where, 'Settings').click();
}

/** Opens Tools through the Menu and waits for its heading. */
export async function openTools(where: Scope): Promise<void> {
  await openMenu(where);
  await menuRow(where, 'Tools').click();
  await expect(toolsHeading(where)).toBeVisible();
}
