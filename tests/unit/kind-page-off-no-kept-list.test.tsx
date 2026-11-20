// tests/unit/kind-page-off-no-kept-list.test.tsx — with no kept Logos list on the device, a book he turns Off on a Library kind page stays on the page, shown as Off, and can be turned back On there
// (mw-5r3p30.1211). Off is no row of the shelf, so ownedResources (src/data/repositories/library.ts) remembers a book he turned Off while no list is kept.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { DEFAULT_DEVOTIONAL, DEVOTIONALS } from '../../src/data/daily/devotionals';
import { offeredEntries } from '../../src/data/owned';
import { ownedResources, setKind, setState, stateOf } from '../../src/data/repositories';
import { searchLibrary } from '../../src/settings/librarySearch';
import { KindPage } from '../../src/library/KindPage';
import { entriesOf, entryOf } from '../../src/resources/catalogue';
import { keepImport } from '../support/logos-import';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const [first, second] = DEVOTIONALS.filter((d) => d.id !== DEFAULT_DEVOTIONAL);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.exportRows.clear(), db.settings.clear(), db.library.clear(), db.meta.clear()]);
  await db.settings.put({ key: 'devotionalDraw', value: 'none' });
}, ASYNC_WAIT_MS);
afterEach(cleanup);

describe('no kept list: a devotional on the shelf turned Off', () => {
  it('is still owned, and the Devotionals page still lists it, as Off, and turning it On there works', async () => {
    await setState(first.id, 'on');
    await setState(first.id, 'off');
    expect(await stateOf(first.id)).toBe('off');
    expect((await ownedResources()).has(first.id)).toBe(true);

    render(<KindPage kind="devotional" />);
    const group = await screen.findByRole('radiogroup', { name: entryOf(first.id)!.short }, { timeout: ASYNC_WAIT_MS });
    expect(within(group).getByRole('radio', { name: 'Off' }).getAttribute('aria-checked')).toBe('true');
    await userEvent.click(within(group).getByRole('radio', { name: 'On' }));
    await within(screen.getByRole('radiogroup', { name: entryOf(first.id)!.short })).findByRole('radio', { name: 'On', checked: true });
    expect(await stateOf(first.id)).toBe('on');
  }, ASYNC_WAIT_MS);

  it('a book never on the shelf stays unoffered', async () => {
    await setState(first.id, 'on');
    await setState(first.id, 'off');
    const owned = await ownedResources();
    expect(owned.has(second.id)).toBe(false);
    expect(offeredEntries(entriesOf('devotional'), owned).map((e) => e.resource)).toEqual([first.id]);
  });

  it("Settings' library search still finds it (the same owned set as the Library's card count)", async () => {
    await setState(first.id, 'on');
    await setState(first.id, 'off');
    const owned = await ownedResources();
    expect(searchLibrary(entryOf(first.id)!.short, owned).books.map((e) => e.resource)).toContain(first.id);
    expect(offeredEntries(entriesOf('devotional'), owned)).toHaveLength(1);
  });

  it('All off keeps the books it turned Off', async () => {
    await setState(first.id, 'on');
    await setKind('devotional', 'off');
    expect((await ownedResources()).has(first.id)).toBe(true);
  });

  it('a kept list alone says: the book it does not name is not offered', async () => {
    await setState(first.id, 'on');
    await setState(first.id, 'off');
    await keepImport([second.id]);
    expect([...(await ownedResources())]).toEqual([second.id]);
  });
});
