// src/data/repositories/observed.ts — what observedProfile.ts reads: when and how well he answered (the Quick test, Review and the Parsing drill) and
// the counts of what he uses (the usage log, the stores). Only numbers and times leave here, never a word or a verse.
import { db } from '../db';
import type { TimedAnswer, WayEvidence } from '../observedProfile';

/** The usage-log names that count as hearing and as reading. */
const LISTENED = ['verse-reading', 'word-spoken'];
const READ = ['chapter-opened', 'verse-selected', 'word-tapped'];

/** Every saved answer's time and result: the words of the Quick test and Review, and the Parsing drill's steps. */
export async function listAnswerTimes(): Promise<TimedAnswer[]> {
  const [results, drills] = await Promise.all([db.results.toArray(), db.drills.toArray()]);
  return [...results, ...drills].map((r) => ({ when: r.when, right: r.right }));
}

/** The counts the ways are guessed from. */
export async function wayEvidence(): Promise<WayEvidence> {
  const [usage, results, drills, readings, pictured] = await Promise.all([db.usage.toArray(), db.results.count(), db.drills.count(), db.readings.count(), db.talkPictures.count()]);
  const used = (names: string[]) => usage.filter((u) => names.includes(u.name)).reduce((sum, u) => sum + u.count, 0);
  return { listened: used(LISTENED), read: used(READ), practised: results + drills + readings, pictured };
}
