// scripts/split-pairing-sweep.ts (mw-5r3p30.1130): the sweep pairs every Greek verse with its Lampas verse and every Lampas verse with its Greek one, as the dock does, and counts what has no partner.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sweepBook, sweepDoc } from '../../scripts/split-pairing-sweep';
import type { TvtmsMaps } from '../../scripts/data/tvtms';

// a map in which Greek Psalm 9 verses 1-2 are Psalm 9:1-2, Greek 9:22-23 are Psalm 10:1-2, and Greek 9:40 has no Lampas verse
const maps: TvtmsMaps = {
  toLampas: (ref) => {
    const m = /^psa (\d+):(\d+)$/.exec(ref);
    if (!m) return { state: 'none', refs: [] };
    const [chapter, verse] = [Number(m[1]), Number(m[2])];
    if (chapter === 9 && verse <= 2) return { state: 'same', refs: [ref] };
    if (chapter === 9 && (verse === 22 || verse === 23)) return { state: 'one', refs: [`psa 10:${verse - 21}`] };
    return { state: 'none', refs: [] };
  },
  toGreek: () => ({ state: 'none', refs: [] }),
  lxx2012ToGreek: () => ({ state: 'none', refs: [] }),
  problems: [],
};

// Psalms 1-8 are empty here; Psalm 9 has 4 verses and Psalm 10 has 3
const COUNTS = [0, 0, 0, 0, 0, 0, 0, 0, 4, 3];

describe('the pairing sweep', () => {
  it('counts the Greek verses with no Lampas verse and the Lampas verses with no Greek verse, per Lampas chapter', () => {
    const book = sweepBook('psa', 'Psalms', new Map([[9, [1, 2, 22, 23, 40]]]), COUNTS, maps, { psa: COUNTS });
    expect(book.greekVerses).toBe(5);
    expect(book.greekUnpaired).toBe(1);
    expect(book.lampasVerses).toBe(7);
    // Psalm 9 has verses 3 and 4 with no Greek verse; Psalm 10 has verse 3
    expect(book.lampasUnpaired).toBe(3);
    expect(book.chapters).toEqual([
      [9, 2],
      [10, 1],
    ]);
  });

  it('writes the same document twice and names the totals', () => {
    const book = sweepBook('psa', 'Psalms', new Map([[9, [1, 2, 22, 23, 40]]]), COUNTS, maps, { psa: COUNTS });
    const doc = sweepDoc([book]);
    expect(doc).toBe(sweepDoc([book]));
    expect(doc).toContain('| Psalms | 5 | 1 | 7 | 3 | 9 (2), 10 (1) |');
    expect(doc).toContain('| **All 1 books** | 5 | 1 | 7 | 3 | |');
  });

  it('the committed doc covers the 39 books and its totals line is the sum of its rows', () => {
    const doc = readFileSync('docs/split-pairing-sweep.md', 'utf8');
    const rows = doc.split('\n').filter((l) => /^\| [^*|-]/.test(l) && !l.startsWith('| Book'));
    expect(rows).toHaveLength(39);
    const cells = (row: string) => row.split('|').slice(1, -1).map((c) => c.trim());
    const sum = (col: number) => rows.reduce((n, r) => n + Number(cells(r)[col].replace(/,/g, '')), 0);
    const totals = cells(doc.split('\n').find((l) => l.startsWith('| **All'))!);
    expect(Number(totals[2].replace(/,/g, ''))).toBe(sum(2));
    expect(Number(totals[4].replace(/,/g, ''))).toBe(sum(4));
  });
});
