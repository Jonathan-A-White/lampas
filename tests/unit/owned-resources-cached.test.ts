// mw-indx1x6.123: ownedResources() (src/data/repositories/library.ts) read the shelf and the kept list on every call, each behind the shelf's write transactions, and the sermon door waited on it (10.5 s on one core).
// Outside a live query it now shares one read between two writes of the shelf or the list; inside one it still reads, or the query would never run again when the shelf changes.
import { liveQuery } from 'dexie';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { DEVOTIONALS } from '../../src/data/daily/devotionals';
import { ownedResources, setState } from '../../src/data/repositories';
import { keepImport } from '../support/logos-import';

const [first, second] = DEVOTIONALS;

beforeEach(async () => {
  await db.open();
  await Promise.all([db.exportRows.clear(), db.settings.clear(), db.library.clear(), db.meta.clear()]);
  // no default book of the old keys on the shelf: it holds only what a test puts on it
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
});
afterAll(() => db.close());

describe('ownedResources outside a live query', () => {
  it('reads the shelf once for calls with no write between them', async () => {
    await ownedResources();
    const shelf = vi.spyOn(db.library, 'toArray');
    const list = vi.spyOn(db.exportRows, 'toArray');
    const [a, b] = await Promise.all([ownedResources(), ownedResources()]);
    await ownedResources();
    expect(shelf).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(b).toBe(a);
    shelf.mockRestore();
    list.mockRestore();
  });

  it('reads again after a book changes state, and after a list is kept', async () => {
    expect([...(await ownedResources())]).toEqual([]);
    await setState(first.id, 'on');
    expect([...(await ownedResources())]).toEqual([first.id]);
    await keepImport([second.id]);
    expect([...(await ownedResources())]).toEqual([second.id]);
    await db.exportRows.clear();
    expect([...(await ownedResources())]).toEqual([first.id]);
  });
});

describe('ownedResources inside a live query', () => {
  it('still re-runs the query when the shelf changes, although a call outside one has cached the set', async () => {
    await ownedResources();
    const seen: string[][] = [];
    const subscription = liveQuery(ownedResources).subscribe((owned) => seen.push([...owned]));
    await vi.waitFor(() => expect(seen).toEqual([[]]));
    await setState(first.id, 'on');
    await vi.waitFor(() => expect(seen.at(-1)).toEqual([first.id]));
    subscription.unsubscribe();
  });
});
