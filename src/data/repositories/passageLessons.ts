// src/data/repositories/passageLessons.ts — where he stands on each passage lesson of the approach (mw-z370x5.1, docs/grammar.md 'Approaches'): read, or passed. One row of
// the Dexie `passageLessons` table per passage, keyed by src/approaches passageKey. Learn next offers the earliest passage not passed; Settings > Grammar approach marks a passed one.
import { publish } from '../../events/bus';
import { db, type PassageLessonRow } from '../db';

export type { PassageLessonRow };

/** Every passage lesson that has a row, by key. */
export async function listPassageLessons(): Promise<Map<string, PassageLessonRow>> {
  return new Map((await db.passageLessons.toArray()).map((row) => [row.key, row]));
}

/** He read the passage. A passage already passed stays passed. */
export async function markRead(key: string, when = Date.now()): Promise<void> {
  const state = await db.transaction('rw', db.passageLessons, async (): Promise<PassageLessonRow['state']> => {
    const held = await db.passageLessons.get(key);
    if (held?.state === 'passed') return 'passed';
    await db.passageLessons.put({ key, state: 'read', when, score: null });
    return 'read';
  });
  if (state === 'read') publish({ kind: 'passage-lesson-changed', key, state: 'read' });
}

/** He passed the passage with `score` (the share he got right, 0 to 1). */
export async function markPassed(key: string, score: number, when = Date.now()): Promise<void> {
  await db.passageLessons.put({ key, state: 'passed', when, score });
  publish({ kind: 'passage-lesson-changed', key, state: 'passed' });
}
