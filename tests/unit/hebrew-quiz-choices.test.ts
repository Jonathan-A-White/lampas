// The Quick test's questions on a Hebrew word (mw-gdcyf98.19): the wrong glosses are Hebrew words' (the Hebrew seed and his Hebrew words), never a Greek word's; a Greek question is as it was.
import { describe, expect, it } from 'vitest';
import { SEED_WORDS } from '../../src/data/seed-words';
import { SEED_WORDS_HBO } from '../../src/data/seed-words-hbo';
import type { Word } from '../../src/data/db';
import { buildQuestion, distractorsFor, mulberry32, seedDistractors } from '../../src/data/quiz';

const NFC = (s: string): string => s.normalize('NFC');
const HEBREW = /[֐-׿]/;

const hebrewWord = (lemma: string, gloss: string, state: Word['state'] = 'learning'): Word => ({ lemma: NFC(lemma), lang: 'hbo', lemmas: [NFC(lemma)], gloss, lesson: 0, state, since: 0 });
const greekWord = (lemma: string, gloss: string): Word => ({ lemma: NFC(lemma), lang: 'grc', lemmas: [NFC(lemma)], gloss, lesson: 0, state: 'solid', since: 0 });

describe('the distractors of a Hebrew word', () => {
  it('are the Hebrew seed, every one a Hebrew lemma, and the Greek ones are the Greek seed', () => {
    const hebrew = seedDistractors('hbo');
    expect(hebrew.length).toBe(SEED_WORDS_HBO.length);
    expect(hebrew.every((d) => HEBREW.test(d.lemma))).toBe(true);
    const greek = seedDistractors();
    expect(greek.length).toBe(SEED_WORDS.length);
    expect(greek.some((d) => HEBREW.test(d.lemma))).toBe(false);
  });

  it('add his Hebrew words with a gloss and none of his Greek ones', () => {
    const words = [hebrewWord('חֶסֶד', 'steadfast love'), hebrewWord('צֶדֶק', ''), greekWord('λόγος', 'word'), hebrewWord('שָׁלוֹם', 'peace', 'dropped')];
    const pool = distractorsFor('hbo', words);
    expect(pool.map((d) => d.gloss)).toContain('steadfast love');
    expect(pool.map((d) => d.gloss)).not.toContain('a Greek word only');
    expect(pool.filter((d) => d.lemma === NFC('צֶדֶק'))).toEqual([]);
    expect(pool.every((d) => HEBREW.test(d.lemma))).toBe(true);
    // the Greek pool is the Greek seed alone, as it was
    expect(distractorsFor('grc', words)).toEqual(seedDistractors());
  });
});

describe('buildQuestion on a Hebrew word', () => {
  const word = hebrewWord('חֶסֶד', 'steadfast love');
  const pool = distractorsFor('hbo', [word]);
  const hebrewGlosses = new Set(pool.map((d) => d.gloss));
  const greekGlosses = SEED_WORDS.map((s) => s.gloss).filter((g) => !hebrewGlosses.has(g));

  it('asks the lemma in Hebrew, says it is Hebrew and gives four glosses of Hebrew words, the right one among them', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const q = buildQuestion(word, pool, null, mulberry32(seed));
      expect(q.lang).toBe('hbo');
      expect(q.prompt).toBe(NFC('חֶסֶד'));
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain('steadfast love');
      for (const option of q.options) expect(hebrewGlosses.has(option), option).toBe(true);
      for (const option of q.options) expect(greekGlosses).not.toContain(option);
    }
  });

  it('leaves a Greek question as it was: no language, Greek seed glosses', () => {
    const greek = greekWord('λόγος', 'word');
    const q = buildQuestion(greek, seedDistractors(), null, mulberry32(3));
    expect(q.lang).toBeUndefined();
    const seedGlosses = new Set(SEED_WORDS.map((s) => s.gloss).concat('word'));
    for (const option of q.options) expect(seedGlosses.has(option), option).toBe(true);
  });

  it('shows the form of the word only from a chapter in its own language', () => {
    const chapter = { book: 'Romans', code: 'rom', chapter: 8, lang: 'grc', lex: {}, parse: {}, verses: [{ n: 1, e: [], g: [{ t: 'חֶסֶד', tr: '', s: 'H2617', l: 'חֶסֶד', p: '' }] }] } as const;
    const q = buildQuestion(word, pool, chapter as never, mulberry32(1));
    expect(q.form).toBeUndefined();
  });
});
