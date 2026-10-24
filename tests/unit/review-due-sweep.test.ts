// tests/unit/review-due-sweep.test.ts — a due count is a promise that a round can clear it (mw-svw421.28): for every kind in KINDS, a due row whose draw gives no item
// is not counted by countDue (the Reader's Due chip) or by the Review screen's Due line (countDue per kind).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, type Review } from '../../src/data/db';
import { countDue, listDue, saveDrillPlan } from '../../src/data/repositories';
import { PROVE_ID, rowId, type DrillPlan } from '../../src/data/grammar/drillPlan';
import { LESSON_KIND } from '../../src/data/repositories';
import { DAY } from '../../src/data/schedule';
import { setGreekPronunciation } from '../../src/data/repositories/settings';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { DRILL_PLAN, KINDS, SOUNDS } from '../../src/review/kinds';
import { mulberry32 } from '../../src/data/quiz';
import { VERSE_KIND } from '../../src/data/repositories/memorize';
import { drawReviewRound } from '../../src/review/round';

const NOW = Date.UTC(2026, 9, 20, 9, 0, 0);
const row = (kind: string, id: string): Review => ({ kind, id, step: 0, rights: 0, due: NOW - 60_000, lastWhen: NOW - 3 * DAY, lapses: 0 });

/** A plan of the article whose one short drill is of a facet the article never asks (no question to draw), and the Prove it that waits on it. */
const EMPTY_DRILL: DrillPlan = {
  ideaId: 'article',
  at: NOW - 3 * DAY,
  items: [
    { id: 'facet:no-such-facet', kind: 'facet', facet: { id: 'no-such-facet', label: 'Nothing' }, step: 1, done: false },
    { id: PROVE_ID, kind: 'prove', step: 3, done: false },
  ],
};

/** For each kind, due rows that name something Review cannot ask now (no word listed, no form unlocked, no such idea, an unreadable sound id, no open plan, a drill with no question), and the plan to keep first. */
const UNASKABLE: Record<string, { rows: Review[]; plan?: DrillPlan }> = {
  word: { rows: [row('word', 'λόγος')] },
  grammar: { rows: [row('grammar', 'no-such-idea')] },
  paradigm: { rows: [row('paradigm', 'article')] },
  sound: { rows: [row('sound', 'unreadable')] },
  'drill-plan': { rows: [row('drill-plan', 'article|facet:none'), row('drill-plan', rowId('article', 'facet:no-such-facet'))], plan: EMPTY_DRILL },
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
      const { rows: due, plan } = UNASKABLE[kind.kind];
      if (plan) await saveDrillPlan(plan, NOW);
      // saveDrillPlan puts the plan's own rows on the schedule; the rows under test are written over them, due a minute ago
      await db.reviews.bulkPut(due);
      expect(await kind.draw(due, mulberry32(1))).toEqual([]);
      expect(await countDue(NOW, kind.kind)).toBe(0);
      expect(await countDue(NOW)).toBe(0);
    });
  }
});

describe('a due count that still counts what a round can ask', () => {
  it('counts a drill-plan row whose drill has questions, and the draw asks it', async () => {
    const facet = drillSteps('article', { seed: 1 })[0].questions[0].facet;
    const plan: DrillPlan = { ideaId: 'article', at: NOW - 3 * DAY, items: [{ id: `facet:${facet.id}`, kind: 'facet', facet, step: 1, done: false }, { id: PROVE_ID, kind: 'prove', step: 3, done: false }] };
    await saveDrillPlan(plan, NOW - DAY);
    expect(await countDue(NOW, 'drill-plan')).toBe(1);
    const items = await DRILL_PLAN.draw(await db.reviews.toArray(), mulberry32(1));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'drill-plan', ideaId: 'article' });
  });

  // a sound row's id is its language and unit ('el:diphthong-ou'), not the pronunciation: only a sound idea's grammar row is kept per scheme, and inScheme alone leaves another's out (mw-svw421.42)
  it('counts a due sound row, and the draw asks it, while a grammar row kept under another pronunciation is not counted', async () => {
    await setGreekPronunciation('modern');
    const due = [row('sound', 'el:diphthong-ou'), row('sound', 'en:blessed')];
    await db.reviews.bulkPut([...due, row('grammar', 'erasmian:alphabet'), row('grammar', 'modern:alphabet')]);
    expect(await countDue(NOW, 'sound')).toBe(2);
    expect(await SOUNDS.draw(due, mulberry32(1))).toHaveLength(2);
    expect(await countDue(NOW, 'grammar')).toBe(1);
  });
});

describe('a memorized verse is on the schedule but not in Review', () => {
  it('is not counted, listed or drawn when no kind is asked for, and is when Memorize asks for its kind', async () => {
    await db.reviews.put(row(VERSE_KIND, 'en:Rom.8.28'));
    expect(await countDue(NOW)).toBe(0);
    expect(await listDue(undefined, NOW)).toEqual([]);
    expect((await drawReviewRound(mulberry32(1), NOW)).due).toBe(0);
    expect(await countDue(NOW, VERSE_KIND)).toBe(1);
    expect((await listDue(VERSE_KIND, NOW)).map((r) => r.id)).toEqual(['en:Rom.8.28']);
  });
});
