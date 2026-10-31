// The Tutor door and Hand rows of Settings (mw-5r3p30.879, part A of mw-5r3p30.843): two non-talkable rows, kept in the settings store, read through one helper each.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { getHand, handAsked, setHand } from '../../src/settings/hand';
import { settingOf } from '../../src/settings/registry';
import { isTalkable, rowOf } from '../../src/settings/rows';
import { getTutorDoor, setTutorDoor } from '../../src/settings/definitions/tutorDoor';
import { settingsForTutor } from '../../src/settings/tutorSettings';
import { showSettingsGroup } from '../support/settings-pages';

Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('the Tutor door and Hand rows', () => {
  it('are rows of Asking the tutor and Layout that the tutor neither reads nor changes', async () => {
    expect(rowOf('tutorDoor')).toMatchObject({ label: 'Tutor door', section: 'askBy', licenceOnly: true })
    expect(rowOf('tutorDoor')?.ai).toBeUndefined();
    expect(rowOf('hand')).toMatchObject({ label: 'Hand', section: 'layout' });
    expect(isTalkable('tutorDoor')).toBe(false);
    expect(isTalkable('hand')).toBe(false);
    expect(settingOf('tutorDoor')).toBeUndefined();
    expect(settingOf('hand')).toBeUndefined();
    const told = (await settingsForTutor()).map((s) => s.name);
    expect(told).not.toContain('Tutor door');
    expect(told).not.toContain('Hand');
  });

  it('starts at Two-finger tap and Right, with no hand asked', async () => {
    expect(await getTutorDoor()).toBe('twoFinger');
    expect(await getHand()).toBe('right');
    expect(await handAsked()).toBe(false);
  });

  it('keeps a choice of each across a reload (the value is read back from the store)', async () => {
    await setTutorDoor('floating');
    await setHand('left');
    expect((await db.settings.get('tutorDoor'))?.value).toBe('floating');
    expect(await getTutorDoor()).toBe('floating');
    expect(await getHand()).toBe('left');
    expect(await handAsked()).toBe(true);
    // a value the setting does not allow reads as the default
    await db.settings.bulkPut([{ key: 'tutorDoor', value: 'both' }, { key: 'hand', value: 'both' }]);
    expect(await getTutorDoor()).toBe('twoFinger');
    expect(await getHand()).toBe('right');
  });

  it('draws the Tutor door chips and the Hand chips, and asks the hand once when Floating ? is first picked', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/settings';
    render(<SettingsScreen />);

    await showSettingsGroup('tutor');
    const door = await screen.findByRole('group', { name: 'Tutor door' });
    expect(within(door).getByRole('button', { name: 'Two-finger tap' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(door).getByRole('button', { name: 'Floating ?' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'Which hand do you hold your phone in?' })).toBeNull();

    await user.click(within(door).getByRole('button', { name: 'Floating ?' }));
    const question = await screen.findByRole('group', { name: 'Which hand do you hold your phone in?' });
    expect(await db.settings.get('tutorDoor')).toMatchObject({ value: 'floating' });
    expect(await handAsked()).toBe(false);
    await user.click(within(question).getByRole('button', { name: 'Left' }));
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Which hand do you hold your phone in?' })).toBeNull());
    expect(await getHand()).toBe('left');

    // not asked again, whichever way the door is turned
    await user.click(within(door).getByRole('button', { name: 'Two-finger tap' }));
    await user.click(within(door).getByRole('button', { name: 'Floating ?' }));
    await waitFor(() => expect(within(door).getByRole('button', { name: 'Floating ?' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByRole('group', { name: 'Which hand do you hold your phone in?' })).toBeNull();

    await showSettingsGroup('reading');
    const hand = await screen.findByRole('group', { name: 'Hand' });
    expect(within(hand).getByRole('button', { name: 'Left' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(hand).getByRole('button', { name: 'Right' }));
    await waitFor(async () => expect(await getHand()).toBe('right'));
  });

  it('does not ask when the hand was already set in Settings', async () => {
    const user = userEvent.setup();
    await setHand('right');
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    await showSettingsGroup('tutor');
    const door = await screen.findByRole('group', { name: 'Tutor door' });
    await user.click(within(door).getByRole('button', { name: 'Floating ?' }));
    await waitFor(() => expect(within(door).getByRole('button', { name: 'Floating ?' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByRole('group', { name: 'Which hand do you hold your phone in?' })).toBeNull();
  });
});
