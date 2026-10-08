import { describe, expect, it } from 'vitest';
import { neighbours } from '../../src/data/neighbours';

describe('neighbours', () => {
  it('steps inside a book', () => {
    expect(neighbours('1jn', 1)).toEqual({
      previous: { book: '2pe', chapter: 3, title: '2 Peter 3' },
      next: { book: '1jn', chapter: 2, title: '1 John 2' },
    });
    expect(neighbours('1jn', 2)).toEqual({
      previous: { book: '1jn', chapter: 1, title: '1 John 1' },
      next: { book: '1jn', chapter: 3, title: '1 John 3' },
    });
  });

  it('crosses from one book to the next and back', () => {
    expect(neighbours('rom', 16).next).toEqual({ book: '1co', chapter: 1, title: '1 Corinthians 1' });
    expect(neighbours('1co', 1).previous).toEqual({ book: 'rom', chapter: 16, title: 'Romans 16' });
  });

  it('has no previous before Matthew 1 and no next after Revelation 22', () => {
    expect(neighbours('mat', 1).previous).toBeNull();
    expect(neighbours('mat', 1).next?.title).toBe('Matthew 2');
    expect(neighbours('rev', 22).next).toBeNull();
    expect(neighbours('rev', 22).previous?.title).toBe('Revelation 21');
  });

  it('gives a single-chapter book its neighbours in the next and previous books', () => {
    expect(neighbours('jud', 1)).toEqual({
      previous: { book: '3jn', chapter: 1, title: '3 John 1' },
      next: { book: 'rev', chapter: 1, title: 'Revelation 1' },
    });
  });

  it('knows no neighbours for a book or chapter that is not there', () => {
    expect(neighbours('zzz', 1)).toEqual({ previous: null, next: null });
    expect(neighbours('rom', 17)).toEqual({ previous: null, next: null });
  });
});
