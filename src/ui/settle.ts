// src/ui/settle.ts — a new question card ignores taps for a moment (mw-hqd5bz.21). A double tap on Next lands its second tap on the NEXT card, where
// an option (or Show) now sits where Next was; the card then shows red or green with no choice made, and a miss he never made is counted. A card
// settles for SETTLE_MS before its options take a tap; a tap in that moment does nothing at all (no look, no answer, nothing written). A deliberate
// tap is never that quick: he has to read the question first. Every question card (WordQuestion, GrammarCard, SelfGrade: Placement, Review and the
// Quick test) asks `useSettled` for its answer, and so does every control that moves up into the place Next sat when the next card is drawn (the Quick
// test's Parsing drill button, the placement's quick round Say it again and Stop here; mw-hqd5bz.26). Review and the placement's walk have none.
import { useCallback, useEffect, useRef } from 'react';

/** How long a new card ignores taps. The Tester's double taps were 120 ms apart; reading a question takes longer than this. PROVISIONAL */
export const SETTLE_MS = 300;

/** The moment a card settles for. A seam: tests/setup.ts sets 0 so a step may tap the instant a card is drawn; a test of the guard puts SETTLE_MS back,
 * and a browser spec starts at 0 through tests/e2e/unlocked.ts (localStorage 'lampas.settleMs'). */
export const settle = { ms: readStored() };

function readStored(): number {
  try {
    const stored = Number(globalThis.localStorage?.getItem('lampas.settleMs'));
    return globalThis.localStorage?.getItem('lampas.settleMs') !== null && Number.isFinite(stored) && stored >= 0 ? stored : SETTLE_MS;
  } catch {
    return SETTLE_MS;
  }
}

/**
 * Returns `settled()`: true once the card has been up for `settle.ms`. The clock restarts when `key` changes (a card that stays mounted for the
 * next question, or a Show that turns into the grades).
 */
export function useSettled(key: unknown = 0): () => boolean {
  // performance.now(), not Date.now(): a clock that steps back (a dev box, a phone changing zone) must not stretch or end the moment
  const since = useRef(0);
  useEffect(() => {
    since.current = performance.now();
  }, [key]);
  return useCallback(() => performance.now() - since.current >= settle.ms, []);
}
