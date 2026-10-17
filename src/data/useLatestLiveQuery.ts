// src/data/useLatestLiveQuery.ts — useLiveQuery that never shows an older answer after a newer one (mw-5r3p30.492).
// Dexie hands an answer to its observer at once, or through setTimeout(0) when the query ran inside one of its own zones. A query that is
// asked again when a write lands (the schedule seeded at the first open) can therefore finish second and be delivered first: the older answer,
// 'nothing due', arrives last and the Reader's Due chip stays missing until something else changes. On a real timer that gap is a millisecond or
// two; under a busy page, or Playwright's installed clock (which fires a timer only on its own tick), it is a hundred. Each run of the query is
// numbered as it starts, and an answer numbered lower than the one already shown is dropped.
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';

type Answer<T> = { run: number; value: T };

/** The newest answer of `query` (undefined until the first); `query` is not re-bound, as with useLiveQuery(query, []). */
export function useLatestLiveQuery<T>(query: () => Promise<T> | T): T | undefined {
  const started = useRef(0);
  const [shown, setShown] = useState<Answer<T> | undefined>(undefined);
  const answer = useLiveQuery(async (): Promise<Answer<T>> => ({ run: ++started.current, value: await query() }), []);
  const newest = answer && (shown === undefined || answer.run > shown.run) ? answer : shown;
  if (newest !== shown) setShown(newest);
  return newest?.value;
}
