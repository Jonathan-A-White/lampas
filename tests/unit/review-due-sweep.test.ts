// tests/unit/review-due-sweep.test.ts — a due count is a promise that a round can clear it (mw-svw421.28): for every kind in KINDS, a due row whose draw gives no item
// is not counted by countDue (the Reader's Due chip) or by the Review screen's Due line (countDue per kind).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, type Review } from '../../src/data/db';
import { countDue } from '../../src/data/repositories';
import { LESSON_KIND } from '../../src/data/repositories';
import { DAY } from '../../src/data/schedule';
import { KINDS } from '../../src/review/kinds';
import { mulberry32 } from '../../src/data/quiz';

const NOW = Date.UTC(2026, 9, 20, 9, 0, 0);
const row = (kind: string, id: string): Review => ({ kind, id, step: 0, rights: 0, due: NOW - 60_000, lastWhen: NOW - 3 * DAY, lapses: 0 });

/** For each kind, a due row that names something Review cannot ask now (no word listed, no form unlocked, no such idea, an unreadable sound id, no open plan). */
const UNASKABLE: Record<string, Review> = {
  word: row('word', 'λόγος'),
  grammar: row('grammar', 'no-such-idea'),
  paradigm: row('paradigm', 'article'),
  sound: row('sound', 'unreadable'),
  'drill-plan': row('drill-plan', 'article|facet:none'),
};

beforeEach(async () => {
  await db.open();
  await Promise.all([db.reviews.clear(), db.words.clear(), db.meta.clear(), db.grammarLevels.clear(), db.settings.clear()]);
});
afterAll(() => db.close());

describe('a due count a round can clear', () => {
  it('names a due row for every kind but the passage lesson, which is opened rather than asked', () => {
    expect(KINDS.map((k) => k.kind).filter((k) => k !== LESSON_KIND).sort()).toEqual(Object.keys(UNASKABLE).sort());
  });

  for (const kind of KINDS.filter((k) => k.kind !== LESSON_KIND)) {
    it(`does not count a due ${kind.kind} row whose draw gives no item`, async () => {
      const due = UNASKABLE[kind.kind];
      await db.reviews.put(due);
      expect(await kind.draw([due], mulberry32(1))).toEqual([]);
      expect(await countDue(NOW, kind.kind)).toBe(0);
      expect(await countDue(NOW)).toBe(0);
    });
  }
});
