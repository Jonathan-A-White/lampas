// tests/unit/drill-pronoun-places.test.ts — the Parsing drill and the plural personal pronouns (mw-indx1x6.83): the data lists ὑμῖν, ἡμῶν under the lexicon lemma σύ, ἐγώ, so a drill that
// claimed places by lexicon lemma gave σύ and ἐγώ a plural form, while ὑμεῖς and ἡμεῖς, whose lemma is no lexicon lemma, had no place at all. A place is the word's by the same rule as the Quick test's.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { Word } from '../../src/data/db';
import { candidatesOf, drawDrill, type DrillTuning } from '../../src/data/drill';
import { lemmaKeyOf, normaliseLemma } from '../../src/data/lemma';
import { SEED_WORDS } from '../../src/data/seed-words';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const nfc = (s: string) => s.normalize('NFC');

const seed = (lemma: string): Word => {
  const s = SEED_WORDS.find((w) => nfc(normaliseLemma(w.lemma).headword) === lemma)!;
  const { headword, lemmas } = normaliseLemma(s.lemma);
  return { lemma: headword, lang: 'grc', lemmas, gloss: s.gloss, lesson: s.lesson, state: 'solid', since: 0 };
};

const at = (c: { verse: number; at: number }) => rom8.verses.find((v) => v.n === c.verse)!.g[c.at];

describe('candidatesOf in Romans 8 for σύ, ὑμεῖς, ἐγώ and ἡμεῖς', () => {
  const words = ['σύ', 'ὑμεῖς', 'ἐγώ', 'ἡμεῖς'].map(seed);
  const found = candidatesOf(rom8, words);
  const placesOf = (lemma: string) => found.filter((c) => c.word.lemma === lemma).map((c) => at(c));

  it('σύ and ἐγώ are given no plural form', () => {
    for (const lemma of ['σύ', 'ἐγώ']) for (const g of placesOf(lemma)) expect(g.p, `${g.t} is a plural, a place of the plural word`).not.toMatch(/^P-[12][NGDA]P$/);
  });

  it('ὑμεῖς and ἡμεῖς hold their own plural forms, ὑμῖν among them', () => {
    expect(placesOf('ὑμεῖς').length).toBeGreaterThan(0);
    for (const g of placesOf('ὑμεῖς')) expect(g.p).toMatch(/^P-2[NGDA]P$/);
    expect(placesOf('ἡμεῖς').length).toBeGreaterThan(0);
    for (const g of placesOf('ἡμεῖς')) expect(g.p).toMatch(/^P-1[NGDA]P$/);
    expect(rom8.verses.some((v) => v.g.some((g) => lemmaKeyOf(g.l) === 'σύ' && /^P-2[NGDA]P$/.test(g.p ?? '')))).toBe(true);
  });
});

describe('drawDrill with Words: Solid while the plural pronouns are only learning (mw-indx1x6.115)', () => {
  const words: Word[] = [
    { ...seed('σύ'), state: 'solid' },
    { ...seed('ἐγώ'), state: 'solid' },
    { ...seed('ὑμεῖς'), state: 'learning' },
    { ...seed('ἡμεῖς'), state: 'learning' },
  ];
  const tuning: DrillTuning = { extent: 'any', words: 'solid', levels: new Map() };

  it('draws no plural place for σύ or ἐγώ', () => {
    for (let i = 1; i <= 30; i++) {
      const round = drawDrill(rom8, words, () => (i * 0.037) % 1, 50, tuning);
      for (const q of round) expect(q.code, `${q.form} drilled as ${q.lemma}`).not.toMatch(/^P-[12][NGDA]P$/);
    }
  });
});
