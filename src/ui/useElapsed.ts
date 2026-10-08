// src/ui/useElapsed.ts — whole seconds since a moment, ticking while the page is visible (the Waiting lines of the Ask box and the reading check).
import { useEffect, useState } from 'react';
import { setVisibleInterval } from './visibleInterval';

/** Whole seconds since `since` (ms since the epoch). */
export function useElapsed(since: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setVisibleInterval(() => setNow(Date.now()), 1000), []);
  return Math.max(0, Math.floor((now - since) / 1000));
}
