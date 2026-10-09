// src/data/learnerSummary.ts — what the tutor is told of where he stands, in one short line (mw-bsf54t.8): how many words are
// solid, the words he is learning (newest first), the ones he put on his list today and how many reviews are due. Both grinds
// (verse-ask, bible-talk) get it as the request's `learner` field, so a question about a new word is answered in his terms.
import { countDue } from './repositories/reviews';
import { listWords } from './repositories/words';

/** The line is never longer than this many characters (it shares a grist's 10 KiB record with the verse and the history). */
export const LEARNER_MAX_CHARS = 600;
/** The most learning words, and the most of today's, the line names. */
export const LEARNER_MAX_LEARNING = 12;
export const LEARNER_MAX_TODAY = 12;

const startOfDay = (now: number): number => {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

const line = (solid: number, learning: string[], today: string[], due: number): string =>
  `solid ${solid} ${solid === 1 ? 'word' : 'words'}; learning: ${learning.join(', ') || 'none'}; new today: ${today.join(', ') || 'none'}; due now: ${due}`;

/**
 * 'solid N words; learning: a, b, c; new today: x, y; due now: M'. The learning words are his learning words, the most recently
 * listed first, at most 12; the new today are the learning words listed since midnight, newest first. When the line would pass
 * 600 characters the oldest names are dropped (new today's first, then the learning words'), so the counts always stay.
 */
export async function learnerSummary(now = Date.now()): Promise<string> {
  const [words, due] = await Promise.all([listWords(), countDue(now)]);
  const solid = words.filter((w) => w.state === 'solid').length;
  const learning = words.filter((w) => w.state === 'learning').sort((a, b) => b.since - a.since);
  const names = learning.slice(0, LEARNER_MAX_LEARNING).map((w) => w.lemma);
  const midnight = startOfDay(now);
  const today = learning.filter((w) => w.since >= midnight).slice(0, LEARNER_MAX_TODAY).map((w) => w.lemma);
  while (line(solid, names, today, due).length > LEARNER_MAX_CHARS && (today.length > 0 || names.length > 0)) {
    if (today.length > 0) today.pop();
    else names.pop();
  }
  return line(solid, names, today, due);
}
