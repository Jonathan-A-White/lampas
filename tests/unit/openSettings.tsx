// tests/unit/openSettings.tsx — the one place a jsdom test or feature step names the Reader header's Menu, the doors in it (Settings, Tools) and the headings of the screens they open
// (mw-5r3p30.839, mw-5r3p30.754). The Menu (three lines) stood where the gear was: Tools and Settings are its two rows. When a door moves again, this file changes and the steps do not. The Playwright twin is tests/e2e/openSettings.ts.
import { screen, type BoundFunctions, type queries } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Where to look: the whole screen (the default), or a box on it (the Reader's header, from `within`). */
type Scope = Pick<BoundFunctions<typeof queries>, 'findByRole' | 'getByRole'>;

/** The Menu button, waiting for it to be drawn. */
export const findMenuButton = (where: Scope = screen): Promise<HTMLElement> => where.findByRole('button', { name: 'Menu' });

/** The Menu button, drawn already. */
export const getMenuButton = (where: Scope = screen): HTMLElement => where.getByRole('button', { name: 'Menu' });

/** The Settings screen's heading, waiting for it to be drawn. */
export const findSettingsHeading = (): Promise<HTMLElement> => screen.findByRole('heading', { name: 'Settings', level: 1 });

/** The Settings screen's heading if it is drawn now, else null: for a check that Settings is (or is not) open. */
export const querySettingsHeading = (): HTMLElement | null => screen.queryByRole('heading', { name: 'Settings', level: 1 });

/** The Menu button if it is drawn now, else null: for a check that the Reader's header shows it (or does not). */
export const queryMenuButton = (): HTMLElement | null => screen.queryByRole('button', { name: 'Menu' });

/** The Tools screen's heading, waiting for it to be drawn. */
export const findToolsHeading = (): Promise<HTMLElement> => screen.findByRole('heading', { name: 'Tools', level: 1 });

/** Taps the Menu (waiting for it) and then its row `name`. */
async function chooseFromMenu(user: UserEvent, name: 'Settings' | 'Tools', where: Scope): Promise<void> {
  await user.click(await findMenuButton(where));
  await user.click(await screen.findByRole('menuitem', { name }));
}

/** Opens Settings through the Menu and waits for the Settings heading, which it returns. */
export async function openSettings(user: UserEvent, where: Scope = screen): Promise<HTMLElement> {
  await chooseFromMenu(user, 'Settings', where);
  return findSettingsHeading();
}

/** Opens Tools through the Menu and waits for the Tools heading, which it returns. */
export async function openTools(user: UserEvent, where: Scope = screen): Promise<HTMLElement> {
  await chooseFromMenu(user, 'Tools', where);
  return findToolsHeading();
}
