// tests/unit/review-grades.test.ts — a word is graded 'well', 'some' or 'not' (mw-5r3p30.787): recordAnswer hands the Grade to learn-kit's nextReview, the row's recent answers
// count 'well' and 'some' as rights, and rowOutcome passes a Grade through as the answer to write.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, type Review } from '../../src/data/db';
import { recordAnswer } from '../../src/data/repositories';
import { DAY, type Grade } from '../../src/data/schedule';
import { gradeOfLabel, WORD_GRADES } from '../../src/review/kinds';
import { rowOutcome } from '../../src/review/rowOutcome';
import { seedHisWords } from '../support/his-words';

const NOW = 1_700_000_000_000;
const row = (step: number, rights = 0): Review => ({ kind: 'word', id: 'λέγω', step, rights, due: NOW - 60_000, lastWhen: NOW - 3 * DAY, lapses: 0 });

beforeEach(async () => {
  localStorage.clear();
  await db.open();
  await Promise.all([db.reviews.clear(), db.words.clear(), db.meta.clear(), db.results.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  await db.reviews.clear();
});
afterAll(() => db.close());

const graded = async (grade: Grade, from = row(1)) => {
  await db.reviews.put(from);
  await recordAnswer('λέγω', grade, NOW);
  return (await db.reviews.get(['word', 'λέγω'])) as Review;
};

describe('a word graded in Review', () => {
  it("'well' moves it up a step at once", async () => {
    const r = await graded('well');
    expect([r.step, r.rights, r.lapses]).toEqual([2, 0, 0]);
    expect(r.recent?.at(-1)?.right).toBe(true);
  });

  it("'some' is a right: one right in a row, the step kept", async () => {
    const r = await graded('some');
    expect([r.step, r.rights, r.lapses]).toEqual([1, 1, 0]);
  });

  it("'some' after a right in a row moves it up as before", async () => {
    expect((await graded('some', row(1, 1))).step).toBe(2);
  });

  it("'not' is a wrong: two steps down, a lapse, due tomorrow", async () => {
    const r = await graded('not', row(3));
    expect([r.step, r.rights, r.lapses]).toEqual([1, 0, 1]);
    expect(r.due).toBe(NOW + DAY);
    expect(r.recent?.at(-1)?.right).toBe(false);
  });

  it('a boolean keeps its meaning', async () => {
    await db.reviews.put(row(1));
    await recordAnswer('λέγω', true, NOW);
    expect((await db.reviews.get(['word', 'λέγω']))?.rights).toBe(1);
  });

  it("the Quick test's result counts a grade as right unless it is 'not'", async () => {
    await graded('well');
    await recordAnswer('λέγω', 'not', NOW + 1000);
    expect((await db.results.where('lemma').equals('λέγω').toArray()).map((r) => r.right)).toEqual([true, false]);
  });
});

describe('the grade buttons', () => {
  it('are three, each a grade, read from their label', () => {
    expect(WORD_GRADES.map((g) => g.label)).toEqual(['Know it well', 'Kind of', "Don't know"]);
    expect(WORD_GRADES.map((g) => gradeOfLabel(g.label))).toEqual(['well', 'some', 'not']);
    expect(gradeOfLabel('I knew it')).toBeUndefined();
  });

  it('rowOutcome writes the Grade as given, and a Grade of the first answer stands against a later right', () => {
    const item = { kind: 'word', id: 'λέγω' } as const;
    const first = rowOutcome(undefined, item, 'well');
    expect(first.write).toBe('well');
    expect(rowOutcome(first.outcomes, item, 'some').write).toBeNull();
    const missed = rowOutcome(first.outcomes, item, 'not');
    expect(missed.write).toBe('not');
    expect(rowOutcome(missed.outcomes, item, 'well').write).toBeNull();
  });
});
