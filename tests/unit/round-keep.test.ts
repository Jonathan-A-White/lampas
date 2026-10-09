import { beforeEach, describe, expect, it } from 'vitest';
import { clearRound, readRound, saveRound, type SavedRound } from '../../src/data/roundKeep';

const question = (lemma: string) => ({ lemma, prompt: lemma, gloss: 'g', options: ['g', 'a', 'b', 'c'] });
const round: SavedRound = { questions: [question('λόγος'), question('θεός')], index: 1, picked: 'a', missed: [question('λόγος')] };

beforeEach(() => localStorage.clear());

describe('a half-done Quick test round', () => {
  it('is kept and read back whole', () => {
    saveRound(round);
    expect(readRound()).toEqual(round);
  });

  it('turns a round kept with a chapter form as its prompt into the lemma with the form beside it', () => {
    const old = { lemma: 'ἀγαπάω', prompt: 'ἀγαπῶσιν', reference: 'Romans 8:28', gloss: 'g', options: ['g', 'a', 'b', 'c'] };
    localStorage.setItem('lampas.round', JSON.stringify({ questions: [old], index: 0, picked: null, missed: [old] }));
    const read = readRound();
    expect(read?.questions[0]).toMatchObject({ prompt: 'ἀγαπάω', form: 'ἀγαπῶσιν', reference: 'Romans 8:28' });
    expect(read?.missed[0]).toMatchObject({ prompt: 'ἀγαπάω', form: 'ἀγαπῶσιν' });
  });

  it('is gone once cleared', () => {
    saveRound(round);
    clearRound();
    expect(readRound()).toBeNull();
  });

  it('is ignored when what is stored is not a round', () => {
    localStorage.setItem('lampas.round', '{nope');
    expect(readRound()).toBeNull();
    localStorage.setItem('lampas.round', JSON.stringify({ ...round, index: 5 }));
    expect(readRound()).toBeNull();
    localStorage.setItem('lampas.round', JSON.stringify({ ...round, picked: 'zzz' }));
    expect(readRound()).toBeNull();
  });
});
