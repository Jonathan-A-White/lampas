// tests/unit/kind-page-same-name-rows.test.tsx — two books of one Library list that share a short name tell themselves apart by the line under it (mw-fnvjof.17.207).
// His report: Library > Commentaries, search "revelation": two rows read only "Revelation" with nothing under them (the export has no author column, so they carry a series only).
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { shelfOf } from '../../src/data/repositories';
import { detailOf as inLogosDetailOf } from '../../src/library/inLogos';
import { KindPage } from '../../src/library/KindPage';
import { detailOf } from '../../src/library/kinds';
import { CATALOGUE, entriesOf, type CatalogueEntry } from '../../src/resources/catalogue';
import { EVERY_BOOK_IDS, keepImport } from '../support/logos-import';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const entry = (over: Partial<CatalogueEntry>): CatalogueEntry => ({
  resource: 'LLS:X', kind: 'commentary', title: 'Revelation', short: 'Revelation', lang: 'en', opens: 'verse', value: 'v', via: 'type', ...over,
});

describe('a row names its book under its name', () => {
  it('two books both short "Revelation" differ by their author and series', () => {
    const a = entry({ resource: 'LLS:A', author: 'Craig S. Keener', series: 'NIV Application Commentary' });
    const b = entry({ resource: 'LLS:B', author: 'Eckhard J. Schnabel', series: 'A Continental Commentary' });
    expect(detailOf(a)).toContain('Craig S. Keener');
    expect(detailOf(a)).toContain('NIV Application Commentary');
    expect(detailOf(b)).toContain('A Continental Commentary');
    expect(detailOf(a)).not.toBe(detailOf(b));
  });

  it('a book with no author shows its series, and one the catalogue gives neither shows the full title only when it differs', () => {
    expect(detailOf(entry({ series: 'The Biblical Illustrator' }))).toBe('The Biblical Illustrator');
    expect(detailOf(entry({ title: 'The Book of Revelation', short: 'LIB Re', series: 'Literary Illustrations of the Bible' }))).toBe('The Book of Revelation · Literary Illustrations of the Bible');
    expect(detailOf(entry({}))).toBe('');
  });

  it('a series the title already holds is not said twice', () => {
    expect(detailOf(entry({ title: 'The Biblical Illustrator: Revelation', short: 'BI Re', series: 'The Biblical Illustrator' }))).toBe('The Biblical Illustrator: Revelation');
  });

  it("the Open list (the in-Logos sheet) names a book the same way", () => {
    expect(inLogosDetailOf).toBe(detailOf);
  });

  it('on no Kind page do two books show the same name and the same line under it (the whole shipped catalogue)', () => {
    const twins: string[] = [];
    for (const kind of new Set(CATALOGUE.map((e) => e.kind))) {
      const seen = new Map<string, string>();
      for (const e of entriesOf(kind)) {
        const key = `${e.short}\n${detailOf(e)}`;
        if (seen.has(key)) twins.push(`${kind}: ${e.short} / ${detailOf(e)} (${seen.get(key)}, ${e.resource})`);
        else seen.set(key, e.resource);
      }
    }
    expect(twins).toEqual([]);
  });
});

describe('Library > Commentaries, search "revelation"', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
    await keepImport(EVERY_BOOK_IDS);
    await shelfOf();
  }, ASYNC_WAIT_MS);
  afterEach(cleanup);

  it('every row named just "Revelation" has a second line, and no two are alike', async () => {
    render(<KindPage kind="commentary" />);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search Commentaries' }), 'revelation');
    const names = await screen.findAllByText('Revelation', { selector: 'p' });
    expect(names.length).toBeGreaterThanOrEqual(2);
    const lines = names.map((p) => {
      const second = p.nextElementSibling;
      expect(second, 'a second line under "Revelation"').not.toBeNull();
      expect((second?.textContent ?? '').trim()).not.toBe('');
      return second!.textContent;
    });
    expect(new Set(lines).size).toBe(lines.length);
  }, ASYNC_WAIT_MS);
});
