import { describe, expect, it } from 'vitest';
import type { Verse } from '../../src/data/chapter';
import { DEFAULT_LAYOUT, LAYOUTS, blocksOf, isLayout, layoutOf } from '../../src/layout/layouts';

const verse = (n: number, extra: Partial<Verse> = {}): Verse => ({ n, g: [], e: [], ...extra });
const verses = [verse(1, { h: 'A', p: 1 }), verse(2), verse(3), verse(4, { p: 1 }), verse(5), verse(6, { h: 'B' }), verse(7)];
const numbers = (blocks: Verse[][]) => blocks.map((b) => b.map((v) => v.n));

describe('reading layouts', () => {
  it('lists Verse by verse and Paragraph, Verse by verse the default', () => {
    expect(LAYOUTS.map((l) => l.label)).toEqual(['Verse by verse', 'Paragraph']);
    expect(DEFAULT_LAYOUT).toBe('verse');
    expect(isLayout('paragraph')).toBe(true);
    expect(isLayout('columns')).toBe(false);
    expect(layoutOf('columns').id).toBe('verse');
  });

  it('cuts one block per verse in Verse by verse', () => {
    expect(numbers(blocksOf(verses, 'verse'))).toEqual([[1], [2], [3], [4], [5], [6], [7]]);
  });

  it('cuts a block at each paragraph start and at each heading in Paragraph', () => {
    expect(numbers(blocksOf(verses, 'paragraph'))).toEqual([[1, 2, 3], [4, 5], [6, 7]]);
  });

  it('starts the first verse a block whether or not it has p', () => {
    expect(numbers(blocksOf([verse(1), verse(2), verse(3, { p: 1 })], 'paragraph'))).toEqual([[1, 2], [3]]);
    expect(blocksOf([], 'paragraph')).toEqual([]);
  });
});
