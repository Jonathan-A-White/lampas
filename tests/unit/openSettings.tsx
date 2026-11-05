// tests/unit/openSettings.tsx — the one place a jsdom test or feature step names the Reader header's Settings door and the Settings screen's heading
// (mw-5r3p30.839). When the door moves (a menu, a Tools screen), this file changes and the steps do not. The Playwright twin is tests/e2e/openSettings.ts.
import { screen, type BoundFunctions, type queries } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Where to look: the whole screen (the default), or a box on it (the Reader's header, from `within`). */
type Scope = Pick<BoundFunctions<typeof queries>, 'findByRole' | 'getByRole'>;

/** The Settings door, waiting for it to be drawn. */
export const findSettingsDoor = (where: Scope = screen): Promise<HTMLElement> => where.findByRole('button', { name: 'Settings' });

/** The Settings door, drawn already. */
export const getSettingsDoor = (where: Scope = screen): HTMLElement => where.getByRole('button', { name: 'Settings' });

/** The Settings screen's heading, waiting for it to be drawn. */
export const findSettingsHeading = (): Promise<HTMLElement> => screen.findByRole('heading', { name: 'Settings', level: 1 });

/** The Settings screen's heading if it is drawn now, else null: for a check that Settings is (or is not) open. */
export const querySettingsHeading = (): HTMLElement | null => screen.queryByRole('heading', { name: 'Settings', level: 1 });

/** The Settings door if it is drawn now, else null: for a check that the Reader's header shows it (or does not). */
export const querySettingsDoor = (): HTMLElement | null => screen.queryByRole('button', { name: 'Settings' });

/** Taps the Settings door (waiting for it) and waits for the Settings heading, which it returns. */
export async function openSettings(user: UserEvent, where: Scope = screen): Promise<HTMLElement> {
  await user.click(await findSettingsDoor(where));
  return findSettingsHeading();
}
