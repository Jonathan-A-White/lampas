// The letter drill (mw-86e9r1.11): Got it on The Greek alphabet drills all 24 letters, small and capital, heard and named, in rounds of 8. Pure half: src/data/grammar/letterDrill.ts.
// Credit: a right answer about a letter credits that letter (inference.ts); a drill sitting never makes it solid (that is the spaced reviews', SOLID_STEP).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { INFERRED_RIGHTS, inferFromAnswer, inferFromDrill, type Evidence } from '../../src/data/grammar/inference';
import { LADDER, itemsOf } from '../../src/data/grammar/ladder';
import { ROUND_SIZE, TARGETS, answerTarget, drawRound, isComplete, remainingTargets, startLetterDrill } from '../../src/data/grammar/letterDrill';
import { buildLetter, buildSound } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { getLevel, levelFromStep, SOLID_STEP } from '../../src/data/repositories/grammarLevels';
import { getEvidence, noteAnswer, noteDrillAnswer } from '../../src/data/repositories/inference';

const none = new Map<string, Evidence>();
const alphabet = LADDER.find((i) => i.id === 'alphabet')!;
const LETTERS = itemsOf('alphabet');

describe('a right answer about a letter credits the letter', () => {
  it('credits the letter of the glyph, small or capital, when the alphabet was asked', () => {
    for (const kind of ['letter', 'sound'] as const) {
      const small = inferFromAnswer(none, { kind, ideaId: 'alphabet', form: undefined, right: 'ψ' }, true);
      expect(small.credited).toEqual(['letter-psi']);
      expect(small.evidence.get('letter-psi')).toEqual({ run: 1, misses: 0 });
      const capital = inferFromAnswer(small.evidence, { kind, ideaId: 'alphabet', form: undefined, right: 'Ψ' }, true);
      expect(capital.evidence.get('letter-psi')).toEqual({ run: 2, misses: 0 });
    }
  });

  it("credits a letter idea's own letter", () => {
    expect(inferFromAnswer(none, { kind: 'letter', ideaId: 'letter-xi', form: undefined, right: 'Ξ' }, true).credited).toEqual(['letter-xi']);
  });

  it('credits nothing for a right answer about a mark that is no letter', () => {
    expect(inferFromAnswer(none, { kind: 'letter', ideaId: 'punctuation', form: undefined, right: ';' }, true).credited).toEqual([]);
    expect(inferFromAnswer(none, { kind: 'sound', ideaId: 'diphthongs', form: undefined, right: 'αι' }, true).credited).toEqual([]);
  });
});

describe('Review asks the capital as well as the small', () => {
  const rights = (build: typeof buildLetter | typeof buildSound) => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed += 1) {
      const q = build(alphabet, mulberry32(seed));
      expect(q.options).toContain(q.right);
      seen.add(q.right === q.right.toLowerCase() ? 'small' : 'capital');
    }
    return seen;
  };

  it('asks both forms of a letter by name and by ear', () => {
    expect([...rights(buildLetter)].sort()).toEqual(['capital', 'small']);
    expect([...rights(buildSound)].sort()).toEqual(['capital', 'small']);
  });

  it('offers four glyphs of the form it asks, never the small beside the capital', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const q = buildSound(alphabet, mulberry32(seed));
      const capital = q.right !== q.right.toLowerCase();
      expect(q.options).toHaveLength(4);
      for (const option of q.options) expect(option !== option.toLowerCase()).toBe(capital);
    }
  });
});

describe('the letter drill', () => {
  it('has 48 targets: each of the 24 letters, small and capital', () => {
    expect(LETTERS).toHaveLength(24);
    expect(TARGETS).toHaveLength(48);
    expect(new Set(TARGETS.map((t) => `${t.letter}:${t.form}`)).size).toBe(48);
  });

  it('draws a round of 8 questions, hear-and-tap or name-and-tap, in the form of their target', () => {
    const round = drawRound(startLetterDrill(), mulberry32(3));
    expect(round).toHaveLength(ROUND_SIZE);
    expect(ROUND_SIZE).toBe(8);
    for (const { target, question, mode } of round) {
      const glyph = LETTERS.find((l) => l.id === target.letter)!.glyphs![target.form === 'small' ? 0 : 1];
      expect(question.right).toBe(glyph);
      expect(question.options).toContain(glyph);
      expect(question.ideaId).toBe('alphabet');
      if (mode === 'hear') {
        expect(question.kind).toBe('sound');
        expect(question.prompt).toBe('Tap to hear a letter, then tap it');
        expect(question.say).toBe(glyph);
      } else {
        expect(question.kind).toBe('letter');
        expect(question.prompt).toMatch(/^Which (capital )?letter is [A-Z][a-z]+\?$/);
      }
    }
  });

  it('asks both modes and both forms over the rounds', () => {
    let state = startLetterDrill();
    const modes = new Set<string>();
    const forms = new Set<string>();
    for (let r = 0; r < 6 && !isComplete(state); r += 1) {
      for (const item of drawRound(state, mulberry32(r + 1))) {
        modes.add(item.mode);
        forms.add(item.target.form);
        state = answerTarget(state, item.target, true);
      }
    }
    expect([...modes].sort()).toEqual(['hear', 'name']);
    expect([...forms].sort()).toEqual(['capital', 'small']);
  });

  it('goes on in rounds until every letter is right in both forms, asking again what was missed', () => {
    let state = startLetterDrill();
    let rounds = 0;
    const random = mulberry32(11);
    while (!isComplete(state)) {
      rounds += 1;
      expect(rounds).toBeLessThan(30);
      for (const [i, item] of drawRound(state, random).entries()) state = answerTarget(state, item.target, rounds > 1 || i % 2 === 0);
    }
    expect(remainingTargets(state)).toHaveLength(0);
    expect(rounds).toBeGreaterThanOrEqual(7);
  });

  it('asks everything not right yet, and fills a last short round from what is right', () => {
    let state = startLetterDrill();
    for (const target of TARGETS.slice(0, 45)) state = answerTarget(state, target, true);
    const round = drawRound(state, mulberry32(5));
    expect(round).toHaveLength(8);
    const left = new Set(TARGETS.slice(45).map((t) => `${t.letter}:${t.form}`));
    expect(round.map((i) => `${i.target.letter}:${i.target.form}`)).toEqual(expect.arrayContaining([...left]));
    expect(new Set(round.map((i) => `${i.target.letter}:${i.target.form}`)).size).toBe(8);
  });

  it('asks a target he missed in the very next round', () => {
    let state = startLetterDrill();
    state = answerTarget(state, TARGETS[10], false);
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(drawRound(state, mulberry32(seed)).map((i) => i.target)).toContainEqual(TARGETS[10]);
    }
    expect(drawRound(answerTarget(state, TARGETS[10], true), mulberry32(1)).length).toBe(8);
  });

  it('takes a letter back when a later question about it is missed', () => {
    let state = startLetterDrill();
    for (const target of TARGETS) state = answerTarget(state, target, true);
    expect(isComplete(state)).toBe(true);
    state = answerTarget(state, TARGETS[4], false);
    expect(isComplete(state)).toBe(false);
    expect(remainingTargets(state)).toEqual([TARGETS[4]]);
  });
});

describe('a drill sitting never makes a letter solid', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.grammarLevels.clear(), db.reviews.clear(), db.settings.clear()]);
  });
  afterAll(() => db.close());

  const beta = { kind: 'sound' as const, ideaId: 'alphabet', form: undefined, right: 'Β' };

  it('credits the evidence but stops short of the right uses that make it solid', () => {
    let evidence = none;
    for (let i = 0; i < 10; i += 1) evidence = inferFromDrill(evidence, { ...beta, right: i % 2 ? 'β' : 'Β' }, true).evidence;
    expect(evidence.get('letter-beta')?.run).toBe(INFERRED_RIGHTS - 1);
  });

  it('keeps nothing solid in the store however often the letter is drilled, and the schedule is left alone', async () => {
    for (let i = 0; i < 10; i += 1) await noteDrillAnswer(beta, true);
    expect((await getEvidence()).get('letter-beta')).toEqual({ run: INFERRED_RIGHTS - 1, misses: 0 });
    expect(await getLevel('letter-beta')).toBeUndefined();
    expect(await db.reviews.count()).toBe(0);
  });

  it('counts a miss against the letter', async () => {
    await noteDrillAnswer(beta, true);
    await noteDrillAnswer(beta, false);
    expect((await getEvidence()).get('letter-beta')).toEqual({ run: 0, misses: 1 });
  });

  it('leaves Solid to the schedule: only a spaced review step reaches SOLID_STEP, and the drill writes no review', async () => {
    expect(levelFromStep(SOLID_STEP - 1)).toBe('frontier');
    expect(levelFromStep(SOLID_STEP)).toBe('solid');
    for (let i = 0; i < 10; i += 1) await noteDrillAnswer(beta, true);
    expect(await db.reviews.count()).toBe(0);
    expect(await db.grammarLevels.count()).toBe(0);
  });

  it('a right answer in Review, which is spaced, goes on from the drill and makes the letter solid at the third right use', async () => {
    for (let i = 0; i < 10; i += 1) await noteDrillAnswer(beta, true);
    await noteAnswer(beta, true);
    expect(await getLevel('letter-beta')).toMatchObject({ level: 'solid', how: 'inferred' });
  });
});
