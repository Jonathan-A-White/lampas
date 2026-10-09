import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { LETTER_IDS } from '../../src/data/grammar/inference';
import { clearBus, latest } from '../../src/events/bus';
import { getEvidence, noteAnswer, noteWordRead } from '../../src/data/repositories/inference';
import { getLevel, recordGrammarAnswer, setLevel, teachIdea } from '../../src/data/repositories/grammarLevels';
import { recordAnswer } from '../../src/data/repositories/results';
import { DAY, STEP_DAYS } from '../../src/data/schedule';

const NOW = Date.UTC(2026, 9, 9, 9, 0, 0);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.reviews.clear(), db.settings.clear(), db.words.clear(), db.results.clear()]);
});
afterEach(clearBus);
afterAll(() => db.close());

const read = async (word: string, n: number) => {
  for (let i = 0; i < n; i += 1) await noteWordRead(word, NOW);
};

describe('the evidence kept', () => {
  it('counts right uses, and a level appears at the third, how inferred, on the schedule at the 30-day step', async () => {
    await read('ξένος', 2);
    expect(await getLevel('letter-xi')).toBeUndefined();
    expect((await getEvidence()).get('letter-xi')).toEqual({ run: 2, misses: 0 });
    await read('ξένος', 1);
    expect(await getLevel('letter-xi')).toMatchObject({ level: 'solid', how: 'inferred' });
    expect(await db.reviews.get(['grammar', 'letter-xi'])).toMatchObject({ step: STEP_DAYS.indexOf(30), due: NOW + 30 * DAY });
    expect(latest('grammar-level-changed')).toMatchObject({ level: 'solid' });
  });

  it('lifts an idea a placement left not yet', async () => {
    await setLevel('accents', 'notYet', 'placement', NOW);
    await read('λόγος', 3);
    expect(await getLevel('accents')).toMatchObject({ level: 'solid', how: 'inferred' });
  });

  it('keeps nothing but the evidence for a form with no idea of the foundation in it', async () => {
    await noteWordRead('123', NOW);
    expect(await db.grammarLevels.count()).toBe(0);
  });

  it('counts a miss on a letter question against the letter, and drops an inferred letter to the frontier', async () => {
    await read('ξένος', 3);
    await noteAnswer({ kind: 'sound', ideaId: 'alphabet', form: undefined, right: 'ξ' }, false, NOW);
    expect((await getEvidence()).get('letter-xi')).toEqual({ run: 0, misses: 1 });
    expect(await getLevel('letter-xi')).toMatchObject({ level: 'frontier', how: 'inferred' });
    await read('ξένος', 3);
    expect(await getLevel('letter-xi')).toMatchObject({ level: 'solid', how: 'inferred' });
  });

  it('leaves a letter he set himself alone when it is counted against', async () => {
    await setLevel('letter-xi', 'solid', 'sheet', NOW);
    await noteAnswer({ kind: 'letter', ideaId: 'letter-xi', form: undefined, right: 'ξ' }, false, NOW);
    expect(await getLevel('letter-xi')).toMatchObject({ level: 'solid', how: 'sheet' });
  });

  it('credits a form read right in a grammar question, and says nothing of the letters on a miss about a form', async () => {
    const ending = { kind: 'ending', ideaId: 'case-genitive', form: 'ἀρχ_', right: 'ῆς' } as const;
    await noteAnswer(ending, true, NOW);
    expect((await getEvidence()).get('letter-rho')).toEqual({ run: 1, misses: 0 });
    await noteAnswer(ending, false, NOW);
    expect((await getEvidence()).get('letter-rho')).toEqual({ run: 1, misses: 0 });
  });

  it('is credited by a Quick test word read right, not by one read wrong', async () => {
    await db.words.put({ lemma: 'ξένος', lemmas: ['ξένος'], gloss: 'stranger', lesson: 0, state: 'learning', since: NOW });
    await recordAnswer('ξένος', false, NOW);
    expect((await getEvidence()).get('letter-xi')).toBeUndefined();
    await recordAnswer('ξένος', true, NOW);
    expect((await getEvidence()).get('letter-xi')).toEqual({ run: 1, misses: 0 });
  });
});

describe('the alphabet', () => {
  const allBut = async (...ids: string[]) => {
    for (const id of LETTER_IDS.filter((l) => !ids.includes(l))) await setLevel(id, 'solid', 'marked', NOW);
  };

  it('is solid, how inferred, when the 24th letter is, whichever way it got there', async () => {
    await allBut('letter-xi');
    expect(await getLevel('alphabet')).toBeUndefined();
    await recordGrammarAnswer('letter-xi', true, NOW);
    expect(await getLevel('alphabet')).toBeUndefined();
    await teachIdea('letter-xi', 'known', NOW);
    expect(await getLevel('alphabet')).toMatchObject({ level: 'solid', how: 'inferred' });
    expect(latest('grammar-level-changed')).toMatchObject({ id: 'alphabet', level: 'solid' });
  });

  it('follows the last letter by inference', async () => {
    await allBut('letter-xi');
    await read('ξένος', 3);
    expect(await getLevel('alphabet')).toMatchObject({ level: 'solid', how: 'inferred' });
  });

  it('falls back to the frontier when a letter it rested on is missed', async () => {
    await allBut('letter-xi');
    await read('ξένος', 3);
    await recordGrammarAnswer('letter-xi', false, NOW);
    expect(await getLevel('letter-xi')).toMatchObject({ level: 'frontier' });
    expect(await getLevel('alphabet')).toMatchObject({ level: 'frontier', how: 'inferred' });
  });

  it('is not lowered when he set it solid himself', async () => {
    await setLevel('alphabet', 'solid', 'sheet', NOW);
    await allBut('letter-xi');
    await setLevel('letter-xi', 'frontier', 'review', NOW);
    expect(await getLevel('alphabet')).toMatchObject({ level: 'solid', how: 'sheet' });
  });
});
