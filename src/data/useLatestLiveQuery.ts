// src/data/useLatestLiveQuery.ts — useLiveQuery that never shows an older answer after a newer one (mw-5r3p30.492).
// Dexie hands an answer to its observer at once, or through setTimeout(0) when the query ran inside one of its own zones. A query that is
// asked again when a write lands (the schedule seeded at the first open) can therefore finish second and be delivered first: the older answer,
// 'nothing due', arrives last and Today's Review count stays missing until something else changes. On a real timer that gap is a millisecond or
// two; under a busy page, or Playwright's installed clock (which fires a timer only on its own tick), it is a hundred. Each run of the query is
// numbered as it starts, and an answer numbered lower than the one already shown is dropped.
// The query is also asked again when the page is shown again (visibilitychange to visible, focus) and when his local midnight passes (mw-indx1x6.58): a read that holds a day's
// figure ('3 of 8 done today') or what has come due since changes with the clock, and the database does not write when the clock moves.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';

type Answer<T> = { run: number; value: T };

/** A number that goes up each time the page is shown again or his local midnight passes. */
function useClockTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const again = (): void => setTick((n) => n + 1);
    const shown = (): void => {
      if (document.visibilityState !== 'hidden') again();
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = (): void => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      timer = setTimeout(() => {
        again();
        arm();
      }, Math.max(1000, midnight - now.getTime() + 1000));
    };
    arm();
    document.addEventListener('visibilitychange', shown);
    window.addEventListener('focus', again);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', shown);
      window.removeEventListener('focus', again);
    };
  }, []);
  return tick;
}

/** The newest answer of `query` (undefined until the first); `query` is not re-bound, as with useLiveQuery(query, []), but is asked again as the page is shown or the day turns. */
export function useLatestLiveQuery<T>(query: () => Promise<T> | T): T | undefined {
  const started = useRef(0);
  const tick = useClockTick();
  const [shown, setShown] = useState<Answer<T> | undefined>(undefined);
  const answer = useLiveQuery(async (): Promise<Answer<T>> => ({ run: ++started.current, value: await query() }), [tick]);
  const newest = answer && (shown === undefined || answer.run > shown.run) ? answer : shown;
  if (newest !== shown) setShown(newest);
  return newest?.value;
}
