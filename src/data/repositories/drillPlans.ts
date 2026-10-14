// src/data/repositories/drillPlans.ts — Your drill plan kept and scheduled (mw-i7xe0n.4, docs/grammar.md 'Your drill plan'). A plan (src/data/grammar/drillPlan.ts) is one JSON value in the
// settings store under 'drillPlan.<idea id>' (no table, outside the settings registry so only a finished run writes it); each of its items still to do is a schedule row of kind
// 'drill-plan' (id '<idea id>|<item id>'): the first short drill due now, each next one a day after the one before; Prove it gets its row only once every short drill is done, due a day
// later. A short drill answered right is done and leaves the schedule; one answered wrong stays on the plan and comes back tomorrow (schedule.ts: a wrong answer is due tomorrow).
// A proof closes the plan. A repository owns its transactions.
import { db } from '../db';
import { PLAN_KIND, PROVE_ID, parseRowId, rowId, toGo, type DrillPlan, type PlanItem } from '../grammar/drillPlan';
import { DAY } from '../schedule';
import { announceDue, writeReview } from './reviews';

const PREFIX = 'drillPlan.';

const isItem = (value: unknown): value is PlanItem =>
  typeof value === 'object' && value !== null && typeof (value as PlanItem).id === 'string' && ['facet', 'prove'].includes((value as PlanItem).kind) && typeof (value as PlanItem).done === 'boolean';

/** The plan a settings value holds, or undefined for one that is not a plan. */
function parse(value: unknown): DrillPlan | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const plan: unknown = JSON.parse(value);
    const p = plan as DrillPlan;
    return typeof p === 'object' && p !== null && typeof p.ideaId === 'string' && typeof p.at === 'number' && Array.isArray(p.items) && p.items.every(isItem) ? p : undefined;
  } catch {
    return undefined;
  }
}

/** Deletes the schedule rows of an idea's plan, inside the caller's transaction (which must include db.reviews). */
async function dropRows(ideaId: string): Promise<void> {
  const rows = await db.reviews.where('kind').equals(PLAN_KIND).primaryKeys();
  const mine = rows.filter(([, id]) => parseRowId(id)?.ideaId === ideaId);
  await db.reviews.bulkDelete(mine);
}

/** The plan kept for an idea, or undefined when it has none open. */
export async function getDrillPlan(ideaId: string): Promise<DrillPlan | undefined> {
  return parse((await db.settings.get(PREFIX + ideaId))?.value);
}

/** Every plan kept, the newest first. */
export async function listDrillPlans(): Promise<DrillPlan[]> {
  const rows = await db.settings.where('key').startsWith(PREFIX).toArray();
  return rows.flatMap((r) => parse(r.value) ?? []).sort((a, b) => b.at - a.at);
}

/** How many items of each open plan are still to do, by idea id (what the Goal screen writes). */
export async function drillPlanCounts(): Promise<Map<string, number>> {
  return new Map((await listDrillPlans()).map((p) => [p.ideaId, toGo(p)]));
}

/**
 * Keeps a new plan for its idea, in place of the one it had (a later run says where he stands now), and puts its short drills on the schedule: the first due at `now`, each next one
 * a day after the one before. Publishes the new count of what is due.
 */
export async function saveDrillPlan(plan: DrillPlan, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.settings, db.reviews, async () => {
    await dropRows(plan.ideaId);
    await db.settings.put({ key: PREFIX + plan.ideaId, value: JSON.stringify(plan) });
    const facets = plan.items.filter((i) => i.kind === 'facet' && !i.done);
    await db.reviews.bulkPut(facets.map((item, i) => ({ kind: PLAN_KIND, id: rowId(plan.ideaId, item.id), step: 0, due: now + i * DAY, lastWhen: now, lapses: 0, rights: 0 })));
  });
  await announceDue(now);
}

/** Closes an idea's plan: it is forgotten and its rows leave the schedule. Nothing happens for an idea with none. */
export async function closeDrillPlan(ideaId: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.settings, db.reviews, async () => {
    await dropRows(ideaId);
    await db.settings.delete(PREFIX + ideaId);
  });
  await announceDue(now);
}

/** What an answer to a plan's item did: 'done' (the item is finished), 'repeat' (a miss: it comes back tomorrow) or 'ignored' (the plan was replaced or closed, or the item is not one). */
export type PlanAnswer = 'done' | 'repeat' | 'ignored';

/**
 * Puts one answer to an item of the plan made at `planAt` on the plan and its schedule. A short drill done leaves the schedule, and the next item is due no sooner than tomorrow
 * (Prove it comes on the schedule when the last short drill is done); Prove it done closes the plan. A miss keeps the item, due tomorrow. An answer to a plan that has been replaced
 * or closed since the question was drawn changes nothing.
 */
export async function answerPlanItem(ideaId: string, planAt: number, itemId: string, right: boolean, now = Date.now()): Promise<PlanAnswer> {
  const result = await db.transaction('rw', db.settings, db.reviews, async (): Promise<PlanAnswer> => {
    const plan = await getDrillPlan(ideaId);
    const item = plan?.items.find((i) => i.id === itemId);
    if (!plan || plan.at !== planAt || !item || item.done) return 'ignored';
    const id = rowId(ideaId, itemId);
    if (!right) {
      await writeReview(PLAN_KIND, id, false, now);
      return 'repeat';
    }
    item.done = true;
    await db.reviews.where('[kind+id]').equals([PLAN_KIND, id]).delete();
    if (itemId === PROVE_ID) {
      await dropRows(ideaId);
      await db.settings.delete(PREFIX + ideaId);
      return 'done';
    }
    const next = plan.items.find((i) => !i.done);
    if (next) {
      const row = await db.reviews.get([PLAN_KIND, rowId(ideaId, next.id)]);
      if (next.kind === 'prove') await db.reviews.put({ kind: PLAN_KIND, id: rowId(ideaId, next.id), step: 0, due: now + DAY, lastWhen: now, lapses: 0, rights: 0 });
      else if (row) await db.reviews.put({ ...row, due: Math.max(row.due, now + DAY) });
    }
    await db.settings.put({ key: PREFIX + ideaId, value: JSON.stringify(plan) });
    return 'done';
  });
  await announceDue(now);
  return result;
}
