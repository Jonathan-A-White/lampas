// src/data/repositories/inference.ts — what his right answers show, kept (mw-hqd5bz.17, rules in src/data/grammar/inference.ts, PROVISIONAL). Every answer
// that shows a Greek form or asks about a letter, a sound or a mark goes through here: the evidence for each letter, pair and mark is kept in the settings
// store under 'grammarEvidence' (a JSON object, no table), and an idea whose evidence reaches INFERRED_RIGHTS right uses with no miss since is written solid,
// how 'inferred', and put on the back-off schedule at the 30-day step like a term he marked I know this. A miss counts against an idea he holds only by
// inference: it falls back to the frontier. 'alphabet' follows the 24 letters (grammarLevels.ts syncAlphabet).
import { db } from '../db';
import { publish } from '../../events/bus';
import { inferFromAnswer, inferFromWord, isInferredSolid, type Evidence, type EvidenceMap, type Inferred } from '../grammar/inference';
import { IDEA_KIND } from '../grammar/ladder';
import { ideaOfStored, isItemId, storedId } from '../grammar/soundScope';
import type { GrammarQuestion } from '../grammar/questions';
import { DAY, STEP_DAYS } from '../schedule';
import { getGreekPronunciation } from './settings';
import { advanceFrontier, announceAlphabet, frontierIdeas, lowestFrontier, syncAlphabet, type GrammarLevelName, type GroupMoved } from './grammarLevels';
import { announceDue, writeScheduled } from './reviews';

const KEY = 'grammarEvidence';
const KNOWN_START_STEP = STEP_DAYS.indexOf(30);

/** Everything kept, by stored key: a letter, sound or mark idea's evidence under '<scheme>:<id>' (src/data/grammar/soundScope.ts), any other idea's under its id. */
async function keptEvidence(): Promise<Record<string, unknown>> {
  const row = await db.settings.get(KEY);
  if (typeof row?.value !== 'string') return {};
  try {
    const kept = JSON.parse(row.value) as unknown;
    return typeof kept === 'object' && kept !== null && !Array.isArray(kept) ? (kept as Record<string, unknown>) : {};
  } catch {
    return {}; // Not evidence: start again.
  }
}

/** The evidence in `kept` that is the selected scheme's or a grammar idea's, by idea id. */
function evidenceIn(kept: Record<string, unknown>, scheme: string): Map<string, Evidence> {
  const found = new Map<string, Evidence>();
  for (const [stored, e] of Object.entries(kept)) {
    const id = ideaOfStored(stored, scheme);
    if (id !== undefined && Array.isArray(e) && Number.isInteger(e[0]) && Number.isInteger(e[1])) found.set(id, { run: e[0] as number, misses: e[1] as number });
  }
  return found;
}

/** The evidence kept, by idea id: the grammar ideas' and the sound ideas' in the selected scheme. */
export async function getEvidence(): Promise<Map<string, Evidence>> {
  return evidenceIn(await keptEvidence(), await getGreekPronunciation());
}

/** Writes the evidence of the selected scheme (and the grammar ideas') over `kept`, leaving the other schemes' as they were. Not async: inside a transaction every hop counts. */
function keep(kept: Record<string, unknown>, evidence: EvidenceMap, scheme: string): Promise<unknown> {
  const others = Object.fromEntries(Object.entries(kept).filter(([stored]) => ideaOfStored(stored, scheme) === undefined));
  const mine = Object.fromEntries([...evidence].map(([id, e]) => [storedId(id, scheme), [e.run, e.misses]]));
  return db.settings.put({ key: KEY, value: JSON.stringify({ ...others, ...mine }) });
}

/** What settling an answer changed: the ideas whose level moved, and the alphabet's new level when it moved. */
export interface Credited {
  changed: { id: string; level: GrammarLevelName }[];
  alphabet: GroupMoved[];
}

/**
 * Settles what an answer showed, inside the caller's transaction (which must be 'rw' over db.settings, db.grammarLevels and db.reviews): the evidence
 * is kept, an idea with enough right uses is written solid (whatever it was, if it was not solid already), and one he holds only by inference that
 * was counted against falls back to the frontier. One idea at the frontier at a time (mw-i7xe0n.6): a letter, pair or breathing falls back on its own, any other
 * idea only as the lowest unproved (the idea he was learning, if a higher one, goes back to not yet), and an idea that becomes solid while it was the frontier moves
 * the frontier on. The caller passes the result to announceCredited once the transaction has committed.
 */
async function apply(infer: (evidence: EvidenceMap) => Inferred, now: number): Promise<Credited> {
  const changed: Credited['changed'] = [];
  const scheme = await getGreekPronunciation();
  const kept = await keptEvidence();
  const result = infer(evidenceIn(kept, scheme));
  const learning = await frontierIdeas(scheme);
  await keep(kept, result.evidence, scheme);
  for (const id of result.credited) {
    if (!isInferredSolid(result.evidence.get(id)) || (await db.grammarLevels.get(storedId(id, scheme)))?.level === 'solid') continue;
    await db.grammarLevels.put({ id: storedId(id, scheme), level: 'solid', since: now, how: 'inferred' });
    await writeScheduled(IDEA_KIND, [storedId(id, scheme)], now, () => ({ step: KNOWN_START_STEP, due: now + 30 * DAY }));
    changed.push({ id, level: 'solid' });
  }
  const fellBack: string[] = [];
  for (const id of result.missed) {
    const row = await db.grammarLevels.get(storedId(id, scheme));
    if (row?.how !== 'inferred' || row.level !== 'solid') continue;
    if (!isItemId(id)) {
      fellBack.push(id);
      continue;
    }
    await db.grammarLevels.put({ id: storedId(id, scheme), level: 'frontier', since: now, how: 'inferred' });
    changed.push({ id, level: 'frontier' });
  }
  changed.push(...(await lowestFrontier(fellBack, 'inferred', now, scheme)));
  const alphabet = changed.length > 0 ? await syncAlphabet(now, scheme) : [];
  return { changed, alphabet: learning.length > 0 ? [...alphabet, ...(await advanceFrontier(learning, now, scheme))] : alphabet };
}

/** Tells the bus and the schedule what a committed `apply` changed. */
export async function announceCredited({ changed, alphabet }: Credited, now: number): Promise<void> {
  for (const { id, level } of changed) publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(alphabet, now);
  if (changed.length > 0) await announceDue(now);
}

const settle = async (infer: (evidence: EvidenceMap) => Inferred, now: number): Promise<void> => {
  // awaited inside the callback: the transaction is held open until apply's last request has been answered
  const credited = await db.transaction('rw', db.settings, db.grammarLevels, db.reviews, async () => await apply(infer, now));
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
