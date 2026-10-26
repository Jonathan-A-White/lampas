import { describe, expect, it } from 'vitest';
import { neighbours, verseNeighbours } from '../../src/data/neighbours';

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

  it('has no previous before Genesis 1 and no next after Revelation 22', () => {
    expect(neighbours('gen', 1).previous).toBeNull();
    expect(neighbours('gen', 1).next?.title).toBe('Genesis 2');
    expect(neighbours('mat', 1).next?.title).toBe('Matthew 2');
    expect(neighbours('rev', 22).next).toBeNull();
    expect(neighbours('rev', 22).previous?.title).toBe('Revelation 21');
  });

  it('runs across the testaments: Malachi 4 is followed by Matthew 1 and Matthew 1 is preceded by Malachi 4', () => {
    expect(neighbours('mal', 4).next).toEqual({ book: 'mat', chapter: 1, title: 'Matthew 1' });
    expect(neighbours('mat', 1).previous).toEqual({ book: 'mal', chapter: 4, title: 'Malachi 4' });
    expect(neighbours('gen', 50).next).toEqual({ book: 'exo', chapter: 1, title: 'Exodus 1' });
    expect(neighbours('jon', 4).previous?.title).toBe('Jonah 3');
  });

  it('gives its verses neighbours across the testaments too', () => {
    expect(verseNeighbours('mal', 4, 6).next).toEqual({ book: 'mat', chapter: 1, verse: 1 });
    expect(verseNeighbours('mat', 1, 1).previous).toEqual({ book: 'mal', chapter: 4, verse: 6 });
    expect(verseNeighbours('gen', 1, 1).previous).toBeNull();
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
