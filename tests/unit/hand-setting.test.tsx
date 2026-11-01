// The Hand row of Settings (mw-5r3p30.879; the Tutor door row it came with is gone, mw-5r3p30.882: the floating ? is the one door): a non-talkable row, kept in the settings store, read through one helper.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { getHand, setHand } from '../../src/settings/hand';
import { settingOf } from '../../src/settings/registry';
import { isTalkable, rowOf } from '../../src/settings/rows';
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

describe('the Hand row', () => {
  it('is a row of Layout that the tutor neither reads nor changes, and there is no Tutor door row', async () => {
    expect(rowOf('hand')).toMatchObject({ label: 'Hand', section: 'layout' });
    expect(rowOf('tutorDoor')).toBeUndefined();
    expect(rowOf('handAtDoor')).toBeUndefined();
    expect(isTalkable('hand')).toBe(false);
    expect(settingOf('hand')).toBeUndefined();
    const told = (await settingsForTutor()).map((s) => s.name);
    expect(told).not.toContain('Tutor door');
    expect(told).not.toContain('Hand');
  });

  it('starts at Right and keeps a choice across a reload (the value is read back from the store)', async () => {
    expect(await getHand()).toBe('right');
    await setHand('left');
    expect((await db.settings.get('hand'))?.value).toBe('left');
    expect(await getHand()).toBe('left');
    // a value the setting does not allow reads as the default
    await db.settings.put({ key: 'hand', value: 'both' });
    expect(await getHand()).toBe('right');
  });

  it('is drawn in Reading, and a tap on Left keeps it', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    await showSettingsGroup('reading');
    const hand = await screen.findByRole('group', { name: 'Hand' });
    expect(within(hand).getByRole('button', { name: 'Right' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(hand).getByRole('button', { name: 'Left' }));
    await waitFor(async () => expect(await getHand()).toBe('left'));
  });
});
