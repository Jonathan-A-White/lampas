// tests/unit/kind-page-all-shown.test.tsx — on a Library kind page, All on / All off act on the rows SHOWN while a search is typed (mw-qtu3zvz.103): with 'wes' typed,
// All off turns off only the rows that match and leaves the rest as they were; with the search empty they still act on the whole kind. src/library/KindPage.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setKind, setState, shelfOf } from '../../src/data/repositories';
import { KindPage } from '../../src/library/KindPage';
import { entriesOf } from '../../src/resources/catalogue';
import { matchingExactly } from '../../src/ui/listFilter';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const items = () => entriesOf('commentary').map((e) => ({ id: e.resource, name: e.short, also: [e.title, e.author, e.series].filter(Boolean).join(' ') }));
const stateOf = async (id: string) => (await db.library.get(id))?.state;

describe('a kind page: All on and All off while a search is typed', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
    ]);
    await shelfOf();
  }, ASYNC_WAIT_MS);
  afterEach(cleanup);

  it("with 'wes' typed, All shown off turns off only the rows shown and the rest keep their state", async () => {
    const shown = matchingExactly(items(), 'wes').map((i) => i.id);
    const rest = items().map((i) => i.id).filter((id) => !shown.includes(id));
    expect(shown.length).toBeGreaterThan(0);
    expect(rest.length).toBeGreaterThan(0);
    await setKind('commentary', 'on');
    await setState(rest[0], 'pinned');

    render(<KindPage kind="commentary" />);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search Commentaries' }), 'wes');
    await userEvent.click(await screen.findByRole('button', { name: 'All shown off' }));

    await expect.poll(async () => stateOf(shown[0]), { timeout: ASYNC_WAIT_MS }).toBeUndefined();
    for (const id of shown) expect(await stateOf(id)).toBeUndefined();
    expect(await stateOf(rest[0])).toBe('pinned');
    for (const id of rest.slice(1)) expect(await stateOf(id)).toBe('on');
  }, ASYNC_WAIT_MS);

  it("with 'wes' typed, All shown on turns on only the rows shown", async () => {
    const shown = matchingExactly(items(), 'wes').map((i) => i.id);
    render(<KindPage kind="commentary" />);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search Commentaries' }), 'wes');
    await userEvent.click(await screen.findByRole('button', { name: 'All shown on' }));
    await expect.poll(async () => stateOf(shown[0]), { timeout: ASYNC_WAIT_MS }).toBe('on');
    expect(await db.library.where('kind').equals('commentary').count()).toBe(shown.length);
  }, ASYNC_WAIT_MS);

  it('with the search empty, the buttons say All on / All off and act on the whole kind', async () => {
    render(<KindPage kind="commentary" />);
    await userEvent.click(await screen.findByRole('button', { name: 'All on', exact: true }));
    await expect.poll(async () => db.library.where('kind').equals('commentary').count(), { timeout: ASYNC_WAIT_MS }).toBe(entriesOf('commentary').length);
    await userEvent.click(screen.getByRole('button', { name: 'All off', exact: true }));
    await expect.poll(async () => db.library.where('kind').equals('commentary').count(), { timeout: ASYNC_WAIT_MS }).toBe(0);
  }, ASYNC_WAIT_MS);
});
