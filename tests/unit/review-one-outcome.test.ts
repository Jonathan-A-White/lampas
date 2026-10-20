// tests/unit/review-one-outcome.test.ts — a row takes one outcome a round (mw-svw421.29): for every kind in KINDS whose draw can give several items with one id, a round
// of a wrong answer then a right one on the same id leaves its schedule row due tomorrow with the lapse, as the Review screen answers it (rowOutcome, then kind.record).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, type Review } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';
import { DAY } from '../../src/data/schedule';
import { KINDS, type ReviewItem } from '../../src/review/kinds';
import { rowOutcome, type RowOutcomes } from '../../src/review/rowOutcome';
import { LESSON_KIND } from '../../src/data/repositories';
import { seedHisWords } from '../support/his-words';
import { stubChapterFetch } from '../support/chapter-fetch';

const NOW = Date.now();
const due = (kind: string, id: string): Review => ({ kind, id, step: 0, rights: 0, due: NOW - 60_000, lastWhen: NOW - 3 * DAY, lapses: 0 });

/** A due row for each kind that has items to draw (a drill plan needs a saved plan: its rows are one item each by their ids, and it draws none here). */
const DUE: Record<string, Review> = {
  word: due('word', 'λέγω'),
  grammar: due('grammar', 'case-genitive'),
  paradigm: due('paradigm', 'article'),
  sound: due('sound', 'el:diphthong-ou'),
};
const SOLID = ['article', 'noun', 'case-nominative', 'number-singular', 'gender-masculine'];
const FRONTIER = ['case-genitive', 'gender-feminine'];

beforeEach(async () => {
  stubChapterFetch();
  localStorage.clear();
  await db.open();
  await Promise.all([db.reviews.clear(), db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  await db.reviews.clear();
  await db.grammarLevels.bulkPut([
    ...SOLID.map((id) => ({ id, level: 'solid' as const, since: NOW, how: 'marked' as const })),
    ...FRONTIER.map((id) => ({ id, level: 'frontier' as const, since: NOW, how: 'marked' as const })),
  ]);
});
afterAll(() => db.close());

/** Answers an item as the Review screen does. */
async function answer(item: ReviewItem, right: boolean, before: RowOutcomes): Promise<RowOutcomes> {
  const { write, outcomes } = rowOutcome(before, item, right);
  await KINDS.find((k) => k.kind === item.kind)!.record(item, right, write);
  return outcomes;
}

describe('one outcome for a schedule row in a round', () => {
  for (const kind of KINDS.filter((k) => k.kind !== LESSON_KIND)) {
    it(`leaves a ${kind.kind} row due tomorrow after a wrong answer then a right one on one id`, async () => {
      const row = DUE[kind.kind];
      if (row) await db.reviews.put(row);
      const drawn = row ? await kind.draw([row], mulberry32(3)) : [];
      const several = drawn.filter((a) => drawn.filter((b) => b.id === a.id).length > 1);
      // the kinds that can give several items with one id are the ones this sweep must hold to the rule: a new kind that does fails here until it is handled
      expect(several.length > 0).toBe(kind.kind === 'paradigm');
      const [first, second] = several;
      if (!first || !second) return;
      const outcomes = await answer(first, false, {});
      await answer(second, true, outcomes);
      const after = await db.reviews.get([first.kind, first.id]);
      expect(after?.lapses).toBe(1);
      expect(after?.due).toBeLessThanOrEqual(Date.now() + DAY);
    });
  }

  it('writes a right answer once, and a miss over it', () => {
    const item = { kind: 'paradigm' as const, id: 'article' };
    const one = rowOutcome({}, item, true);
    expect(one.write).toBe(true);
    const two = rowOutcome(one.outcomes, item, true);
    expect(two.write).toBeNull();
    const three = rowOutcome(two.outcomes, item, false);
    expect(three.write).toBe(false);
    expect(rowOutcome(three.outcomes, item, true).write).toBeNull();
    expect(rowOutcome(three.outcomes, item, false).write).toBeNull();
  });
});
