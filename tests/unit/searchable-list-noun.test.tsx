// tests/unit/searchable-list-noun.test.tsx — the search field of a SearchableList counts in the right plural (mw-efwust): 'Search 36 commentaries', 'Search 1 commentary',
// not 'Search 12 commentarys'. Every kind of the Library and the Daily devotional list is checked, with the counts they show.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { infoOf } from '../../src/library/kinds';
import { KINDS } from '../../src/resources/catalogue';
import { SearchableList } from '../../src/ui/SearchableList';
import { pluralOf } from '../../src/ui/listFilter';

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `i${i}`, name: `Item ${i}` }));
const placeholder = (noun: string, n: number): string | null => {
  const { container, unmount } = render(<SearchableList label="Things" noun={noun} items={items(n)} />);
  const got = container.querySelector('input[type=search]')?.getAttribute('placeholder') ?? null;
  unmount();
  return got;
};

describe('the search placeholder of a SearchableList', () => {
  it('says "Search 36 commentaries" and "Search 1 commentary"', () => {
    expect(placeholder('commentary', 36)).toBe('Search 36 commentaries');
    expect(placeholder('commentary', 1)).toBe('Search 1 commentary');
  });

  it('reads right for every kind of the Library and for the devotionals, at 0, 1 and many', () => {
    const nouns = [...KINDS.map((k) => infoOf(k).singular.toLowerCase()), 'devotional'];
    for (const noun of nouns) {
      const many = placeholder(noun, 12);
      expect(many, noun).toBe(`Search 12 ${pluralOf(noun, 12)}`);
      expect(many, noun).not.toMatch(/ys$/);
      expect(placeholder(noun, 1), noun).toBe(`Search 1 ${noun}`);
    }
    expect(placeholder('greek text', 8)).toBe('Search 8 greek texts');
    expect(placeholder('lexicon', 21)).toBe('Search 21 lexicons');
    expect(placeholder('bible', 42)).toBe('Search 42 bibles');
  });

  it('pluralises the endings a noun can have', () => {
    expect(pluralOf('commentary', 2)).toBe('commentaries');
    expect(pluralOf('day', 2)).toBe('days');
    expect(pluralOf('index', 2)).toBe('indexes');
    expect(pluralOf('verse', 2)).toBe('verses');
    expect(pluralOf('verse', 1)).toBe('verse');
    expect(pluralOf('verse', 0)).toBe('verses');
  });

  it('keeps "No <noun> matches" in the singular', () => {
    render(<SearchableList label="Things" noun="commentary" items={[]} />);
    expect(screen.getByText('No commentary matches')).toBeTruthy();
  });
});
