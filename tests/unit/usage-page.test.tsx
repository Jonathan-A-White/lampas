// mw-6ww.175.15: Settings shows what Lampas has counted: the screens he opened (with how often) and the ones he never opened. The page
// reads only the usage store and makes no request: nothing leaves the phone and no other table is touched.
import { cleanup, render, screen, within } from '@testing-library/react';
import type { Table } from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { SCREENS, screensCounted } from '../../src/tips/summary';
import { UsageCounted } from '../../src/tips/UsageCounted';

const row = (day: string, name: string, count = 1) => ({ key: `${day}|${name}`, day, name, count });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterEach(() => {
  cleanup();
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
