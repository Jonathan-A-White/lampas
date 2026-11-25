// src/ui/useBusy.ts — a button's busy flag for a handler that awaits: busy while `run` is in flight, and cleared only while the screen is still there.
// A handler that sets state after its await runs when the row may be gone (the sheet closed, a test ended and took its window with it); React's setState on an
// unmounted component still reads `window`, so it threw 'window is not defined' as an unhandled rejection (mw-fnvjof.17.310). Every await-then-set in Talk uses this.
import { useCallback, useEffect, useRef, useState } from 'react';

/** `[busy, run, alive]`: `run(task)` sets busy, awaits `task`, and clears busy unless unmounted; `alive()` says whether it is still mounted (guard any other setState after an await). */
export function useBusy(): [boolean, (task: () => Promise<void>) => Promise<void>, () => boolean] {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const alive = useCallback(() => mounted.current, []);
  const run = useCallback(
    async (task: () => Promise<void>): Promise<void> => {
      setBusy(true);
      try {
        await task();
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [],
  );
  return [busy, run, alive];
}
