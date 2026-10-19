// src/plan/useMovePlace.ts — Undo for a move of the reading plan's place (mw-5r3p30.623): `move` runs it and keeps the state it replaced for a few seconds, `undo` puts that state
// back (repositories restorePlan) and clears it. `said` is what to tell him while Undo is offered; both are undefined once the seconds are over or after an Undo.
import { useCallback, useEffect, useState } from 'react';
import { restorePlan, type ReadingPlanState } from '../data/repositories';
import type { PlaceMove } from './PlacePicker';

/** How long Undo is offered (ms). */
export const UNDO_MS = 8000;

export function useMovePlace(): { said: string | undefined; move: (move: PlaceMove) => void; undo: () => void } {
  const [kept, setKept] = useState<{ previous: ReadingPlanState; said: string } | null>(null);
  useEffect(() => {
    if (!kept) return undefined;
    const timer = window.setTimeout(() => setKept(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [kept]);
  const move = useCallback((m: PlaceMove): void => {
    void m.run().then((previous) => setKept(previous ? { previous, said: m.said } : null));
  }, []);
  const undo = useCallback((): void => {
    if (!kept) return;
    setKept(null);
    void restorePlan(kept.previous);
  }, [kept]);
  return { said: kept?.said, move, undo };
}
