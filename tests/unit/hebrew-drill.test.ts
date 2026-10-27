// The Parsing drill's steps on a Hebrew word (src/data/hebrewDrill.ts, mw-gdcyf98.19): the parsing in plain words cut into terms, each a step of four different choices with the right one
// among them, near misses first.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { drawDrill } from '../../src/data/drill';
import type { Word } from '../../src/data/db';
import { hebrewSteps, termsOf } from '../../src/data/hebrewDrill';
import { mulberry32 } from '../../src/data/random';

const genesis1 = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;

describe('termsOf', () => {
  it("takes the segment of the word's own part of speech", () => {
    expect(termsOf('Conjunctive waw | Verb - Hifil - Consecutive imperfect - third person feminine singular')).toEqual(['Verb', 'Hifil', 'Consecutive imperfect', 'third person feminine singular']);
    expect(termsOf('Preposition-b | Noun - feminine singular')).toEqual(['Noun', 'feminine singular']);
    expect(termsOf('Conjunctive waw | Interjection')).toEqual(['Interjection']);
    expect(termsOf('')).toEqual([]);
  });
});

describe('hebrewSteps', () => {
  it('asks a verb its part of speech, stem, form and person, gender and number', () => {
    const steps = hebrewSteps('Verb - Qal - Perfect - third person masculine singular', mulberry32(1));
    expect(steps.map((s) => [s.id, s.right])).toEqual([
      ['pos', 'verb'],
      ['stem', 'Qal'],
      ['form', 'Perfect'],
      ['person+gender+number', 'third person masculine singular'],
    ]);
  });

  it('asks a noun its part of speech, then its gender and number', () => {
    const steps = hebrewSteps('Article | Noun - masculine plural', mulberry32(2));
    expect(steps.map((s) => [s.id, s.right])).toEqual([['pos', 'noun'], ['gender+number', 'masculine plural']]);
  });

  it('asks a word that is only its part of speech that one thing', () => {
    expect(hebrewSteps('Preposition-l', mulberry32(3)).map((s) => s.right)).toEqual(['preposition']);
  });

  it('gives every step four different choices with the right one among them, for any seed', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const parsing of ['Verb - Piel - Consecutive imperfect - third person feminine singular', 'Adjective - feminine singular', 'Verb - Qal - Participle - masculine plural', 'Pronoun - third person masculine singular']) {
        for (const step of hebrewSteps(parsing, mulberry32(seed))) {
          expect(step.options, `${parsing} ${step.id}`).toHaveLength(4);
          expect(new Set(step.options).size).toBe(4);
          expect(step.options).toContain(step.right);
        }
      }
    }
  });

  it('puts a one-feature change among the wrong choices of a person, gender and number', () => {
    const [, , , pgn] = hebrewSteps('Verb - Qal - Perfect - third person masculine singular', mulberry32(5));
    expect(pgn.near).toEqual(expect.arrayContaining(['third person masculine plural']));
  });
});

describe('drawDrill on a Hebrew chapter', () => {
  const word = (lemma: string, lang: Word['lang'], state: Word['state'] = 'learning'): Word => ({ lemma, lang, lemmas: [lemma], gloss: 'x', lesson: 0, state, since: 0 });

  it('drills his Hebrew words in the verse, in Hebrew, and never a Greek word', () => {
    const round = drawDrill(genesis1, [word('בָּרָא', 'hbo'), word('λόγος', 'grc')], mulberry32(1));
    expect(round.length).toBeGreaterThan(0);
    for (const q of round) {
      expect(q.lang).toBe('hbo');
      expect(q.lemma).toBe('בָּרָא');
      expect(q.steps[0].id).toBe('pos');
      expect(q.steps.length).toBeGreaterThan(1);
      expect(q.words[q.at]).toBe(q.form);
    }
  });

  it('asks nothing of a Hebrew chapter when he has no Hebrew word', () => {
    expect(drawDrill(genesis1, [word('λόγος', 'grc')], mulberry32(1))).toEqual([]);
  });
});
