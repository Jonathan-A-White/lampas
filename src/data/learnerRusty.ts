// src/data/learnerRusty.ts — the request's `rusty` (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'): the solid words and ideas he now slips on or has not met for a long while,
// worst first, at most RUSTY_MAX. Missing from a request when nothing is rusty. The tutor grinds' input schemas hold it; their instructions say how to use it.
import { solidCandidates } from './repositories/rusty';
import { overdueOf, rustyOf, type RustyCandidate, type RustyItem } from './rusty';

/** The field for what is kept now, or undefined when nothing is rusty. */
export async function rustyNow(now: number = Date.now()): Promise<RustyItem[] | undefined> {
  const rusty = rustyOf(await solidCandidates(), now);
  return rusty.length > 0 ? rusty : undefined;
}

/** The solid items most overdue now, for the Welcome back refresher. */
export async function overdueNow(now: number = Date.now()): Promise<RustyCandidate[]> {
  return overdueOf(await solidCandidates(), now);
}
