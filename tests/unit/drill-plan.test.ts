// Your drill plan (mw-i7xe0n.4): the plan a failed Drill it run makes (src/data/grammar/drillPlan.ts, pure), how it is kept and scheduled (repositories/drillPlans.ts, review kind
// 'drill-plan') and what a rerun does to it (recordDrill). No tutor is asked anything.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { drillSteps, type DrillResult } from '../../src/data/grammar/drillIt';
import {
  FACET_QUESTIONS_MAX,
  FACET_QUESTIONS_MIN,
  PLAN_KIND,
  PROVE_ID,
  facetPassed,
  facetQuestions,
  nextItem,
  parseRowId,
  planFrom,
  rowId,
  toGo,
} from '../../src/data/grammar/drillPlan';
import { answerPlanItem, closeDrillPlan, drillPlanCounts, getDrillPlan, saveDrillPlan } from '../../src/data/repositories/drillPlans';
import { recordDrill } from '../../src/data/repositories/grammarLevels';
import { listDue } from '../../src/data/repositories/reviews';
import { DAY } from '../../src/data/schedule';
import { loadChapter } from '../../src/data/chapter';
import { stubChapterFetch } from '../support/chapter-fetch';

const facet = (id: string, label = id) => ({ id, label });
const answerAt = (step: number, f: { id: string; label: string }, right: boolean) => ({ step, facet: f, key: `${f.id}${step}${right}`, right, hinted: false });

const CASE = facet('case', 'the case');
const ENDING = facet('ending', 'its ending');
const MEANING = facet('meaning', 'what it is');

/** A failed run weak in the ending (asked at step 4) and the case (asked at step 2), right on what it is. */
const failed = (over: Partial<DrillResult> = {}): DrillResult => ({
  ideaId: 'noun',
  proved: false,
  edgeStep: 2,
  topStep: 4,
  strong: [MEANING],
  weak: [ENDING, CASE],
  answers: [answerAt(1, MEANING, true), answerAt(2, CASE, false), answerAt(3, MEANING, true), answerAt(4, ENDING, false)],
  ended: 'edge',
  ...over,
});

const NOW = Date.UTC(2026, 9, 13, 12);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.reviews.clear(), db.drillRuns.clear(), db.grammarLevels.clear(), db.meta.clear()]);
  stubChapterFetch();
});
afterAll(() => db.close());

describe('the plan a run makes', () => {
  it('gives a drill for each weak facet, the easiest facet first, then Prove it', () => {
    const plan = planFrom(failed(), NOW);
    expect(plan?.items.map((i) => i.id)).toEqual(['facet:case', 'facet:ending', PROVE_ID]);
    expect(plan?.items.map((i) => i.kind)).toEqual(['facet', 'facet', 'prove']);
    expect(plan?.items[0].facet).toEqual(CASE);
    expect(plan?.items.every((i) => !i.done)).toBe(true);
    expect(plan).toMatchObject({ ideaId: 'noun', at: NOW });
    expect(toGo(plan!)).toBe(3);
    expect(nextItem(plan!)?.id).toBe('facet:case');
  });

  it('centres each short drill on the run\'s edge step, never below the first', () => {
    expect(planFrom(failed({ edgeStep: 3 }), NOW)?.items.map((i) => i.step)).toEqual([3, 3, 4]);
    expect(planFrom(failed({ edgeStep: 0 }), NOW)?.items[0].step).toBe(1);
  });

  it('keeps the run\'s own order for facets first asked at the same step', () => {
    const run = failed({ answers: [answerAt(2, ENDING, false), answerAt(2, CASE, false)] });
    expect(planFrom(run, NOW)?.items.map((i) => i.id)).toEqual(['facet:ending', 'facet:case', PROVE_ID]);
  });

  it('makes no plan for a proved run or a run with no weak facet', () => {
    expect(planFrom(failed({ proved: true, weak: [] }), NOW)).toBeNull();
    expect(planFrom(failed({ weak: [] }), NOW)).toBeNull();
  });

  it('names a schedule row by idea and item', () => {
    expect(parseRowId(rowId('noun', 'facet:case'))).toEqual({ ideaId: 'noun', itemId: 'facet:case' });
    expect(parseRowId('noun')).toBeNull();
  });

  it('passes a short drill with one miss allowed', () => {
    expect(facetPassed(4, 4)).toBe(true);
    expect(facetPassed(3, 4)).toBe(true);
    expect(facetPassed(2, 4)).toBe(false);
    expect(facetPassed(5, 6)).toBe(true);
    expect(facetPassed(4, 6)).toBe(false);
    expect(facetPassed(0, 0)).toBe(false);
  });
});

describe('the questions of a short drill', () => {
  it('are 4 to 6 of the facet, at and just below the step', async () => {
    const steps = drillSteps('noun', { passage: [await loadChapter('1jn', 1)], seed: 7 });
    const crowded = steps.flatMap((s) => s.questions).reduce((n, q) => n.set(q.facet.id, (n.get(q.facet.id) ?? 0) + 1), new Map<string, number>());
    expect(crowded.size).toBeGreaterThan(0);
    for (const [id, count] of crowded) {
      const label = steps.flatMap((s) => s.questions).find((q) => q.facet.id === id)!.facet.label;
      const top = steps.length;
      const drill = facetQuestions(steps, { id: `facet:${id}`, kind: 'facet', facet: { id, label }, step: top, done: false });
      expect(drill.length).toBeGreaterThanOrEqual(Math.min(FACET_QUESTIONS_MIN, count));
      expect(drill.length).toBeLessThanOrEqual(FACET_QUESTIONS_MAX);
      expect(drill.every((q) => q.facet.id === id)).toBe(true);
    }
  });

  it('are none for Prove it', () => {
    expect(facetQuestions([], { id: PROVE_ID, kind: 'prove', step: 4, done: false })).toEqual([]);
  });
});

describe('a plan kept and scheduled', () => {
  it('puts the short drills on the schedule, the first due now and each next a day later, and Prove it not yet', async () => {
    await saveDrillPlan(planFrom(failed(), NOW)!, NOW);
    const rows = (await db.reviews.where('kind').equals(PLAN_KIND).toArray()).sort((a, b) => a.due - b.due);
    expect(rows.map((r) => [r.id, r.step, r.due])).toEqual([
      [rowId('noun', 'facet:case'), 0, NOW],
      [rowId('noun', 'facet:ending'), 0, NOW + DAY],
    ]);
    // (listDue leaves out a short drill the idea never asks, mw-svw421.42: this plan's made-up facets are not the noun's, so what is due is read off the rows)
    expect(rows.filter((r) => r.due <= NOW).map((r) => r.id)).toEqual([rowId('noun', 'facet:case')]);
    expect(await drillPlanCounts()).toEqual(new Map([['noun', 3]]));
  });

  it('keeps an item answered with a miss on the plan, due tomorrow', async () => {
    await saveDrillPlan(planFrom(failed({ weak: [MEANING] }), NOW)!, NOW);
    const plan = (await getDrillPlan('noun'))!;
    expect(await answerPlanItem('noun', plan.at, 'facet:meaning', false, NOW)).toBe('repeat');
    const row = await db.reviews.get([PLAN_KIND, rowId('noun', 'facet:meaning')]);
    expect(row).toMatchObject({ step: 0, due: NOW + DAY, lapses: 1 });
    expect(toGo((await getDrillPlan('noun'))!)).toBe(2);
    expect((await listDue(PLAN_KIND, NOW + DAY)).map((r) => r.id)).toContain(rowId('noun', 'facet:meaning'));
  });

  it('finishes an item answered right, moves the next to no sooner than tomorrow, and brings Prove it after the last', async () => {
    await saveDrillPlan(planFrom(failed(), NOW)!, NOW);
    const at = (await getDrillPlan('noun'))!.at;
    expect(await answerPlanItem('noun', at, 'facet:case', true, NOW)).toBe('done');
    expect(await db.reviews.get([PLAN_KIND, rowId('noun', 'facet:case')])).toBeUndefined();
    expect(toGo((await getDrillPlan('noun'))!)).toBe(2);
    expect(await db.reviews.get([PLAN_KIND, rowId('noun', 'facet:ending')])).toMatchObject({ due: NOW + DAY });
    expect(await db.reviews.get([PLAN_KIND, rowId('noun', PROVE_ID)])).toBeUndefined();

    await answerPlanItem('noun', at, 'facet:ending', true, NOW + DAY);
    expect(await db.reviews.get([PLAN_KIND, rowId('noun', PROVE_ID)])).toMatchObject({ due: NOW + 2 * DAY, step: 0 });
    expect(toGo((await getDrillPlan('noun'))!)).toBe(1);
  });

  it('ignores an answer to a plan that was replaced, or to an item done already', async () => {
    await saveDrillPlan(planFrom(failed(), NOW)!, NOW);
    expect(await answerPlanItem('noun', NOW - 1, 'facet:case', true, NOW)).toBe('ignored');
    expect(await answerPlanItem('noun', NOW, 'facet:nothing', true, NOW)).toBe('ignored');
    await answerPlanItem('noun', NOW, 'facet:case', true, NOW);
    expect(await answerPlanItem('noun', NOW, 'facet:case', true, NOW)).toBe('ignored');
    await closeDrillPlan('noun', NOW);
    expect(await getDrillPlan('noun')).toBeUndefined();
    expect(await db.reviews.where('kind').equals(PLAN_KIND).count()).toBe(0);
  });
});

describe('a rerun', () => {
  it('replaces the plan when it fails again, from where he stands now', async () => {
    await recordDrill(failed(), 'prove', NOW);
    expect((await getDrillPlan('noun'))?.items.map((i) => i.id)).toEqual(['facet:case', 'facet:ending', PROVE_ID]);
    await recordDrill(failed({ weak: [ENDING], answers: [answerAt(4, ENDING, false)] }), 'prove', NOW + DAY);
    const plan = (await getDrillPlan('noun'))!;
    expect(plan.items.map((i) => i.id)).toEqual(['facet:ending', PROVE_ID]);
    expect(await db.reviews.where('kind').equals(PLAN_KIND).count()).toBe(1);
  });

  it('closes the plan when a rerun proves the idea', async () => {
    await recordDrill(failed(), 'prove', NOW);
    expect(await db.reviews.where('kind').equals(PLAN_KIND).count()).toBe(2);
    await recordDrill({ ...failed(), proved: true, weak: [], edgeStep: 4, ended: 'proved' }, 'prove', NOW + DAY);
    expect(await getDrillPlan('noun')).toBeUndefined();
    expect(await db.reviews.where('kind').equals(PLAN_KIND).count()).toBe(0);
    expect(await db.grammarLevels.get('noun')).toMatchObject({ level: 'solid', how: 'drill' });
  });

  it('leaves a plan alone when a later run has nothing weak to say', async () => {
    await recordDrill(failed(), 'practice', NOW);
    await recordDrill(failed({ weak: [] }), 'practice', NOW + DAY);
    expect(toGo((await getDrillPlan('noun'))!)).toBe(3);
  });
});
