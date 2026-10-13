// src/data/observedProfile.ts — what the phone sees of how he learns, without asking (mw-1vuvq6.3, 'detect first, ask last'): the pace from the
// timing and accuracy of his saved answers, the ways from the counts of what he uses. Both are PROVISIONAL guesses with plain thresholds; they ride
// every tutor grist as learner_profile.observed_pace / observed_ways (src/data/learnerProfile.ts) beside what he chose himself, and About you shows
// them. The two functions are pure; observedNow reads the stores (repositories/observed.ts).
import { listAnswerTimes, wayEvidence } from './repositories/observed';
import type { Pace, Way } from './repositories/profile';

const MINUTE = 60_000;
const DAY = 86_400_000;

/** The answers that count: the last 30 days, at least 20 of them. */
export const OBSERVED_WINDOW_DAYS = 30;
export const OBSERVED_MIN_ANSWERS = 20;
/** A gap longer than this ends a sitting: the time between sittings is not the time an answer takes. */
export const SITTING_GAP_MS = 5 * MINUTE;
/** Answers a minute at or above which he goes quickly, and under which slowly (with the accuracy it has to come with). */
export const QUICK_PER_MINUTE = 6;
export const SLOW_PER_MINUTE = 2.5;
export const QUICK_ACCURACY = 0.7;
export const SLOW_ACCURACY = 0.5;
/** The fewest uses (answers and taps) before the ways are guessed from them. */
export const OBSERVED_MIN_USES = 50;

export interface TimedAnswer {
  when: number;
  right: boolean;
}

/** How he seems to go: quick, steady or slow, from the answers per minute within his sittings and how many are right; undefined from too little. */
export function observedPace(answers: readonly TimedAnswer[], now: number): Pace | undefined {
  const recent = answers.filter((a) => a.when <= now && a.when >= now - OBSERVED_WINDOW_DAYS * DAY).sort((a, b) => a.when - b.when);
  if (recent.length < OBSERVED_MIN_ANSWERS) return undefined;
  let gaps = 0;
  let spent = 0;
  for (let i = 1; i < recent.length; i += 1) {
    const gap = recent[i].when - recent[i - 1].when;
    if (gap <= SITTING_GAP_MS) {
      gaps += 1;
      spent += gap;
    }
  }
  if (gaps === 0 || spent === 0) return undefined;
  const perMinute = gaps / (spent / MINUTE);
  const accuracy = recent.filter((a) => a.right).length / recent.length;
  if (perMinute < SLOW_PER_MINUTE || accuracy < SLOW_ACCURACY) return 'slow';
  if (perMinute >= QUICK_PER_MINUTE && accuracy >= QUICK_ACCURACY) return 'quick';
  return 'steady';
}

/** What he has done, counted: heard (a chapter or verse read aloud, a word held to hear), read (chapters opened, verses and words tapped),
 * practised (quiz, review and drill answers, readings aloud) and looked (pictures sent with a question). */
export interface WayEvidence {
  listened: number;
  read: number;
  practised: number;
  pictured: number;
}

/** The share of each way, in whole percent, leaving out a way with none; undefined from too little use. */
export function observedWays(evidence: WayEvidence): Partial<Record<Way, number>> | undefined {
  const counts: Record<Way, number> = { hearing: evidence.listened, seeing: evidence.pictured, reading: evidence.read, doing: evidence.practised };
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total < OBSERVED_MIN_USES) return undefined;
  const shares: Partial<Record<Way, number>> = {};
  for (const way of Object.keys(counts) as Way[]) {
    const share = Math.round((counts[way] / total) * 100);
    if (share > 0) shares[way] = share;
  }
  return shares;
}

/** Both, from what is kept on the phone. */
export async function observedNow(now: number): Promise<{ pace?: Pace; ways?: Partial<Record<Way, number>> }> {
  const [answers, evidence] = await Promise.all([listAnswerTimes(), wayEvidence()]);
  const pace = observedPace(answers, now);
  const ways = observedWays(evidence);
  return { ...(pace ? { pace } : {}), ...(ways ? { ways } : {}) };
}
