import { describe, expect, it } from 'vitest';
import { approachOf } from '../../src/approaches';
import type { GrammarLevel } from '../../src/data/db';
import { groupWords, learnNext, nextWords, placedAt, wordStatesOf } from '../../src/data/grammar/goalProgress';
import { LETTER_IDS } from '../../src/data/grammar/inference';
import type { Level, PassageNeeds } from '../../src/data/grammar/needs';

const word = (lemma: string, count: number) => ({ lemma, gloss: lemma, count, firstRef: 'jn.1.1' });
const idea = (id: string) => ({ id, count: 1, example: { form: '', code: '', ref: 'jn.1.1' } });
const needs: PassageNeeds = { words: [word('ὅς', 4), word('ὁ', 4), word('ἐγώ', 2), word('λόγος', 1)], ideas: [idea('noun'), idea('article')], tokens: 11 };
const bma = approachOf('bma-tutor')!;

describe('wordStatesOf', () => {
  it('knows a word by its headword and by each lexicon lemma, the best state winning', () => {
    const states = wordStatesOf([
      { lemma: 'μου', lemmas: ['ἐγώ', 'ἐμοῦ', 'μου'], state: 'learning' },
      { lemma: 'ἐγώ', lemmas: ['ἐγώ'], state: 'solid' },
      { lemma: 'λόγος', lemmas: ['λόγος'], state: 'dropped' },
    ]);
    expect(states.get('ἐγώ')).toBe('solid');
    expect(states.get('ἐμοῦ')).toBe('learning');
    expect(states.get('λόγος')).toBe('dropped');
  });
});

describe('nextWords', () => {
  it('is the commonest needed words with no state, a dropped word being left alone', () => {
    const states = wordStatesOf([{ lemma: 'ὅς', lemmas: ['ὅς'], state: 'dropped' }]);
    expect(nextWords(needs, states).map((w) => w.lemma)).toEqual(['ὁ', 'ἐγώ', 'λόγος']);
    expect(nextWords(needs, states, 2).map((w) => w.lemma)).toEqual(['ὁ', 'ἐγώ']);
  });

  it('is empty when every word has a state', () => {
    const states = wordStatesOf(needs.words.map((w) => ({ lemma: w.lemma, lemmas: [], state: 'learning' as const })));
    expect(nextWords(needs, states)).toEqual([]);
  });
});

describe('groupWords', () => {
  it('cuts the needed words by level, in the order of the needs', () => {
    const groups = groupWords(needs, wordStatesOf([{ lemma: 'ὁ', lemmas: [], state: 'solid' }, { lemma: 'ἐγώ', lemmas: [], state: 'learning' }]));
    expect(groups.solid.map((w) => w.lemma)).toEqual(['ὁ']);
    expect(groups.frontier.map((w) => w.lemma)).toEqual(['ἐγώ']);
    expect(groups.notYet.map((w) => w.lemma)).toEqual(['ὅς', 'λόγος']);
  });
});

describe('learnNext', () => {
  it('is the earliest needed idea of the approach that is not yet or untested, with its lesson', () => {
    const next = learnNext(needs, bma, new Map<string, Level>([['noun', 'frontier']]));
    expect(next?.idea.id).toBe('article');
    expect(next?.lesson?.lesson.title).toBe('Your first words');
  });

  it('is undefined when every needed idea is frontier or solid', () => {
    expect(learnNext(needs, bma, new Map<string, Level>([['noun', 'frontier'], ['article', 'solid']]))).toBeUndefined();
  });
});

describe('placedAt', () => {
  const row = (id: string, how: GrammarLevel['how'], since: number): [string, GrammarLevel] => [id, { id, level: 'solid', since, how }];
  it('is the newest level the placement set, and nothing when it set none', () => {
    expect(placedAt(new Map([row('a', 'placement', 5), row('b', 'placement', 9), row('c', 'sheet', 20)]))).toBe(9);
    expect(placedAt(new Map([row('c', 'sheet', 20)]))).toBeUndefined();
  });
});

describe('learnNext names weak letters (mw-hqd5bz.17)', () => {
  const withAlphabet = { ...needs, ideas: [idea('alphabet'), idea('breathings'), idea('accents'), idea('noun')] };
  const letters = (...except: string[]) => new Map<string, Level>(LETTER_IDS.filter((id) => !except.includes(id)).map((id) => [id, 'solid']));

  it('names the alphabet while no letter is solid', () => {
    const next = learnNext(withAlphabet, bma, new Map())!;
    expect(next.idea.id).toBe('alphabet');
    expect(next.gaps).toBeUndefined();
  });

  it('names the letters that are not solid once some are, and opens the first of them', () => {
    const next = learnNext(withAlphabet, bma, letters('letter-xi', 'letter-psi'))!;
    expect(next.gaps?.map((l) => l.id)).toEqual(['letter-xi', 'letter-psi']);
    expect(next.idea.id).toBe('letter-xi');
    expect(next.lesson?.lesson.title).toBe('The Greek letters');
  });

  it('goes on to the next idea when all 24 letters are solid, whatever the alphabet row says', () => {
    expect(learnNext(withAlphabet, bma, letters())!.idea.id).toBe('breathings');
  });

  it('leaves a frontier alphabet alone', () => {
    expect(learnNext(withAlphabet, bma, new Map<string, Level>([['alphabet', 'frontier']]))!.idea.id).toBe('breathings');
  });
});
