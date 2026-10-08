import { describe, expect, it } from 'vitest';
import { matching, tickedFirst } from '../../src/ui/listFilter';

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
});
