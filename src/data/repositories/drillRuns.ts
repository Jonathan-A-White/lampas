// src/data/repositories/drillRuns.ts — the runs of Drill it kept on the device (mw-i7xe0n.2, docs/grammar.md 'Drill it, the engine'). Every finished run is a
// row of the Dexie `drillRuns` table; the latest run of an idea says where he stands on it now, and weakFacets() is what the tutor is told of it
// (learner_grammar.weak). A run that proved its idea has no weak points to tell, whatever facets it listed. A repository owns its transactions.
import { db, type DrillRunRow } from '../db';
import type { DrillResult } from '../grammar/drillIt';

export type { DrillRunRow };

/** Keeps a finished run, with the time it was kept. */
export async function saveDrillRun(result: DrillResult, at = Date.now()): Promise<DrillRunRow> {
  const row: DrillRunRow = {
    ideaId: result.ideaId,
    at,
    proved: result.proved,
    edgeStep: result.edgeStep,
    topStep: result.topStep,
    ended: result.ended,
    strong: result.strong.map(({ id, label }) => ({ id, label })),
    weak: result.weak.map(({ id, label }) => ({ id, label })),
    answers: result.answers.map(({ step, facet, key, right, hinted }) => ({ step, facet: { id: facet.id, label: facet.label }, key, right, hinted })),
  };
  const id = await db.drillRuns.add(row);
  return { ...row, id };
}

/** The newest run of an idea (the one kept last when two share a time), or undefined when it was never drilled. */
export async function latestDrillRunFor(ideaId: string): Promise<DrillRunRow | undefined> {
  const runs = await db.drillRuns.where('ideaId').equals(ideaId).toArray();
  return runs.reduce<DrillRunRow | undefined>((best, r) => (!best || r.at > best.at || (r.at === best.at && (r.id ?? 0) > (best.id ?? 0)) ? r : best), undefined);
}

/** The weak facets he still has, by idea: the labels of the latest run of each idea, when that run did not prove the idea and named any. `at` is that run's time. */
export async function weakFacets(): Promise<Map<string, { at: number; labels: string[] }>> {
  const latest = new Map<string, DrillRunRow>();
  for (const r of await db.drillRuns.toArray()) {
    const best = latest.get(r.ideaId);
    if (!best || r.at > best.at || (r.at === best.at && (r.id ?? 0) > (best.id ?? 0))) latest.set(r.ideaId, r);
  }
  const out = new Map<string, { at: number; labels: string[] }>();
  for (const [ideaId, r] of latest) if (!r.proved && r.weak.length > 0) out.set(ideaId, { at: r.at, labels: r.weak.map((f) => f.label) });
  return out;
}
