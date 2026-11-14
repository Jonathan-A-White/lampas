// tests/unit/kind-page-sermons-author.test.tsx — a sermon book of the catalogue names its preacher (mw-qtu3zvz.106): the Sermons page's search finds a book by its author, and its row names him.
// The Logos export has no author column, so the preachers are in data/logos/catalogue-rules.json ("authors"); src/library/KindPage.tsx searches title, author and series.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { shelfOf } from '../../src/data/repositories';
import { KindPage } from '../../src/library/KindPage';
import { entriesOf } from '../../src/resources/catalogue';
import { ASYNC_WAIT_MS } from '../support/timeouts';

describe('the Sermons page names the preacher of its books', () => {
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

  it("searching 'Wesley' finds Wesley's books whose title does not say his name", async () => {
    const byAuthorOnly = entriesOf('sermons').filter((e) => /wesley/i.test(e.author ?? '') && !/wesley/i.test(`${e.short} ${e.title} ${e.series ?? ''}`));
    expect(byAuthorOnly.length).toBeGreaterThan(0);
    render(<KindPage kind="sermons" />);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search Sermon books' }), 'Wesley');
    for (const e of byAuthorOnly) expect(await screen.findByText(e.short)).toBeTruthy();
    // and a book of another preacher is not among them
    expect(screen.queryByText('Princeton Sermons')).toBeNull();
  }, ASYNC_WAIT_MS);

  it('at least 60 of the sermon books name an author', () => {
    const entries = entriesOf('sermons');
    expect(entries.filter((e) => (e.author ?? '') !== '').length).toBeGreaterThanOrEqual(60);
  });
});
