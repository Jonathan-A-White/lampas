// The Hebrew seed (mw-gdcyf98.16): the 100 commonest Hebrew lemmas of the Old Testament with their TBESH glosses, written by scripts/seed-build.ts from
// public/data/frequency-hbo.json and lexicon-hbo.json in the Greek seed's shape. PROVISIONAL: אֵת and the article are in.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hebrewSeed, renderHebrewSeed } from '../../scripts/seed-build';
import { SEED_WORDS_HBO } from '../../src/data/seed-words-hbo';
import { SEED_WORDS } from '../../src/data/seed-words';

const frequency = JSON.parse(readFileSync('public/data/frequency-hbo.json', 'utf8')) as { lemma: string; strongs: string }[];
const lexicon = JSON.parse(readFileSync('public/data/lexicon-hbo.json', 'utf8')) as Record<string, { g: string; s: string; c: string }>;

describe('the Hebrew seed list', () => {
  it('holds 100 distinct lemmas, all Hebrew, lesson 0, each with a gloss and a part of speech', () => {
    expect(SEED_WORDS_HBO).toHaveLength(100);
    expect(new Set(SEED_WORDS_HBO.map((w) => w.lemma)).size).toBe(100);
    for (const w of SEED_WORDS_HBO) {
      expect(w.lang, w.lemma).toBe('hbo');
      expect(w.lesson, w.lemma).toBe(0);
      expect(w.gloss, w.lemma).not.toBe('');
      expect(w.pos, w.lemma).not.toBe('');
      expect(w.lemma, w.lemma).toBe(w.lemma.normalize('NFC'));
    }
  });

  it('starts with the ten commonest: אֵת, the LORD, upon, to, which, all, to say, not, son, for', () => {
    expect(SEED_WORDS_HBO.slice(0, 10)).toEqual([
      { lemma: 'אֵת', lang: 'hbo', gloss: '[Obj.]', lesson: 0, pos: 'particle' },
      { lemma: 'יְהֹוָה', lang: 'hbo', gloss: 'LORD', lesson: 0, pos: 'noun' },
      { lemma: 'עַל', lang: 'hbo', gloss: 'upon', lesson: 0, pos: 'preposition' },
      { lemma: 'אֶל', lang: 'hbo', gloss: 'to(wards)', lesson: 0, pos: 'preposition' },
      { lemma: 'אֲשֶׁר', lang: 'hbo', gloss: 'which', lesson: 0, pos: 'relative pronoun' },
      { lemma: 'כֹּל', lang: 'hbo', gloss: 'all', lesson: 0, pos: 'noun' },
      { lemma: 'אָמַר', lang: 'hbo', gloss: 'to say', lesson: 0, pos: 'verb' },
      { lemma: 'לֹא', lang: 'hbo', gloss: 'not', lesson: 0, pos: 'negative' },
      { lemma: 'בֵּן', lang: 'hbo', gloss: 'son, child', lesson: 0, pos: 'noun' },
      { lemma: 'כִּי', lang: 'hbo', gloss: 'for', lesson: 0, pos: 'conjunction' },
    ]);
  });

  it('has every entry in the Hebrew lexicon, with the lexicon’s gloss and part of speech, in the order of the frequency table', () => {
    for (const w of SEED_WORDS_HBO) expect(lexicon[w.lemma], w.lemma).toMatchObject({ g: w.gloss, c: w.pos });
    const order = frequency.map((e) => e.lemma.normalize('NFC')).filter((l, i, all) => all.indexOf(l) === i);
    expect(SEED_WORDS_HBO.map((w) => w.lemma)).toEqual(order.slice(0, 100));
  });

  it('is exactly what seed:build would write, and a lemma two Strong’s numbers share (אֵת) is listed once', () => {
    expect(readFileSync('src/data/seed-words-hbo.ts', 'utf8')).toBe(renderHebrewSeed(hebrewSeed(frequency, lexicon)));
    expect(frequency.slice(0, 100).filter((e) => e.lemma === 'אֵת')).toHaveLength(2);
    expect(SEED_WORDS_HBO.filter((w) => w.lemma === 'אֵת')).toHaveLength(1);
  });

  it('refuses a lemma the lexicon lacks, and leaves the Greek seed with no language', () => {
    expect(() => hebrewSeed([{ lemma: 'אאא' }], {})).toThrow(/no entry/);
    expect(SEED_WORDS.every((w) => w.lang === undefined)).toBe(true);
  });
});
