// src/data/repositories/goalSaved.ts — the goal he saved, as the text the goal setting holds ('1 John 1', 'Read 1 John 1:1'; the 'goal'
// row of the settings store). Read-only here: the idea sheet takes its examples from it. The Goal setting's own getGoal/setGoal
// (mw-hqd5bz.4) write the same row.
import { db } from '../db';

/** The saved goal text, or undefined when he has set none. parseGoal (src/data/goal.ts) reads it. */
export async function getSavedGoalText(): Promise<string | undefined> {
  const row = await db.settings.get('goal');
  return row?.value || undefined;
}
