// tests/support/settings-pages.ts — Settings is a home of groups and a page per group (mw-3ased2.1): a jsdom step opens a group from the home and leaves for the Reader
// from wherever it is. The group's button is named by its title (its hint follows in the same button).
import { act, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { GroupId } from '../../src/settings/rows';
import { groupById } from '../../src/settings/rows';

/** The address of a group's page, to set as `window.location.hash` before a render of the Settings screen. */
export const groupHash = (id: GroupId): string => `#/settings?group=${id}`;

/** Moves a rendered Settings screen to the page of the group `id` and waits for its title (the screen follows the address). */
export async function showSettingsGroup(id: GroupId): Promise<void> {
  const title = groupById(id)?.title ?? id;
  await act(async () => {
    window.location.hash = groupHash(id);
  });
  await screen.findByRole('heading', { name: title, level: 1 });
}

/** On the Settings home, opens the page of the group `id` and waits for its title. */
export async function openSettingsGroup(user: UserEvent, id: GroupId): Promise<void> {
  const title = groupById(id)?.title ?? id;
  const button = await screen.findByRole('button', { name: new RegExp(`^${title}`) });
  await user.click(button);
  await screen.findByRole('heading', { name: title, level: 1 });
}

/** Whether a group's page is the Settings screen on show. */
export const onSettingsPage = (): boolean => document.querySelector('[data-settings-group]') !== null;

/** Leaves Settings for the Reader: from a group's page by ‹ Settings first, then ‹ Reader. */
export async function leaveSettings(user: UserEvent): Promise<void> {
  if (onSettingsPage()) await user.click(await screen.findByRole('button', { name: '‹ Settings' }));
  await user.click(await screen.findByRole('button', { name: '‹ Reader' }));
}
