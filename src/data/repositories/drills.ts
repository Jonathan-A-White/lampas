// src/data/repositories/drills.ts — the Parsing drill's answers, one row per step asked. The paradigm drills will read them.
import { db, type DrillResult } from '../db';

export type { DrillResult };

/** Stores one answer to one step of one word. */
export async function recordDrillStep(lemma: string, step: string, right: boolean, now = Date.now()): Promise<void> {
  await db.drills.add({ lemma, step, when: now, right });
}

/** The answers given for a word, oldest first; for one step only when `step` is given. */
export async function listDrillResults(lemma: string, step?: string): Promise<DrillResult[]> {
  const rows = step === undefined ? await db.drills.where('lemma').equals(lemma).toArray() : await db.drills.where('[lemma+step]').equals([lemma, step]).toArray();
  return rows.sort((a, b) => a.when - b.when || (a.id ?? 0) - (b.id ?? 0));
}
