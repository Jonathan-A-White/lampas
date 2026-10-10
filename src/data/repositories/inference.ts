// src/data/repositories/inference.ts — what his right answers show, kept (mw-hqd5bz.17, rules in src/data/grammar/inference.ts, PROVISIONAL). Every answer
// that shows a Greek form or asks about a letter, a sound or a mark goes through here: the evidence for each letter, pair and mark is kept in the settings
// store under 'grammarEvidence' (a JSON object, no table), and an idea whose evidence reaches INFERRED_RIGHTS right uses with no miss since is written solid,
// how 'inferred', and put on the back-off schedule at the 30-day step like a term he marked I know this. A miss counts against an idea he holds only by
// inference: it falls back to the frontier. 'alphabet' follows the 24 letters (grammarLevels.ts syncAlphabet).
import { db } from '../db';
import { publish } from '../../events/bus';
import { inferFromAnswer, inferFromWord, isInferredSolid, type Evidence, type EvidenceMap, type Inferred } from '../grammar/inference';
import { IDEA_KIND } from '../grammar/ladder';
import type { GrammarQuestion } from '../grammar/questions';
import { DAY, STEP_DAYS } from '../schedule';
import { announceAlphabet, syncAlphabet, type GroupMoved } from './grammarLevels';
import { announceDue, writeScheduled } from './reviews';

const KEY = 'grammarEvidence';
const KNOWN_START_STEP = STEP_DAYS.indexOf(30);

/** The evidence kept, by idea id. */
export async function getEvidence(): Promise<Map<string, Evidence>> {
  const row = await db.settings.get(KEY);
  const found = new Map<string, Evidence>();
  if (typeof row?.value !== 'string') return found;
  try {
    const kept = JSON.parse(row.value) as Record<string, unknown>;
    for (const [id, e] of Object.entries(kept)) {
      if (Array.isArray(e) && Number.isInteger(e[0]) && Number.isInteger(e[1])) found.set(id, { run: e[0] as number, misses: e[1] as number });
    }
  } catch {
    // Not evidence: start again.
  }
  return found;
}

const keep = (evidence: EvidenceMap): Promise<unknown> =>
  db.settings.put({ key: KEY, value: JSON.stringify(Object.fromEntries([...evidence].map(([id, e]) => [id, [e.run, e.misses]]))) });

/** What settling an answer changed: the ideas whose level moved, and the alphabet's new level when it moved. */
export interface Credited {
  changed: { id: string; level: 'solid' | 'frontier' }[];
  alphabet: GroupMoved[];
}

/**
 * Settles what an answer showed, inside the caller's transaction (which must be 'rw' over db.settings, db.grammarLevels and db.reviews): the evidence
 * is kept, an idea with enough right uses is written solid (whatever it was, if it was not solid already), and one he holds only by inference that
 * was counted against falls back to the frontier. The caller passes the result to announceCredited once the transaction has committed.
 */
async function apply(infer: (evidence: EvidenceMap) => Inferred, now: number): Promise<Credited> {
  const changed: Credited['changed'] = [];
  const result = infer(await getEvidence());
  await keep(result.evidence);
  for (const id of result.credited) {
    if (!isInferredSolid(result.evidence.get(id)) || (await db.grammarLevels.get(id))?.level === 'solid') continue;
    await db.grammarLevels.put({ id, level: 'solid', since: now, how: 'inferred' });
    await writeScheduled(IDEA_KIND, [id], now, () => ({ step: KNOWN_START_STEP, due: now + 30 * DAY }));
    changed.push({ id, level: 'solid' });
  }
  for (const id of result.missed) {
    const row = await db.grammarLevels.get(id);
    if (row?.how !== 'inferred' || row.level !== 'solid') continue;
    await db.grammarLevels.put({ id, level: 'frontier', since: now, how: 'inferred' });
    changed.push({ id, level: 'frontier' });
  }
  return { changed, alphabet: changed.length > 0 ? await syncAlphabet(now) : [] };
}

/** Tells the bus and the schedule what a committed `apply` changed. */
export async function announceCredited({ changed, alphabet }: Credited, now: number): Promise<void> {
  for (const { id, level } of changed) publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(alphabet, now);
  if (changed.length > 0) await announceDue(now);
}

const settle = async (infer: (evidence: EvidenceMap) => Inferred, now: number): Promise<void> => {
  const credited = await db.transaction('rw', db.settings, db.grammarLevels, db.reviews, () => apply(infer, now));
  await announceCredited(credited, now);
};

/** An answer to a grammar question: a right one on a form credits its letters, sounds and marks; a miss on a letter or sound counts against it. */
export function noteAnswer(question: Pick<GrammarQuestion, 'kind' | 'ideaId' | 'form' | 'right'>, right: boolean, now = Date.now()): Promise<void> {
  return settle((evidence) => inferFromAnswer(evidence, question, right), now);
}

/** A Greek word he read right (a Quick test or Review word): its letters, sounds and marks have one more right use. */
export function noteWordRead(word: string, now = Date.now()): Promise<void> {
  return settle((evidence) => inferFromWord(evidence, word), now);
}

/** noteWordRead inside the caller's transaction (rw over db.settings, db.grammarLevels and db.reviews), for an answer that is written in one: the caller announces the result. */
export function creditWordRead(word: string, now: number): Promise<Credited> {
  return apply((evidence) => inferFromWord(evidence, word), now);
}
