// A book that holds only part of a Bible book is offered only where it has the verse (mw-qtu3zvz.238): Wiersbe's Be Skillful is on Proverbs 1:8 to 9:18 (its ReferenceSupersets, `bible.20.1.8-20.9.18`),
// so at Proverbs 19:3 Logos opened its contents and then 'Navigation failed' at Prov 7:10. The catalogue holds that span as `within`, and every row of the chooser is checked against it.
import { describe, expect, it } from 'vitest';
import { inLogosRows, spanHolds } from '../../src/library/inLogos';
import { spansOfSupersets } from '../../src/library/parseExport';
import { CATALOGUE, entriesOf } from '../../src/resources/catalogue';
import { bibleRef } from '../../src/resources/logosBible';
import { EVERY_BOOK } from '../support/logos-import';

const SKILLFUL = 'LLS:29.25.1';
const states = new Map(CATALOGUE.map((e) => [e.resource, 'on' as const]));
const rowsAt = (book: string, chapter: number, verse?: number) => inLogosRows(CATALOGUE, states, { book, chapter, verse }, EVERY_BOOK);

describe('the span of a book a ReferenceSupersets cell holds', () => {
  it('is read for a book the cell does not hold whole', () => {
    expect(spansOfSupersets('bible.20.1.8-20.9.18')).toEqual({ pro: '1.8-9.18' });
    expect(spansOfSupersets('bible.66.2.1-67.3.5')).toEqual({ rom: '2.1-', '1co': '-3.5' });
    expect(spansOfSupersets('bible.20.4-20.9')).toEqual({ pro: '4-9' });
  });

  it('is nothing for a book held whole, by one token or by several', () => {
    expect(spansOfSupersets('bible.20.1.1-20.31.31')).toEqual({});
    expect(spansOfSupersets('bible.1.1.1-39.4.6\tbible.61.1.1-87.22.21')).toEqual({});
    expect(spansOfSupersets('bible+esv.61-87')).toEqual({});
    expect(spansOfSupersets('bible.20.1.1-20.5.5\tbible.20.6.1-20.31.31')).toEqual({});
    expect(spansOfSupersets('dayofyear.1.1-12.31')).toEqual({});
    expect(spansOfSupersets('')).toEqual({});
  });

  it('holds a place by its chapter and verse', () => {
    expect(spanHolds('1.8-9.18', 1, 7)).toBe(false);
    expect(spanHolds('1.8-9.18', 1, 8)).toBe(true);
    expect(spanHolds('1.8-9.18', 1)).toBe(true);
    expect(spanHolds('1.8-9.18', 9, 18)).toBe(true);
    expect(spanHolds('1.8-9.18', 9, 19)).toBe(false);
    expect(spanHolds('1.8-9.18', 19, 3)).toBe(false);
    expect(spanHolds('4-9', 9, 40)).toBe(true);
    expect(spanHolds('2.1-', 30, 2)).toBe(true);
    expect(spanHolds('-3.5', 1, 1)).toBe(true);
  });
});

describe('Be Skillful in the chooser', () => {
  it('is catalogued with the span its export names', () => {
    expect(entriesOf('commentary').find((e) => e.resource === SKILLFUL)?.within).toEqual({ pro: '1.8-9.18' });
  });

  it('is offered inside Proverbs 1:8 to 9:18, with a reference Logos can resolve in it, and not at Proverbs 19:3', () => {
    const at = rowsAt('pro', 7, 10).find((r) => r.entry.resource === SKILLFUL);
    expect(at?.link.url).toBe(`logosres:${SKILLFUL};ref=Bible.Pr7.10`);
    expect(rowsAt('pro', 19, 3).map((r) => r.entry.resource)).not.toContain(SKILLFUL);
    expect(rowsAt('pro', 1, 7).map((r) => r.entry.resource)).not.toContain(SKILLFUL);
    expect(rowsAt('pro', 9, 18).map((r) => r.entry.resource)).toContain(SKILLFUL);
    expect(rowsAt('pro', 19, 3).map((r) => r.entry.resource)).toEqual(expect.arrayContaining(['LLS:29.1.8', 'LLS:BST20PR']));
  });
});

describe('every row of the chooser, Old and New Testament', () => {
  const BOOKS = [...new Set(CATALOGUE.flatMap((e) => e.covers ?? []))];

  it('opens at a Bible reference its own book holds: Bible.<book><chapter>.<verse>, inside the span the catalogue names', () => {
    for (const book of BOOKS) {
      for (const [chapter, verse] of [[1, 1], [3, 5], [9, 18], [19, 3], [40, 2]] as const) {
        for (const row of rowsAt(book, chapter, verse)) {
          const ref = bibleRef(book, chapter, verse);
          if (row.entry.kind !== 'bible') expect(row.link.url, `${row.entry.resource} at ${book} ${chapter}:${verse}`).toBe(`logosres:${row.entry.resource};ref=${ref}`);
          const span = row.entry.within?.[book];
          if (span) expect(spanHolds(span, chapter, verse), `${row.entry.resource} at ${book} ${chapter}:${verse} is offered outside ${span}`).toBe(true);
        }
      }
    }
  });

  it('names a span only for a book it covers', () => {
    for (const e of CATALOGUE) for (const book of Object.keys(e.within ?? {})) expect(e.covers, `${e.resource} ${book}`).toContain(book);
  });
});
