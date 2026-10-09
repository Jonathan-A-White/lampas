// src/usePace.ts — the pace now (mw-bsf54t.7, src/data/pace.ts): his 'New words a day' setting turned by how his reviews stand (the
// words due, the last round's score, the clean days). Undefined until the three have loaded; live, so a review answered or a setting
// changed moves it.
import { useLiveQuery } from 'dexie-react-hooks';
import { countDue, getNewWordsADay, getPaceRounds } from './data/repositories';
import { cleanDaysOf, paceFor, type Pace } from './data/pace';

export function usePace(): Pace | undefined {
  return useLiveQuery(async () => {
    const now = Date.now();
    const [setting, due, rounds] = await Promise.all([getNewWordsADay(), countDue(now), getPaceRounds()]);
    return paceFor(setting, due, rounds ? rounds.lastScore : null, cleanDaysOf(rounds, now));
  }, []);
}
