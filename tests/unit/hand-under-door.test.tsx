// The Hand row under Tutor door (mw-5r3p30.925): while the door is Floating ?, Settings > The tutor > Asking the tutor shows Hand (Left / Right) directly under Tutor door, the same
// saved value as Layout's Hand; with Two-finger tap it is not there. Without a licence neither Hand row is drawn.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { getHand, setHand } from '../../src/settings/hand';
import { isTalkable, readValues, rowOf, visibleRows } from '../../src/settings/rows';
import { setTutorDoor } from '../../src/settings/definitions/tutorDoor';
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

const askByKeys = (values: Record<string, string>): string[] => visibleRows(values, '').filter((r) => r.section === 'askBy').map((r) => r.key);

describe('the Hand row under Tutor door', () => {
  it('is a licence-only row of Asking the tutor that the tutor does not read or change', () => {
    expect(rowOf('handAtDoor')).toMatchObject({ label: 'Hand', section: 'askBy', licenceOnly: true });
    expect(isTalkable('handAtDoor')).toBe(false);
  });

  it('lists Hand directly under Tutor door while the door is Floating ?, and not under Two-finger tap', () => {
    const floating = askByKeys({ tutorDoor: 'floating' });
    expect(floating.indexOf('handAtDoor')).toBe(floating.indexOf('tutorDoor') + 1);
    expect(floating).toContain('tutorDoor');
    expect(askByKeys({ tutorDoor: 'twoFinger' })).not.toContain('handAtDoor');
    expect(visibleRows({ tutorDoor: 'twoFinger' }, '').map((r) => r.key)).toContain('hand');
  });

  it('reads the door into the values the rows depend on', async () => {
    expect((await readValues()).tutorDoor).toBe('twoFinger');
    await setTutorDoor('floating');
    expect((await readValues()).tutorDoor).toBe('floating');
  });

  it('draws a Hand group under Tutor door at Floating ?, changing the one saved hand that Layout shows', async () => {
    const user = userEvent.setup();
    await setTutorDoor('floating');
    await setHand('left');
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    await showSettingsGroup('tutor');
    const hand = await screen.findByRole('group', { name: 'Hand' });
    expect(within(hand).getByRole('button', { name: 'Left' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(hand).getByRole('button', { name: 'Right' }));
    await waitFor(async () => expect(await getHand()).toBe('right'));
    await waitFor(() => expect(within(screen.getByRole('group', { name: 'Hand' })).getByRole('button', { name: 'Right' })).toHaveAttribute('aria-pressed', 'true'));

    await showSettingsGroup('reading');
    const layout = await screen.findByRole('group', { name: 'Hand' });
    expect(within(layout).getByRole('button', { name: 'Right' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('draws no Hand group on The tutor at Two-finger tap', async () => {
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    await showSettingsGroup('tutor');
    await screen.findByRole('group', { name: 'Tutor door' });
    expect(screen.queryByRole('group', { name: 'Hand' })).toBeNull();
  });
});
