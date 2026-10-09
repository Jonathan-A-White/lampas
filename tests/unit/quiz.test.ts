// The pure parts of the Quick test: the state rule, the drawing of a round and the option builder.
import { describe, expect, it } from 'vitest';
import {
  ROUND_SIZE,
  buildOptions,
  buildQuestion,
  drawWords,
  formsOf,
  mulberry32,
  nextState,
  type Distractor,
} from '../../src/data/quiz';
import type { Chapter } from '../../src/data/chapter';
import type { Word, WordState } from '../../src/data/db';

const word = (lemma: string, state: WordState, gloss = `gloss of ${lemma}`): Word => ({
  lemma,
  lemmas: [lemma],
  gloss,
  lesson: 1,
  state,
  since: 0,
});

const many = (n: number, state: WordState, prefix: string) => Array.from({ length: n }, (_, i) => word(`${prefix}${i}`, state));

describe('nextState: the rule for a word after an answer', () => {
  it('moves a solid word to learning after two misses in a row', () => {
    expect(nextState('solid', [false])).toBe('solid');
    expect(nextState('solid', [false, false])).toBe('learning');
    expect(nextState('solid', [true, false, false])).toBe('learning');
  });

  it('keeps a solid word solid when a right answer is in between', () => {
    expect(nextState('solid', [false, true, false])).toBe('solid');
    expect(nextState('solid', [false, false, true])).toBe('solid');
  });

  it('moves a learning word to solid after two rights in a row', () => {
    expect(nextState('learning', [true])).toBe('learning');
    expect(nextState('learning', [true, true])).toBe('solid');
    expect(nextState('learning', [false, true, true])).toBe('solid');
  });

  it('keeps a learning word learning when a miss is in between, and misses never demote it further', () => {
    expect(nextState('learning', [true, false, true])).toBe('learning');
    expect(nextState('learning', [false, false, false])).toBe('learning');
  });

  it('never moves a dropped word', () => {
    expect(nextState('dropped', [true, true])).toBe('dropped');
    expect(nextState('dropped', [false, false])).toBe('dropped');
  });
});

describe('drawWords: ten different words, biased to the learning ones', () => {
  const pool = [...many(54, 'solid', 's'), ...many(9, 'learning', 'l'), word('d', 'dropped')];

  it('draws ten words without repeats and never a dropped one', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const round = drawWords(pool, mulberry32(seed));
      expect(round).toHaveLength(ROUND_SIZE);
      expect(new Set(round.map((w) => w.lemma)).size).toBe(ROUND_SIZE);
      expect(round.some((w) => w.state === 'dropped')).toBe(false);
    }
  });

  it('includes at least 3 learning words whenever that many exist', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const learning = drawWords(pool, mulberry32(seed)).filter((w) => w.state === 'learning');
      expect(learning.length).toBeGreaterThanOrEqual(3);
    }
    const two = [...many(2, 'learning', 'l'), ...many(20, 'solid', 's')];
    expect(drawWords(two, mulberry32(3)).filter((w) => w.state === 'learning')).toHaveLength(2);
  });

  it('fills with learning words when the solid ones run short, and asks fewer when the list is short', () => {
    const mostlyLearning = [...many(2, 'solid', 's'), ...many(20, 'learning', 'l')];
    const round = drawWords(mostlyLearning, mulberry32(5));
    expect(round).toHaveLength(ROUND_SIZE);
    expect(round.filter((w) => w.state === 'solid')).toHaveLength(2);
    expect(drawWords(many(4, 'solid', 's'), mulberry32(5))).toHaveLength(4);
    expect(drawWords([], mulberry32(5))).toEqual([]);
  });

  it('gives the same round for the same random source', () => {
    const lemmas = (seed: number) => drawWords(pool, mulberry32(seed)).map((w) => w.lemma);
    expect(lemmas(9)).toEqual(lemmas(9));
    expect(lemmas(9)).not.toEqual(lemmas(10));
  });
});

describe('buildOptions: four different glosses, one of them right', () => {
  const candidates: Distractor[] = [
    { lemma: 'a', gloss: 'to love', pos: 'Verb' },
    { lemma: 'b', gloss: 'to write', pos: 'Verb' },
    { lemma: 'c', gloss: 'to hear', pos: 'Verb' },
    { lemma: 'd', gloss: 'to see', pos: 'Verb' },
    { lemma: 'e', gloss: 'brother', pos: 'Noun' },
    { lemma: 'f', gloss: 'teacher', pos: 'Noun' },
    { lemma: 'g', gloss: 'bread', pos: 'Noun' },
    { lemma: 'h', gloss: 'to love', pos: 'Verb' },
  ];

  it('holds four distinct glosses and exactly one is the right one', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const options = buildOptions('to hear', 'Verb', 'c', candidates, mulberry32(seed));
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options.filter((o) => o === 'to hear')).toHaveLength(1);
    }
  });

  it('takes the other glosses from words of the same part of speech where it can', () => {
    const options = buildOptions('to hear', 'Verb', 'c', candidates, mulberry32(4));
    expect(options.sort()).toEqual(['to hear', 'to love', 'to see', 'to write']);
  });

  it('falls back on other parts of speech when there are too few of the same one', () => {
    const options = buildOptions('brother', 'Noun', 'e', candidates, mulberry32(4));
    expect(options).toHaveLength(4);
    expect(options).toContain('brother');
    expect(options).toContain('teacher');
    expect(options).toContain('bread');
  });

  it('does not offer the word its own gloss twice, and still works for a word that is not in the seed', () => {
    const options = buildOptions('to love', undefined, 'zzz', candidates, mulberry32(2));
    expect(options.filter((o) => o === 'to love')).toHaveLength(1);
    expect(new Set(options).size).toBe(options.length);
    expect(options).toHaveLength(4);
  });
});

describe('formsOf and buildQuestion: the form from Romans 8', () => {
  const chapter = {
    book: 'Romans',
    code: 'rom',
    chapter: 8,
    lex: {},
    parse: {},
    verses: [
      { n: 1, g: [{ t: 'ἀγαπῶσιν', tr: '', s: 'G25', l: 'ἀγαπάω', p: '' }, { t: 'τῷ', tr: '', s: 'G3588', l: 'ὁ', p: '' }], e: [] },
      { n: 2, g: [{ t: 'ἠγάπησεν', tr: '', s: 'G25', l: 'ἀγαπάω', p: '' }], e: [] },
    ],
  } satisfies Chapter;

  it('finds each occurrence of a word with its verse reference', () => {
    const forms = formsOf(chapter, { ...word('ἀγαπάω', 'learning'), lemmas: ['ἀγαπάω'] });
    expect(forms).toEqual([
      { form: 'ἀγαπῶσιν', reference: 'Romans 8:1', book: 'rom', chapter: 8, verse: 1 },
      { form: 'ἠγάπησεν', reference: 'Romans 8:2', book: 'rom', chapter: 8, verse: 2 },
    ]);
    expect(formsOf(chapter, word('δόξα', 'solid'))).toEqual([]);
  });

  it("leaves out a lemma another of his words owns, and a form that is another of his words", () => {
    const both = { ...word('μου', 'solid'), lemmas: ['ἐγώ', 'μου'] };
    const forms = {
      ...chapter,
      verses: [{ n: 1, g: [{ t: 'ἡμεῖς', tr: '', s: 'G1473', l: 'ἐγώ', p: '' }, { t: 'με', tr: '', s: 'G1473', l: 'ἐγώ', p: '' }, { t: 'μου', tr: '', s: 'G3450', l: 'μου', p: '' }], e: [] }],
    };
    expect(formsOf(forms, both).map((f) => f.form)).toEqual(['ἡμεῖς', 'με', 'μου']);
    expect(formsOf(forms, both, new Set(['ἐγώ', 'ἡμεῖς'])).map((f) => f.form)).toEqual(['μου']);
    expect(formsOf(forms, { ...word('ἐγώ', 'solid') }, new Set(['ἡμεῖς'])).map((f) => f.form)).toEqual(['με']);
  });

  it('always asks the lemma; the chapter form and reference ride along for after the answer', () => {
    const pool: Distractor[] = [
      { lemma: 'x', gloss: 'one', pos: 'Verb' },
      { lemma: 'y', gloss: 'two', pos: 'Verb' },
      { lemma: 'z', gloss: 'three', pos: 'Verb' },
    ];
    const plain = buildQuestion(word('δόξα', 'solid', 'glory'), pool, chapter, mulberry32(1));
    expect(plain).toMatchObject({ lemma: 'δόξα', prompt: 'δόξα', form: undefined, reference: undefined, gloss: 'glory' });
    const inChapter = buildQuestion({ ...word('ἀγαπάω', 'learning', 'to love'), lemmas: ['ἀγαπάω'] }, pool, chapter, mulberry32(1));
    expect(inChapter.lemma).toBe('ἀγαπάω');
    expect(inChapter.prompt).toBe('ἀγαπάω');
    expect(['ἀγαπῶσιν', 'ἠγάπησεν']).toContain(inChapter.form);
    expect(buildQuestion({ ...word('ἀγαπάω', 'learning', 'to love'), lemmas: ['ἀγαπάω'] }, pool, null, mulberry32(1)).prompt).toBe('ἀγαπάω');
    expect(inChapter.reference).toMatch(/^Romans 8:[12]$/);
    expect(inChapter.options).toHaveLength(4);
    expect(inChapter.options).toContain('to love');
  });
});
