// src/usePace.ts — the pace now (mw-bsf54t.7, src/data/pace.ts): his 'New words a day' setting turned by how his reviews stand (the
// words due, the last round's score, the clean days). Undefined until the three have loaded; live, so a review answered or a setting
// changed moves it.
import { useLiveQuery } from 'dexie-react-hooks';
import { countDue, getGreekInterest, getNewWordsADay, getPaceRounds } from './data/repositories';
import { cleanDaysOf, normaliseNewWordsADay, paceFor, type Pace } from './data/pace';
import { newWordsAt } from './settings/definitions/greekInterest';

/** The pace now; none below the Greek dial's Learning step, whatever is saved (mw-3ased2.2). */
export function usePace(): Pace | undefined {
  return useLiveQuery(async () => {
    const now = Date.now();
    const [saved, due, rounds, level] = await Promise.all([getNewWordsADay(), countDue(now), getPaceRounds(), getGreekInterest()]);
    const setting = normaliseNewWordsADay(newWordsAt(level, saved));
    return paceFor(setting, due, rounds ? rounds.lastScore : null, cleanDaysOf(rounds, now));
  }, []);
}
