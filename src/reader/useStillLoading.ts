// src/reader/useStillLoading.ts — true once `waiting` has lasted chapterWait.stillMs (8 s): a 'Loading …' has gone on too long (mw-5r3p30.846).
import { useEffect, useState } from 'react';
import { chapterWait } from '../data/chapterWait';

/** `again` is a counter the caller bumps on Try again: the 8 s start over. */
export function useStillLoading(waiting: boolean, again = 0): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setStill(true), chapterWait.stillMs);
    return () => {
      clearTimeout(timer);
      setStill(false);
    };
  }, [waiting, again]);
  return waiting && still;
}
