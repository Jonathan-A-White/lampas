// tests/unit/reference-card-unheld.test.tsx — a book Lampas has no data for still says 'Not in Lampas yet' on its card, with Open in Logos and no Open (mw-5r3p30.840):
// whether Lampas holds a book is read from the data it has (CANON_INDEX), not from the testament, so here Daniel's data is taken out of the index.
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
import { setLogosBible, setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
import { DEFAULT_LOGOS_BIBLE } from '../../src/resources/logosBible';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a book with no data in Lampas', () => {
  it('says Not in Lampas yet, has Open in Logos and no Open', async () => {
    await setResourceOn('logos', true);
    await setLogosBible(DEFAULT_LOGOS_BIBLE);
    render(<ReferenceLink written="Daniel 2:28">Daniel 2:28</ReferenceLink>);
    await userEvent.click(screen.getByRole('link', { name: 'Daniel 2:28' }));
    const card = await screen.findByRole('dialog', { name: 'Daniel 2:28' });
    expect(within(card).getByText('Not in Lampas yet')).toBeInTheDocument();
    expect(await within(card).findByRole('link', { name: 'Open in Logos' })).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Da2.28');
    expect(within(card).queryByRole('button', { name: 'Open' })).toBeNull();
  });

  it('links to Settings, where Logos is linked, while no Bible app is linked', async () => {
    render(<ReferenceLink written="Daniel 2:28">Daniel 2:28</ReferenceLink>);
    await userEvent.click(screen.getByRole('link', { name: 'Daniel 2:28' }));
    const card = await screen.findByRole('dialog', { name: 'Daniel 2:28' });
    await within(card).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Not in Lampas yet. Link Logos in Settings to open it there.');
    await userEvent.click(within(card).getByRole('link', { name: 'Link Logos in Settings' }));
    expect(window.location.hash).toBe('#/settings?section=resources');
    expect(screen.queryByRole('dialog', { name: 'Daniel 2:28' })).toBeNull();
  });
});
