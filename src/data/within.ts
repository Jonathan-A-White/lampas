// src/data/within.ts — gives a wait an end (mw-5r3p30.846): a fetch the worker never answers (a half-written cache entry) would leave a 'Loading …' for ever.
import { chapterWait } from './chapterWait';

/** Runs `run` with a signal that aborts after `ms` (30 s unless given); the timer is cleared when it settles. An abort rejects the fetch, so the caller's failure path (Try again) runs. */
export function within<T>(run: (signal: AbortSignal) => Promise<T>, ms: number = chapterWait.giveUpMs): Promise<T> {
  const give = new AbortController();
  const timer = setTimeout(() => give.abort(), ms);
  return run(give.signal).finally(() => clearTimeout(timer));
}

/** Rejects when `work` has not settled after `ms` (30 s unless given): for a wait that has no signal to abort (a dynamic import). */
export function orGiveUp<T>(work: Promise<T>, ms: number = chapterWait.giveUpMs): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('gave up waiting')), ms);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}
