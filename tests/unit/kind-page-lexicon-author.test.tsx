// tests/unit/kind-page-lexicon-author.test.tsx — a lexicon and a grammar of the catalogue name their author (mw-qtu3zvz.158): the Lexicons page's search finds a book by its author.
// The Logos export has no author column, so each id rule of data/logos/catalogue-rules.json carries its own "author"; src/library/KindPage.tsx searches title, author and series.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { shelfOf } from '../../src/data/repositories';
import { KindPage } from '../../src/library/KindPage';
import { entriesOf } from '../../src/resources/catalogue';
import { EVERY_BOOK_IDS, keepImport } from '../support/logos-import';
import { ASYNC_WAIT_MS } from '../support/timeouts';

describe('the Lexicons page names the author of its books', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
    await keepImport(EVERY_BOOK_IDS);
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
    ]);
    await shelfOf();
  }, ASYNC_WAIT_MS);
  afterEach(cleanup);

  it("searching 'Swanson' finds the two Dictionary of Biblical Languages lexicons, whose titles do not say his name", async () => {
    const bySwanson = entriesOf('lexicon').filter((e) => /swanson/i.test(e.author ?? '') && !/swanson/i.test(`${e.short} ${e.title}`));
    expect(bySwanson.length).toBe(2);
    render(<KindPage kind="lexicon" />);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search Lexicons' }), 'Swanson');
    for (const e of bySwanson) expect((await screen.findAllByText(e.short)).length).toBeGreaterThan(0);
    // and a lexicon of another author is not among them
    expect(screen.queryByText('BDAG')).toBeNull();
  }, ASYNC_WAIT_MS);

  it('at least 20 of the 29 lexicons name an author', () => {
    const entries = entriesOf('lexicon');
    expect(entries.length).toBe(29);
    expect(entries.filter((e) => (e.author ?? '') !== '').length).toBeGreaterThanOrEqual(20);
  });

  it('more than the six grammars that named an author before name one', () => {
    expect(entriesOf('grammar').filter((e) => (e.author ?? '') !== '').length).toBeGreaterThan(6);
  });
});
