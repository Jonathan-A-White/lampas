// mw-5r3p30.1189: with no kept Logos list on the device (an import from before the list was kept, or storage cleared) the books already on his shelf (On or Pinned) stay offered; once a list is
// kept the owned-check narrows to it again. The Library kind page asks offeredEntries and Settings > Daily > Which devotional asks pickableDevotionals, both with ownedResources().
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { DEFAULT_DEVOTIONAL, DEVOTIONALS, MORNING_REPHIL_ID, pickableDevotionals } from '../../src/data/daily/devotionals';
import { offeredEntries } from '../../src/data/owned';
import { ownedResources, setState } from '../../src/data/repositories';
import { entriesOf } from '../../src/resources/catalogue';
import { keepImport } from '../support/logos-import';

const [first, second] = DEVOTIONALS.filter((d) => d.id !== DEFAULT_DEVOTIONAL);
const ticked = DEVOTIONALS.map((d) => d.id);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.exportRows.clear(), db.settings.clear(), db.library.clear(), db.meta.clear()]);
  // no old tick: the draw starts with none, so the shelf holds only what a test puts on it
  await db.settings.put({ key: 'devotionalDraw', value: 'none' });
});
afterAll(() => db.close());

describe('no kept list, a shelf holding a devotional On', () => {
  it("the Library's Devotionals page and the Which devotional picker offer it", async () => {
    await setState(first.id, 'on');
    const owned = await ownedResources();
    expect(offeredEntries(entriesOf('devotional'), owned).map((e) => e.resource)).toEqual([first.id]);
    // the chosen one (DEFAULT_DEVOTIONAL) is always listed; the shelf's devotional beside it, Morning RePhil last
    expect(pickableDevotionals(ticked, DEFAULT_DEVOTIONAL, owned).map((d) => d.id)).toEqual([...ticked.filter((id) => id === DEFAULT_DEVOTIONAL || id === first.id), MORNING_REPHIL_ID]);
  });

  it('a book not on the shelf is not offered', async () => {
    await setState(first.id, 'on');
    const owned = await ownedResources();
    expect(owned.has(second.id)).toBe(false);
  });
});

describe('a kept list that does not name it', () => {
  it('offers neither on the Library page nor in the picker', async () => {
    await setState(first.id, 'on');
    await keepImport([second.id]);
    const owned = await ownedResources();
    expect(offeredEntries(entriesOf('devotional'), owned).map((e) => e.resource)).toEqual([second.id]);
    expect(pickableDevotionals(ticked, DEFAULT_DEVOTIONAL, owned).map((d) => d.id)).not.toContain(first.id);
  });
});
