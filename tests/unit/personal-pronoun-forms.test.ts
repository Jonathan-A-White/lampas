// tests/unit/personal-pronoun-forms.test.ts — a singular personal pronoun and its plural are two of his words that share one lexicon lemma (σύ / ὑμεῖς, ἐγώ / ἡμεῖς):
// a form of one is never an example of the other (mw-indx1x6.72). The sweep runs formsOf over every seed word that shares a lexicon lemma with another.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { Word } from '../../src/data/db';
import { normaliseLemma } from '../../src/data/lemma';
import { formsOf, othersOf } from '../../src/data/quiz';
import { SEED_WORDS } from '../../src/data/seed-words';

const romans8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const nfc = (s: string) => s.normalize('NFC');

const words: Word[] = SEED_WORDS.map((s) => {
  const { headword, lemmas } = normaliseLemma(s.lemma);
  return { lemma: headword, lang: 'grc', lemmas, gloss: s.gloss, lesson: s.lesson, state: 'learning', since: 0 };
});
const pool = words.map((w) => ({ lemma: w.lemma, gloss: w.gloss, pos: '' }));
const word = (lemma: string): Word => words.find((w) => w.lemma === lemma)!;

/** The surface forms of the words of the chapter that the lexicon lemma `lexicon` names, by the parse's number. */
const formsByNumber = (lexicon: string, number: 'S' | 'P'): Set<string> =>
  new Set(romans8.verses.flatMap((v) => v.g).filter((g) => nfc(g.l) === lexicon && g.p.endsWith(number)).map((g) => nfc(g.t)));

describe('a singular pronoun and its plural share a lexicon lemma', () => {
  it.each([
    ['σύ', 'ὑμεῖς', ['σου', 'σοι', 'σε', 'σύ']],
    ['ἐγώ', 'ἡμεῖς', ['μου', 'μοι', 'με', 'ἐγώ', 'ἐμοῦ', 'ἐμοί', 'ἐμέ']],
  ])('%s: its forms in Romans 8 are none of the plural %s', (singular, plural, own) => {
    const forms = formsOf(romans8, word(singular), othersOf(word(singular), pool));
    expect(forms.length).toBeGreaterThan(0);
    const plurals = formsByNumber(singular, 'P');
    expect(plurals.size).toBeGreaterThan(0);
    for (const f of forms) {
      expect(plurals.has(nfc(f.form)), `${singular} was given ${f.form} (${f.reference}), a form of ${plural}`).toBe(false);
      expect(own.map(nfc), `${f.form} is a singular form of ${singular}`).toContain(nfc(f.form).toLowerCase());
    }
  });

  it('σύ names Romans 8:36 σου', () => {
    expect(formsOf(romans8, word('σύ'), othersOf(word('σύ'), pool)).map((o) => `${o.reference} ${o.form}`)).toEqual(['Romans 8:36 σου']);
  });

  it('with no plural among his words the plural forms still count for the singular', () => {
    const alone = new Set<string>();
    expect(formsOf(romans8, word('σύ'), alone).some((o) => o.form === 'ὑμῖν')).toBe(true);
  });

  it('sweep: of his seed words that share a lexicon lemma, no word has a form that is another of them', () => {
    const byLexicon = new Map<string, Word[]>();
    for (const w of words) for (const l of w.lemmas) byLexicon.set(nfc(l), [...(byLexicon.get(nfc(l)) ?? []), w]);
    const forms = new Map<string, Set<string>>();
    for (const w of words) forms.set(w.lemma, new Set(formsOf(romans8, w, othersOf(w, pool)).map((o) => nfc(o.form))));
    // the plural words own the plural forms of the lexicon lemma their singular is found by
    const plural: Record<string, string[]> = { σύ: ['ὑμεῖς'], ἐγώ: ['ἡμεῖς'] };
    for (const [singular, plurals] of Object.entries(plural)) {
      const own = formsByNumber(singular, 'P');
      for (const p of plurals) {
        expect(word(p), `${p} is one of his words`).toBeDefined();
        for (const f of forms.get(singular) ?? []) expect(own.has(f), `${singular}'s example ${f} is a form of ${p}`).toBe(false);
        for (const f of forms.get(p) ?? []) expect(formsByNumber(singular, 'S').has(f), `${p}'s example ${f} is a form of ${singular}`).toBe(false);
      }
    }
    expect(byLexicon.size).toBeGreaterThan(0);
  });
});
