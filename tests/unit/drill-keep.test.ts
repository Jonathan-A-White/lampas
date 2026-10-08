import { beforeEach, describe, expect, it } from 'vitest';
import { buildSteps } from '../../src/data/drill';
import { clearDrill, readDrill, saveDrill, type SavedDrill } from '../../src/data/drillKeep';
import { mulberry32 } from '../../src/data/quiz';

const question = (lemma: string) => ({
  lemma,
  form: lemma,
  reference: 'Romans 8:1',
  chapter: 8,
  verse: 1,
  words: ['a', lemma, 'b'],
  at: 1,
  code: 'N-NSM',
  parsing: 'noun, nominative singular masculine',
  steps: buildSteps('N-NSM', mulberry32(1)),
});
const drill: SavedDrill = {
  questions: [question('λόγος'), question('θεός')],
  question: 1,
  step: 1,
  picked: question('θεός').steps[1].right,
  missed: [0],
  asked: 4,
  right: 3,
  away: null,
};

beforeEach(() => localStorage.clear());

describe('a half-done Parsing drill', () => {
  it('is kept and read back whole', () => {
    saveDrill(drill);
    expect(readDrill()).toEqual(drill);
    saveDrill({ ...drill, away: 1234 });
    expect(readDrill()?.away).toBe(1234);
  });

  it('is gone once cleared', () => {
    saveDrill(drill);
    clearDrill();
    expect(readDrill()).toBeNull();
  });

  it('is ignored when what is stored is not a round', () => {
    const stored = (value: unknown) => localStorage.setItem('lampas.drill', JSON.stringify(value));
    localStorage.setItem('lampas.drill', '{nope');
    expect(readDrill()).toBeNull();
    stored({ ...drill, question: 5 });
    expect(readDrill()).toBeNull();
    stored({ ...drill, step: 9 });
    expect(readDrill()).toBeNull();
    stored({ ...drill, picked: 'zzz' });
    expect(readDrill()).toBeNull();
    stored({ ...drill, missed: [7] });
    expect(readDrill()).toBeNull();
    stored({ ...drill, right: 9 });
    expect(readDrill()).toBeNull();
    stored({ ...drill, questions: [] });
    expect(readDrill()).toBeNull();
  });
});
