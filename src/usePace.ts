// src/usePace.ts — the pace now (mw-bsf54t.7, src/data/pace.ts): his 'New words a day' setting turned by how his reviews stand (the
// words due, the last round's score, the clean days). Undefined until the three have loaded; live, so a review answered or a setting
// changed moves it.
import { useLiveQuery } from 'dexie-react-hooks';
import { countDue, getInterestLevels, getNewWordsADay, getPaceRounds } from './data/repositories';
import { cleanDaysOf, normaliseNewWordsADay, paceFor, type Pace } from './data/pace';
import { newWordsAt, type GreekLevel } from './settings/definitions/greekInterest';
import { levelOf, type InterestLang } from './settings/definitions/interest';

/** The pace now; none below the Learning step of the dial of `source`'s language, whatever is saved (mw-3ased2.2, mw-gdcyf98.3). Without a `source` (the Settings row, which is the setting
 *  both dials share) the higher of the two dials decides, as it does for every shared row. */
export function usePace(source?: InterestLang): Pace | undefined {
  return useLiveQuery(async () => {
    const now = Date.now();
    const [saved, due, rounds, dials] = await Promise.all([getNewWordsADay(), countDue(now), getPaceRounds(), getInterestLevels()]);
    const setting = normaliseNewWordsADay(newWordsAt(source ? levelOf(source, dials) : (Math.max(dials.grc, dials.he) as GreekLevel), saved));
    return paceFor(setting, due, rounds ? rounds.lastScore : null, cleanDaysOf(rounds, now));
  }, [source]);
}
