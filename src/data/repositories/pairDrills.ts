// src/data/repositories/pairDrills.ts — the runs of 'Which did you hear?' (src/hardSounds/pairDrill.ts, mw-5r3p30.362) kept on the device, as Drill it's runs are
// (drillRuns.ts): every finished run stays, with its time and its answers. Kept as one text in the settings store, a JSON list, newest last; a repository owns its transactions.
import { db } from '../db';
import { resultOf, type PairAnswer, type PairRun } from '../../hardSounds/pairDrill';

const KEY = 'hardSoundsPairRuns';

const isRun = (r: unknown): r is PairRun =>
  typeof r === 'object' && r !== null && typeof (r as PairRun).lessonId === 'string' && typeof (r as PairRun).at === 'number' && typeof (r as PairRun).score === 'number' && Array.isArray((r as PairRun).answers);

/** The runs `text` holds; none for a text that is not a list of them. */
function parseRuns(text: unknown): PairRun[] {
  if (typeof text !== 'string') return [];
  try {
    const raw: unknown = JSON.parse(text);
    return Array.isArray(raw) ? raw.filter(isRun) : [];
  } catch {
    return [];
  }
}

/** Keeps a finished run. */
export async function savePairRun(run: PairRun): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const runs = parseRuns((await db.settings.get(KEY))?.value);
    await db.settings.put({ key: KEY, value: JSON.stringify([...runs, run]) });
  });
}

/** Keeps the run of the lesson `lessonId` that ended with `answers`, with the time it was kept. */
export const recordPairRun = (lessonId: string, answers: readonly PairAnswer[], at = Date.now()): Promise<void> => savePairRun(resultOf(lessonId, answers, at));

/** The runs kept, oldest first: those of the lesson `lessonId`, or every lesson's. */
export async function getPairRuns(lessonId?: string): Promise<PairRun[]> {
  const runs = parseRuns((await db.settings.get(KEY))?.value);
  return lessonId === undefined ? runs : runs.filter((r) => r.lessonId === lessonId);
}
