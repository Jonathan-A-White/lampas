// src/maps/places.ts: placesIn answers the places named in a chapter's verses from the committed per-book files (src/maps/data/places), loaded on first use.
import { describe, expect, it } from 'vitest';
import { placesIn, setPlaceLoader } from '../../src/maps/places';

const names = (list: { name: string }[]) => list.map((p) => p.name);

describe('placesIn', () => {
  it('answers Genesis 10:19 with its places, in the order the verse names them', async () => {
    const found = names(await placesIn({ book: 'gen', chapter: 10, from: 19 }));
    // the eight the verse's border runs through, and the land of Canaan, whose people TIPNR lists under the place Canaan, first
    expect(found).toEqual(['Canaan', 'Sidon', 'Gerar', 'Gaza', 'Sodom', 'Gomorrah', 'Admah', 'Zeboiim', 'Lasha']);
  });

  it('gives Gerar its Strong\'s number and its coordinates, Admah and Lasha theirs, and a place without one none', async () => {
    const found = Object.fromEntries((await placesIn({ book: 'gen', chapter: 10, from: 19 })).map((p) => [p.name, p]));
    expect(found.Gerar).toMatchObject({ id: 'Gerar@Gen.10.19-2Ch', strongs: ['H1642'], region: 'Philistia' });
    expect(found.Gerar.lat).toBeCloseTo(31.39, 1);
    expect(found.Gerar.lng).toBeCloseTo(34.56, 1);
    expect(found.Admah.lat).toBeTypeOf('number');
    expect(found.Lasha.lng).toBeTypeOf('number');
    expect(found.Lasha.names).toContain('Nahaliel');
  });

  it('answers each place once, with a range of verses, and the whole chapter when no verse is given', async () => {
    const range = await placesIn({ book: 'gen', chapter: 10, from: 18, to: 19 });
    expect(names(range).filter((n) => n === 'Sidon')).toHaveLength(1);
    expect(names(range)).toContain('Lasha');
    const whole = await placesIn({ book: 'gen', chapter: 10 });
    expect(new Set(names(whole)).size).toBe(whole.length);
    expect(names(whole)).toEqual(expect.arrayContaining(['Babylon', 'Sidon', 'Lasha', 'Nineveh']));
    expect(names(whole).indexOf('Babylon')).toBeLessThan(names(whole).indexOf('Nineveh')); // verse 10 before verse 11
  });

  it('answers a verse alone for a reference without "to", and the verses between from and to', async () => {
    expect(names(await placesIn({ book: 'gen', chapter: 10, from: 10 }))).toEqual(expect.arrayContaining(['Babylon', 'Erech', 'Accad', 'Calneh']));
    expect(names(await placesIn({ book: 'gen', chapter: 10, from: 10 }))).not.toContain('Lasha');
    expect(names(await placesIn({ book: 'gen', chapter: 10, from: 10, to: 12 }))).toEqual(expect.arrayContaining(['Babylon', 'Nineveh', 'Calah']));
  });

  it('answers [] for a chapter with no places, a verse with none and a book with none', async () => {
    expect(await placesIn({ book: 'gen', chapter: 1 })).toEqual([]);
    expect(await placesIn({ book: 'gen', chapter: 10, from: 1 })).toEqual([]);
    expect(await placesIn({ book: 'xyz', chapter: 1 })).toEqual([]);
  });

  it('answers the New Testament\'s places from its own files', async () => {
    expect(names(await placesIn({ book: 'act', chapter: 27 }))).toEqual(expect.arrayContaining(['Italy', 'Myra', 'Fair Havens', 'Cauda']));
  });

  it('reads a book once, and a test can put its own places in the place of the files', async () => {
    let reads = 0;
    setPlaceLoader(async () => {
      reads += 1;
      return [{ id: 'A@Gen.1.1', name: 'A', names: ['A'], strongs: [], verses: [[1, 1]] }];
    });
    try {
      expect(names(await placesIn({ book: 'gen', chapter: 1, from: 1 }))).toEqual(['A']);
      expect(names(await placesIn({ book: 'gen', chapter: 1 }))).toEqual(['A']);
      expect(reads).toBe(1);
    } finally {
      setPlaceLoader(undefined);
    }
  });
});
