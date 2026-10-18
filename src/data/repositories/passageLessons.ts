// src/data/repositories/passageLessons.ts — where he stands on each passage lesson of the approach (mw-z370x5.1, docs/grammar.md 'Approaches'): read, or passed. One row of
// the Dexie `passageLessons` table per passage, keyed by src/approaches passageKey. Learn next offers the earliest passage not passed; Settings > Grammar approach marks a passed one.
import { publish } from '../../events/bus';
import { db, type PassageLessonRow } from '../db';
import { DAY } from '../schedule';
import { announceDue, ensureScheduled, recordReview } from './reviews';

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

/** The kind of a passage lesson on the review schedule (src/review/kinds.ts LESSON): the row's id is the lesson's key, 'passage:1jn.1.1-4'. */
export const LESSON_KIND = 'lesson';

/** A Check that missed: the lesson comes back tomorrow ('Try again tomorrow'). A lesson not on the schedule is put there, due in a day; one that is keeps its step and lapses and is due in a day from now. */
export async function tryAgainTomorrow(key: string, now = Date.now()): Promise<void> {
  const added = await ensureScheduled(LESSON_KIND, [key], now, () => ({ step: 0, due: now + DAY }));
  if (added > 0) return;
  await db.transaction('rw', db.reviews, async () => {
    const held = await db.reviews.get([LESSON_KIND, key]);
    if (held) await db.reviews.put({ ...held, due: now + DAY });
  });
  await announceDue(now);
}

/** A Check that passed: a lesson on the schedule has its row recorded right (it is due later, not today); a lesson never put there is left off it. */
export async function lessonCheckPassed(key: string, now = Date.now()): Promise<void> {
  if (await db.reviews.get([LESSON_KIND, key])) await recordReview(LESSON_KIND, key, true, now);
}
