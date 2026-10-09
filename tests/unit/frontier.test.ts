// src/data/frontier.ts on a made-up chapter (tests/fixtures/frontier.ts), and on Romans 8 with his seed.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { easiestVerse, pickFrontier, type Candidate, type Known } from '../../src/data/frontier';
import type { FrequencyEntry } from '../../src/data/frequency';
import { normaliseLemma } from '../../src/data/lemma';
import { SEED_WORDS } from '../../src/data/seed-words';
import {
  FIXTURE_CHAPTER,
  FIXTURE_DROPPED,
  FIXTURE_FREQUENCY,
  FIXTURE_LEARNING,
  FIXTURE_SOLID,
} from '../fixtures/frontier';

const known: Known = { solid: FIXTURE_SOLID, learning: FIXTURE_LEARNING, dropped: FIXTURE_DROPPED };
const lemmas = (list: Candidate[]) => list.map((c) => c.lemma);
const candidate = (lemma: string) => {
  const c = pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 100).find((x) => x.lemma === lemma);
  if (!c) throw new Error(`${lemma} is not a candidate`);
  return c;
};

describe('pickFrontier', () => {
  it('never offers a solid, a learning or a dropped word', () => {
    const all = lemmas(pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 100));
    for (const l of ['καί', 'εἰμί', 'φῶς', 'κόσμος']) expect(all).not.toContain(l);
    expect(all).toContain('θεός');
  });

  it('offers a word again once it is in none of the three sets', () => {
    const none: Known = { solid: new Set(), learning: new Set(), dropped: new Set() };
    expect(lemmas(pickFrontier(FIXTURE_CHAPTER, none, FIXTURE_FREQUENCY, 100))).toEqual(
      expect.arrayContaining(['καί', 'εἰμί', 'φῶς', 'κόσμος']),
    );
  });

  it('ranks two unknown words by how often the New Testament uses them', () => {
    const all = lemmas(pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 100));
    expect(all.indexOf('θεός')).toBeLessThan(all.indexOf('λόγος'));
    expect(all.indexOf('λόγος')).toBeLessThan(all.indexOf('ἀγάπη'));
  });

  it('ranks a proper noun after every common word, however often it is used', () => {
    const list = pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 100);
    expect(candidate('Παῦλος').count).toBeGreaterThan(candidate('ἀγάπη').count);
    expect(lemmas(list)[list.length - 1]).toBe('Παῦλος');
  });

  it('breaks a tie of New Testament counts by the count in the chapter, then by the first verse', () => {
    expect(lemmas(pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 100))).toEqual([
      'θεός',
      'λόγος',
      'ἀγάπη',
      'δόξα', // 100 in the NT, twice in the chapter
      'ἔργον', // 100, once, first in verse 8
      'ὁδός', // 100, once, first in verse 9
      'Παῦλος',
    ]);
  });

  it('caps the list at n, keeping the first n', () => {
    expect(lemmas(pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 3))).toEqual(['θεός', 'λόγος', 'ἀγάπη']);
    expect(pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 0)).toEqual([]);
    expect(pickFrontier(FIXTURE_CHAPTER, known, FIXTURE_FREQUENCY, 100)).toHaveLength(7);
  });

  it('gives each candidate its Strong\'s number, lemma, gloss, count and the verses it stands in', () => {
    expect(candidate('θεός')).toEqual({ strongs: 'G2316', lemma: 'θεός', gloss: 'God', count: 1317, verses: [1, 3, 4, 6] });
    expect(candidate('δόξα').verses).toEqual([8, 9]);
  });

  it('puts a word the table lacks after the words it has', () => {
    const table = FIXTURE_FREQUENCY.filter((e) => e.lemma !== 'λόγος');
    const list = pickFrontier(FIXTURE_CHAPTER, known, table, 100);
    expect(list.find((c) => c.lemma === 'λόγος')?.count).toBe(0);
    expect(lemmas(list).indexOf('λόγος')).toBeGreaterThan(lemmas(list).indexOf('ὁδός'));
  });
});

describe('easiestVerse', () => {
  it('picks the verse with the highest share of solid words, even when it is longer', () => {
    expect(easiestVerse(candidate('ἀγάπη'), FIXTURE_CHAPTER, FIXTURE_SOLID)).toBe(5); // 3 of 4, over verse 3 (3 of 6) and verse 7 (0 of 2)
    expect(easiestVerse(candidate('λόγος'), FIXTURE_CHAPTER, FIXTURE_SOLID)).toBe(1); // 2 of 4, over verse 7 (0 of 2)
  });

  it('breaks a tie of share by the fewest Greek words', () => {
    // θεός: verse 4 is 2 of 3 and verse 6 is 4 of 6; verses 1 and 3 are only 1 of 2
    expect(easiestVerse(candidate('θεός'), FIXTURE_CHAPTER, FIXTURE_SOLID)).toBe(4);
  });

  it('takes the earlier verse when share and length are both equal', () => {
    const v5 = FIXTURE_CHAPTER.verses[4];
    const twin = { ...FIXTURE_CHAPTER, verses: [{ ...v5, n: 11 }, { ...v5, n: 12 }] };
    expect(easiestVerse({ ...candidate('ἀγάπη'), verses: [11, 12] }, twin, FIXTURE_SOLID)).toBe(11);
  });

  it('gives the one verse a name stands in', () => {
    expect(easiestVerse(candidate('Παῦλος'), FIXTURE_CHAPTER, FIXTURE_SOLID)).toBe(2);
  });

  it('answers null for a word the chapter does not hold', () => {
    const stray: Candidate = { strongs: 'G1', lemma: 'ἀλφα', gloss: '', count: 1, verses: [] };
    expect(easiestVerse(stray, FIXTURE_CHAPTER, FIXTURE_SOLID)).toBeNull();
  });
});

describe('Romans 8 with his seed', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const frequency = JSON.parse(readFileSync('public/data/frequency.json', 'utf8')) as FrequencyEntry[];
  const set = (pick: (lesson: number) => boolean) =>
    new Set(
      SEED_WORDS.filter((s) => pick(s.lesson)).flatMap((s) => {
        const { headword, lemmas } = normaliseLemma(s.lemma);
        return [headword, ...lemmas].map((l) => l.normalize('NFC'));
      }),
    );
  const seed: Known = { solid: set((n) => n <= 9), learning: set((n) => n > 9), dropped: new Set() };

  it('gives a non-empty list whose first word is not a name', () => {
    const list = pickFrontier(chapter, seed, frequency, 5);
    expect(list.length).toBeGreaterThan(0);
    expect(frequency.find((e) => e.strongs === list[0].strongs)?.proper).toBe(false);
    for (const c of list) {
      expect(seed.solid.has(c.lemma) || seed.learning.has(c.lemma)).toBe(false);
      expect(easiestVerse(c, chapter, seed.solid)).not.toBeNull();
    }
  });
});
