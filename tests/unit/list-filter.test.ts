import { describe, expect, it } from 'vitest';
import { matching, ranked, tickedFirst } from '../../src/ui/listFilter';

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
});
