// tests/unit/reference-card-parts.test.tsx — 'Open in Logos' on a reference opens the Bible of the reference's part (mw-5r3p30.841): Daniel 2:28 (a book Lampas holds no data for here)
// in the Old Testament Bible, and the verse door of a New Testament verse in the New Testament one.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/data/bookIndex', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/data/bookIndex')>();
  const books = real.CANON_INDEX.books.filter((b) => b.code !== 'dan');
  return { ...real, CANON_INDEX: { ...real.CANON_INDEX, books } };
});

import { db } from '../../src/data/db';
import { setLogosBible, setLogosBibleFor, setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
import { InLogosDoors } from '../../src/library/InLogosDoors';
import { DEFAULT_LOGOS_BIBLE } from '../../src/resources/logosBible';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
  await setResourceOn('logos', true);
  await setLogosBible(DEFAULT_LOGOS_BIBLE);
  await setLogosBibleFor('ot', 'LLS:NASB95');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Open in Logos', () => {
  it('on Daniel 2:28 opens the Old Testament Bible', async () => {
    render(<ReferenceLink written="Daniel 2:28">Daniel 2:28</ReferenceLink>);
    await userEvent.click(screen.getByRole('link', { name: 'Daniel 2:28' }));
    const card = await screen.findByRole('dialog', { name: 'Daniel 2:28' });
    expect(await within(card).findByRole('link', { name: 'Open in Logos' })).toHaveAttribute('href', 'logosres:nasb95;ref=Bible.Da2.28');
  });

  it('on a New Testament verse (the In Logos door) opens the New Testament Bible, and on a Psalm the Old Testament one', async () => {
    render(
      <>
        <InLogosDoors place={{ book: 'rom', chapter: 8, verse: 31 }} name="Romans 8:31" entries={[]} />
        <InLogosDoors place={{ book: 'psa', chapter: 23, verse: 1 }} name="Psalm 23:1" entries={[]} />
      </>,
    );
    const romans = await screen.findByRole('group', { name: 'Romans 8:31 in Logos' });
    expect(within(romans).getByRole('link', { name: /In Logos/ })).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Ro8.31');
    const psalm = screen.getByRole('group', { name: 'Psalm 23:1 in Logos' });
    expect(within(psalm).getByRole('link', { name: /In Logos/ })).toHaveAttribute('href', 'logosres:nasb95;ref=Bible.Ps23.1');
  });
});
