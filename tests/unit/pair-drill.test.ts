// 'Which did you hear?' (mw-5r3p30.362): the pure drill of src/hardSounds/pairDrill.ts (ten rounds drawn from a lesson's pairs, the score, the misses to replay) and
// the runs kept on the device by src/data/repositories/pairDrills.ts, like Drill it's.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/random';
import { getPairRuns, savePairRun } from '../../src/data/repositories';
import { answerRound, drawRounds, missesOf, resultOf, ROUNDS, type PairAnswer } from '../../src/hardSounds/pairDrill';

const PAIRS: [string, string][] = [
  ['μέρος', 'μέλος'],
  ['ὄρος', 'ὅλος'],
];

afterAll(() => db.close());

describe('drawing the rounds', () => {
  it('draws ten rounds from the pairs, each saying one word of its pair', () => {
    const rounds = drawRounds(PAIRS, mulberry32(1));
    expect(rounds).toHaveLength(ROUNDS);
    expect(ROUNDS).toBe(10);
    for (const r of rounds) {
      expect(PAIRS.some(([a, b]) => (r.said === a && r.other === b) || (r.said === b && r.other === a))).toBe(true);
      expect([...r.choices].sort()).toEqual([r.said, r.other].sort());
    }
  });

  it('is in random order: other seeds draw other orders, and the two words of a pair take both sides', () => {
    const seen = new Set(Array.from({ length: 12 }, (_, seed) => drawRounds(PAIRS, mulberry32(seed)).map((r) => r.said).join('|')));
    expect(seen.size).toBeGreaterThan(6);
    const rounds = Array.from({ length: 12 }, (_, seed) => drawRounds(PAIRS, mulberry32(seed))).flat();
    for (const word of PAIRS.flat()) expect(rounds.some((r) => r.said === word)).toBe(true);
    expect(rounds.some((r) => r.choices[0] === r.said)).toBe(true);
    expect(rounds.some((r) => r.choices[1] === r.said)).toBe(true);
  });

  it('never says the same word twice running while there is another to say', () => {
    for (let seed = 0; seed < 30; seed++) {
      const said = drawRounds(PAIRS, mulberry32(seed)).map((r) => r.said);
      said.slice(1).forEach((word, i) => expect(word, `seed ${seed}`).not.toBe(said[i]));
    }
  });

  it('draws ten rounds even from a lesson with one pair', () => {
    const rounds = drawRounds([PAIRS[0]], mulberry32(3));
    expect(rounds).toHaveLength(ROUNDS);
    expect(new Set(rounds.map((r) => r.said))).toEqual(new Set(PAIRS[0]));
  });

  it('draws nothing from a lesson with no pairs', () => {
    expect(drawRounds([], mulberry32(1))).toEqual([]);
  });
});

describe('answering and scoring', () => {
  const rounds = drawRounds(PAIRS, mulberry32(7));

  it('marks a choice right when it is the word said', () => {
    expect(answerRound(rounds[0], rounds[0].said).right).toBe(true);
    expect(answerRound(rounds[0], rounds[0].other).right).toBe(false);
  });

  it('scores the rights and lists each missed pair once, with the word he chose', () => {
    // he misses the first two rounds and gets the rest right
    const answers: PairAnswer[] = rounds.map((r, i) => answerRound(r, i < 2 ? r.other : r.said));
    const result = resultOf('tapped-r', answers, 1234);
    expect(result).toMatchObject({ lessonId: 'tapped-r', at: 1234, total: 10, score: 8 });
    const misses = missesOf(answers);
    const pairKeys = new Set(misses.map((m) => [m.said, m.other].sort().join('|')));
    expect(misses).toHaveLength(pairKeys.size);
    expect(misses.length).toBeGreaterThan(0);
    expect(misses.length).toBeLessThanOrEqual(2);
    expect(misses[0]).toMatchObject({ said: rounds[0].said, other: rounds[0].other, chose: rounds[0].other });
  });

  it('has no misses when every answer is right', () => {
    expect(missesOf(rounds.map((r) => answerRound(r, r.said)))).toEqual([]);
  });
});

describe('the runs kept on the device', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });

  it('keeps every run, newest last, and reads a lesson its own', async () => {
    const rounds = drawRounds(PAIRS, mulberry32(2));
    await savePairRun(resultOf('tapped-r', rounds.map((r) => answerRound(r, r.said)), 100));
    await savePairRun(resultOf('tapped-r', rounds.map((r, i) => answerRound(r, i === 0 ? r.other : r.said)), 200));
    await savePairRun(resultOf('other', rounds.map((r) => answerRound(r, r.said)), 300));
    const mine = await getPairRuns('tapped-r');
    expect(mine.map((r) => [r.at, r.score])).toEqual([
      [100, 10],
      [200, 9],
    ]);
    expect(mine[1].answers.filter((a) => !a.right)).toHaveLength(1);
    expect(await getPairRuns()).toHaveLength(3);
  });

  it('reads no runs from a damaged text', async () => {
    await db.settings.put({ key: 'hardSoundsPairRuns', value: '{not json' });
    expect(await getPairRuns('tapped-r')).toEqual([]);
  });
});
