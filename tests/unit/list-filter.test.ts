import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { matching, matchingExactly, matchingInOrder, matchingInOrderExactly, ranked, slipsAway, tickedFirst } from '../../src/ui/listFilter';

const items = [
  { id: 'a', name: 'BDAG' },
  { id: 'b', name: 'Louw-Nida' },
  { id: 'c', name: 'EDNT' },
];

describe('listFilter', () => {
  it('filters by a part of the name, ignoring case and the spaces at the ends', () => {
    expect(matching(items, ' LOUW ').map((i) => i.id)).toEqual(['b']);
    expect(matching(items, 'zzz')).toEqual([]);
  });
  it('keeps every item for an empty search', () => {
    expect(matching(items, '  ')).toEqual(items);
  });
  it('puts the ticked first, each group in the list order', () => {
    expect(tickedFirst(items, new Set(['c', 'a'])).map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });
  it('also looks in the text an item carries beside its name (a book is found by its author)', () => {
    const books = [{ id: 'x', name: '365 Days with Calvin', also: 'John Calvin; Joel R. Beeke' }, { id: 'y', name: 'BDAG' }];
    expect(matching(books, 'beeke').map((i) => i.id)).toEqual(['x']);
    expect(matching(books, 'bdag').map((i) => i.id)).toEqual(['y']);
  });
  it('orders by rank, each rank in the list order, an unranked item last', () => {
    const rank = new Map([['c', 0], ['a', 1], ['b', 1]]);
    expect(ranked(items, rank).map((i) => i.id)).toEqual(['c', 'a', 'b']);
    expect(ranked(items, new Map([['b', 0]])).map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  // mw-5r3p30.1140: letters in order rank the names whose word starts with the first letter typed before the rest
  describe('letters in order put a word start first', () => {
    const books = BOOKS.map((b) => ({ id: b.code, name: b.name }));
    const names = (query: string) => matchingInOrder(books, query).map((i) => i.name);

    it("'rn' lists Romans and Revelation before the names that only hold r then n in the middle of a word", () => {
      expect(names('rn')).toEqual(['Romans', 'Revelation', 'Deuteronomy', '1 Chronicles', '2 Chronicles', '1 Corinthians', '2 Corinthians']);
      expect(matchingInOrderExactly(books, 'rn').map((i) => i.name)).toEqual(names('rn'));
    });

    it("a word start counts: 'cr' lists the Chronicles and Corinthians before Zechariah, which holds c then r inside a word", () => {
      const found = names('cr');
      expect(found.slice(0, 4)).toEqual(['1 Chronicles', '2 Chronicles', '1 Corinthians', '2 Corinthians']);
      expect(found.indexOf('Zechariah')).toBeGreaterThan(found.indexOf('2 Corinthians'));
    });

    it('still ranks a start, then a hold, before letters in order, and finds the old cases', () => {
      expect(names('phlm')).toContain('Philemon');
      expect(names('1jn')[0]).toBe('1 John');
      expect(names('mat')[0]).toBe('Matthew');
      const list = [{ id: 'a', name: 'Aaron' }, { id: 'b', name: 'Barn' }, { id: 'c', name: 'Rain' }];
      // 'rn': Barn holds it (rank 1), Rain's word starts with r, Aaron has r then n inside a word
      expect(matchingInOrderExactly(list, 'rn').map((i) => i.id)).toEqual(['b', 'c', 'a']);
    });
  });

  // mw-fnvjof.17.8: when no name holds what he typed, the names one slip away show, closest first
  describe('a fat finger is forgiven when nothing else matches', () => {
    const books = BOOKS.map((b) => ({ id: b.code, name: b.name }));
    const names = (query: string) => matchingInOrder(books, query).map((i) => i.name);

    it.each([
      ['mwt', 'Matthew'],
      ['jhon', 'John'],
      ['rmoans', 'Romans'],
      ['gensis', 'Genesis'],
      ['acs', 'Acts'],
      ['lukke', 'Luke'],
    ])('%s finds %s first', (typed, name) => {
      expect(names(typed)[0]).toBe(name);
    });

    it('puts a neighbouring key before any other letter wrong, and a swap before a missing letter', () => {
      // w is next to a on the keyboard; 'mst' has s next to a, but 'mpt' has p, which is far from a
      expect(slipsAway(books, 'mwt')[0]).toMatchObject({ item: { name: 'Matthew' } });
      const cost = (typed: string) => slipsAway(books, typed).find((s) => s.item.name === 'Matthew')?.cost;
      expect(cost('mst')).toBeLessThan(cost('mpt')!);
      expect(cost('mtathew')).toBeLessThan(cost('mathew')!);
    });

    it('lists only the books one slip away for three to five letters, two for six or more', () => {
      expect(names('mwt')).toEqual(['Matthew']);
      expect(names('rmoans')).toEqual(['Romans']);
      expect(names('romnas')).toEqual(['Romans']);
      expect(names('rmoanz')).toEqual(['Romans']);
      // two letters wrong in a five-letter word is too far; in a six-letter word it is not
      expect(names('rmnas')).toEqual([]);
      expect(names('rmonas')).toEqual(['Romans']);
    });

    it('uses no fallback while the exact search finds a name', () => {
      expect(names('mat')).toEqual(matchingInOrderExactly(books, 'mat').map((i) => i.name));
      expect(names('mat')[0]).toBe('Matthew');
      expect(names('mat')).not.toContain('Mark');
      expect(names('phlm')).toEqual(matchingInOrderExactly(books, 'phlm').map((i) => i.name));
    });

    it('shows nothing for letters no name is near, and for fewer than three letters', () => {
      expect(names('zzzz')).toEqual([]);
      expect(names('xq')).toEqual([]);
      expect(slipsAway(books, 'mw')).toEqual([]);
    });

    it('orders names the same number of slips away by the list', () => {
      expect(names('ape')).toEqual(['1 Peter', '2 Peter']);
    });

    it('is the fallback of matching too, over a name only (a text beside it is held exactly or not at all)', () => {
      const lexicons = [{ id: 'a', name: 'Louw-Nida' }, { id: 'b', name: 'BDAG', also: 'Bauer' }];
      expect(matching(lexicons, 'luow').map((i) => i.id)).toEqual(['a']);
      expect(matching(lexicons, 'baeur')).toEqual([]);
      expect(matching(lexicons, 'bda').map((i) => i.id)).toEqual(['b']);
      expect(matchingExactly(lexicons, 'luow')).toEqual([]);
      expect(matching(lexicons, 'zzzz')).toEqual([]);
    });
  });
});
