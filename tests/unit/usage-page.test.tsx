// mw-6ww.175.15: Settings shows what Lampas has counted: the screens he opened (with how often) and the ones he never opened. The page
// reads only the usage store and makes no request: nothing leaves the phone and no other table is touched.
// mw-6ww.175.87: it is a page of its own behind a row of the Settings home (last before Developer); the home no longer draws the lists.
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Table } from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { setDeveloper } from '../../src/data/repositories';
import { forgetTrail } from '../../src/nav/lastRoute';
import { scrollAddress } from '../../src/nav/scrollMemory';
import { SettingsScreen } from '../../src/SettingsScreen';
import { COUNTED_LINK, isCountedPage } from '../../src/settings/link';
import { SCREENS, screensCounted } from '../../src/tips/summary';
import { UsageCounted } from '../../src/tips/UsageCounted';
import { COUNTED_DOOR, foundDoors } from '../support/settings';

const row = (day: string, name: string, count = 1) => ({ key: `${day}|${name}`, day, name, count });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterEach(() => {
  cleanup();
  forgetTrail();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('screensCounted (pure)', () => {
  it('lists each screen he opened with its count over all days, and every other screen as never opened', () => {
    const counted = screensCounted([row('2026-10-01', 'screen:words', 2), row('2026-10-02', 'screen:words'), row('2026-10-02', 'screen:about'), row('2026-10-02', 'verse-selected', 9)]);
    expect(counted.opened).toEqual([
      { id: 'words', label: 'Words', count: 3 },
      { id: 'about', label: 'About', count: 1 },
    ]);
    expect(counted.never.map((s) => s.id)).toEqual(SCREENS.map((s) => s.id).filter((id) => id !== 'words' && id !== 'about'));
  });

  it('says every screen is never opened on a phone with no use', () => {
    const counted = screensCounted([]);
    expect(counted.opened).toEqual([]);
    expect(counted.never).toHaveLength(SCREENS.length);
  });
});

describe('the page', () => {
  it('draws the screens opened and the screens never opened from the usage store, and reads no other table and asks no server', async () => {
    await db.usage.bulkPut([row('2026-10-01', 'screen:words', 4), row('2026-10-01', 'screen:review'), row('2026-10-01', 'screen:home', 7)]);
    // other tables hold rows the page must not read
    await db.settings.put({ key: 'goal', value: 'x' });
    const fetched = vi.fn(() => Promise.reject(new Error('the page made a request')));
    vi.stubGlobal('fetch', fetched);
    const open = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const beacon = vi.fn();
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { sendBeacon: beacon }));
    const read = new Set<string>();
    const tables = Object.getPrototypeOf(db.usage) as Table; // Dexie's Table class: every table's reads go through it
    for (const method of ['get', 'bulkGet', 'toArray', 'count', 'where', 'toCollection', 'orderBy', 'filter', 'each', 'limit', 'offset', 'reverse'] as const) {
      const original = tables[method] as (this: Table, ...args: unknown[]) => unknown;
      vi.spyOn(tables, method as 'get').mockImplementation(function (this: Table, ...args: unknown[]) {
        read.add(this.name);
        return original.apply(this, args);
      } as never);
    }

    render(<UsageCounted />);
    const opened = await screen.findByRole('list', { name: 'Opened' });
    expect(within(opened).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Words · 4', 'Review · 1']);
    const never = screen.getByRole('list', { name: 'Never opened' });
    const neverNames = within(never).getAllByRole('listitem').map((li) => li.textContent);
    expect(neverNames).toContain('Goal');
    expect(neverNames).not.toContain('Words');
    expect(neverNames).toHaveLength(SCREENS.length - 2);

    expect([...read]).toEqual(['usage']);
    expect(fetched).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });
});

describe('the address of the page (mw-6ww.175.87)', () => {
  it('is a Settings address of its own, read back only from Settings', () => {
    expect(COUNTED_LINK).toBe('#/settings?page=counted');
    expect(isCountedPage(COUNTED_LINK)).toBe(true);
    expect(isCountedPage('#/settings')).toBe(false);
    expect(isCountedPage('#/settings?group=reading')).toBe(false);
    expect(isCountedPage('#/settings?page=nothing')).toBe(false);
    expect(isCountedPage('#/words?page=counted')).toBe(false);
  });

  it('keeps a scroll place of its own, so opening it at the top does not forget where the home was left', () => {
    expect(scrollAddress(COUNTED_LINK)).toBe('#/settings?page=counted');
    expect(scrollAddress(COUNTED_LINK)).not.toBe(scrollAddress('#/settings'));
  });
});

describe('the Settings search finds the door (mw-6ww.175.103)', () => {
  it('by a part of its title or of its hint, ignoring capitals and accents, and by nothing else', () => {
    expect(foundDoors('counted')).toEqual([COUNTED_DOOR]);
    expect(foundDoors('  LAMPÁS has ')).toEqual([COUNTED_DOOR]);
    expect(foundDoors('opened each')).toEqual([COUNTED_DOOR]);
    expect(foundDoors('theme')).toEqual([]);
    expect(foundDoors('')).toEqual([]);
    expect(foundDoors('   ')).toEqual([]);
  });
});

describe('the row on the Settings home (mw-6ww.175.87)', () => {
  const homeButtons = async () => within(await screen.findByRole('list', { name: 'Settings groups' })).getAllByRole('button');
  const titleOf = (button: HTMLElement) => button.querySelector('.bk-settings__group-title')?.textContent;

  it('is named and hinted as the door says, with a chevron, and is the last row while Developer mode is not found', async () => {
    expect(COUNTED_DOOR.title).toBe('What Lampas has counted');
    expect(COUNTED_DOOR.hint).toBe('How often you opened each screen.');
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    const buttons = await homeButtons();
    const door = buttons[buttons.length - 1];
    expect(titleOf(door)).toBe('What Lampas has counted');
    expect(door.querySelector('.bk-settings__group-hint')?.textContent).toBe('How often you opened each screen.');
    expect(door.querySelector('.bk-settings__chevron')?.textContent).toBe('›');
    // a door, not a group: the specs that count the groups ([data-group]) do not count it
    expect(door.hasAttribute('data-group')).toBe(false);
    expect(door.getAttribute('data-door')).toBe('counted');
    expect(buttons.map(titleOf)).not.toContain('Developer');
  });

  it('sits last before Developer once Developer mode is found', async () => {
    await setDeveloper('off');
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    const titles = (await homeButtons()).map(titleOf);
    expect(titles.slice(-3)).toEqual(['Account', 'What Lampas has counted', 'Developer']);
  });

  it('keeps the lists off the home: no Opened and no Never opened, even once the usage store has been read', async () => {
    await db.usage.bulkPut([row('2026-10-01', 'screen:words', 4)]);
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    await homeButtons();
    // the block drew once its read of the usage store came back: reads asked for after it have come back by here
    for (let round = 0; round < 3; round++) await act(async () => void (await db.usage.toArray()));
    expect(document.querySelector('[data-usage-counted]')).toBeNull();
    for (const name of ['Opened', 'Never opened']) {
      expect(screen.queryByRole('list', { name })).toBeNull();
      expect(screen.queryByRole('heading', { name })).toBeNull();
    }
    expect(screen.queryByText(/Words · 4/)).toBeNull();
  });

  it('opens the page with the two lists on a tap, and ‹ Settings is the home again', async () => {
    const user = userEvent.setup();
    await db.usage.bulkPut([row('2026-10-01', 'screen:words', 4)]);
    window.location.hash = '#/settings';
    render(<SettingsScreen />);
    const buttons = await homeButtons();
    await user.click(buttons[buttons.length - 1]);
    expect(window.location.hash).toBe(COUNTED_LINK);
    // the title is said once, by the header
    expect(await screen.findAllByRole('heading', { name: 'What Lampas has counted' })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'What Lampas has counted', level: 1 })).toBeVisible();
    expect(screen.getByText('How often you opened each screen. This stays on this phone.')).toBeVisible();
    const opened = await screen.findByRole('list', { name: 'Opened' });
    expect(within(opened).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Words · 4']);
    expect(within(screen.getByRole('list', { name: 'Never opened' })).getAllByRole('listitem')).toHaveLength(SCREENS.length - 1);
    expect(screen.queryByRole('list', { name: 'Settings groups' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '‹ Settings' }));
    await screen.findByRole('list', { name: 'Settings groups' });
    expect(window.location.hash).toBe('#/settings');
    expect(screen.queryByRole('list', { name: 'Opened' })).toBeNull();
  });

  it('draws the page at its address with no home behind it, and ‹ Settings puts the home in its place', async () => {
    const user = userEvent.setup();
    window.location.hash = COUNTED_LINK;
    render(<SettingsScreen />);
    await screen.findByRole('heading', { name: 'What Lampas has counted', level: 1 });
    expect(await screen.findByText('No screen yet.')).toBeVisible();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '‹ Settings' }));
    });
    await screen.findByRole('list', { name: 'Settings groups' });
    expect(window.location.hash).toBe('#/settings');
  });
});
