// src/useGoalProgress.ts — where he stands on his goal (mw-hqd5bz.10), for the strip under the Reader's header and the Goal screen: the saved goal,
// what its passage needs (worked out once per goal text and kept in memory, one request per chapter), and his words and levels, live.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BOOK_INDEX } from './data/bookIndex';
import { loadChapter } from './data/chapter';
import type { GrammarLevel } from './data/db';
import { parseGoal, type Goal } from './data/goal';
import { levelsOf, wordStatesOf } from './data/grammar/goalProgress';
import { passageNeeds, progressToward, type Level, type PassageNeeds, type Progress } from './data/grammar/needs';
import { getGoal, listLevels, listWords, type WordState } from './data/repositories';

export type GoalProgress =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'failed'; goal: Goal; retry: () => void }
  | {
      status: 'ready';
      goal: Goal;
      needs: PassageNeeds;
      progress: Progress;
      states: Map<string, WordState>;
      levels: Map<string, Level>;
      /** the stored rows, for when he was placed */
      rows: Map<string, GrammarLevel>;
    };

const needsByGoal = new Map<string, Promise<PassageNeeds>>();

/** The needs of a goal, once per saved goal text; a failure is not kept. */
function needsOf(text: string, goal: Goal): Promise<PassageNeeds> {
  const known = needsByGoal.get(text);
  if (known) return known;
  const request = passageNeeds(goal, loadChapter, BOOK_INDEX);
  needsByGoal.set(text, request);
  request.catch(() => {
    if (needsByGoal.get(text) === request) needsByGoal.delete(text);
  });
  return request;
}

/** Drops the needs held in memory (tests). */
export function forgetGoalNeeds(): void {
  needsByGoal.clear();
}

/** What the last request for `text` (the `attempt`th) came back with. */
type Loaded = { text: string; attempt: number; needs: PassageNeeds | 'failed' } | null;

export function useGoalProgress(): GoalProgress {
  const stored = useLiveQuery(async () => ({ text: await getGoal(), words: await listWords(), rows: await listLevels() }), []);
  const text = stored?.text;
  const goal = text ? parseGoal(text, BOOK_INDEX) : undefined;
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    if (text && goal) {
      needsOf(text, goal).then(
        (needs) => alive && setLoaded({ text, attempt, needs }),
        () => alive && setLoaded({ text, attempt, needs: 'failed' }),
      );
    }
    return () => {
      alive = false;
    };
    // `goal` is parsed from `text`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, attempt]);

  if (!stored) return { status: 'loading' };
  if (!goal) return { status: 'none' };
  if (!loaded || loaded.text !== text || loaded.attempt !== attempt) return { status: 'loading' };
  if (loaded.needs === 'failed') return { status: 'failed', goal, retry: () => setAttempt((n) => n + 1) };
  const states = wordStatesOf(stored.words);
  const levels = levelsOf(stored.rows);
  return { status: 'ready', goal, needs: loaded.needs, progress: progressToward(loaded.needs, states, levels), states, levels, rows: stored.rows };
}
