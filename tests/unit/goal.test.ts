import { describe, expect, it } from 'vitest';
import type { BookIndex } from '../../src/data/chapter';
import { goalText, goalTitle, parseGoal } from '../../src/data/goal';
import { readFileSync } from 'node:fs';

const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;

describe('parseGoal', () => {
  it('round-trips a verse, a chapter and a book', () => {
    expect(parseGoal('1 John 1:1', index)).toEqual({ book: '1jn', chapter: 1, verse: 1 });
    expect(parseGoal('1 John 1', index)).toEqual({ book: '1jn', chapter: 1 });
    expect(parseGoal('1 John', index)).toEqual({ book: '1jn' });
    for (const text of ['1 John 1:1', '1 John 1', '1 John']) {
      const goal = parseGoal(text, index);
      expect(goal && goalText(goal)).toBe(text);
      expect(parseGoal(goalText(goal!), index)).toEqual(goal);
    }
  });

  it('takes a leading Read, a book code, loose case and spacing', () => {
    const verse = { book: '1jn', chapter: 1, verse: 1 };
    expect(parseGoal('Read 1 John 1:1', index)).toEqual(verse);
    expect(parseGoal('1jn 1:1', index)).toEqual(verse);
    expect(parseGoal('  read   1  JOHN   1 : 1 ', index)).toEqual(verse);
    expect(parseGoal('romans 8', index)).toEqual({ book: 'rom', chapter: 8 });
  });

  it('refuses a book, a chapter or a verse the index does not have', () => {
    expect(parseGoal('1 John 9', index)).toBeUndefined();
    expect(parseGoal('Romans 8:99', index)).toBeUndefined();
    expect(parseGoal('Hezekiah 1', index)).toBeUndefined();
    expect(parseGoal('1 John 0', index)).toBeUndefined();
    expect(parseGoal('1 John 1:0', index)).toBeUndefined();
    expect(parseGoal('', index)).toBeUndefined();
    expect(parseGoal('Read', index)).toBeUndefined();
  });
});

describe('goalTitle', () => {
  it('writes Read and the place', () => {
    expect(goalTitle({ book: '1jn', chapter: 1, verse: 1 }, index)).toBe('Read 1 John 1:1');
    expect(goalTitle({ book: '1jn', chapter: 1 }, index)).toBe('Read 1 John 1');
    expect(goalTitle({ book: '1jn' }, index)).toBe('Read 1 John');
  });
});
