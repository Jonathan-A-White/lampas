// src/ui/settle.ts — a new question card ignores taps for a moment (mw-hqd5bz.21). A double tap on Next lands its second tap on the NEXT card, where
// an option (or Show) now sits where Next was; the card then shows red or green with no choice made, and a miss he never made is counted. A card
// settles for SETTLE_MS before its options take a tap; a tap in that moment does nothing at all (no look, no answer, nothing written). A deliberate
// tap is never that quick: he has to read the question first. Every question card (WordQuestion, GrammarCard, SelfGrade: Placement, Review and the
// Quick test) asks `useSettled` for its answer, and so does every control that moves up into the place Next sat when the next card is drawn (the Quick
// test's Parsing drill button, the placement's quick round Say it again and Stop here; mw-hqd5bz.26, and the placement intro's buttons, which sit where Place me /
// Place again sat on the Goal screen; mw-hqd5bz.27; Drill it's Hint and its Done after Finish, the short drill's Done, the letter drill's Done and
// Another round, the Parsing drill's Ask the tutor | Talk about it and the reading drill's Skip this word; mw-5r3p30.430; the placement end card's
// buttons, mw-86e9r1.22). Review and the placement's walk have none. A way out to a screen with a control under the same spot leaves with
// `swallowTaps`, so the second tap of a double tap lands nowhere (the placement's ways out to the Goal screen, mw-86e9r1.22). Every sheet does the
// same as it opens and as it closes (`useSettleAround`, called by useSheetBack, which every sheet and drill screen calls; and by the confirm cards and
// What's new): a double tap on Done reached the Goal's Change under the Learn sheet, and the Learn sheet's own Done under a tile's sheet (mw-i7xe0n.26).
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

/** What a swallowed tap never reaches the app as: its click, and the press that starts it (a hold bar begins on the press, src/ui/holdPress.ts). */
const SWALLOWED = ['pointerdown', 'click'] as const;

/**
 * Drops every tap for `settle.ms` from now, wherever it lands. A control that leaves for another screen calls it as it leaves: the second tap of a
 * double tap would land on whatever the next screen draws under the same spot (the Goal screen's Grammar ideas bar, mw-86e9r1.22). The tap that
 * calls it is already past the window, so it goes through as it was. A press is only kept from the app (its default stays: a scroll still starts).
 */
export function swallowTaps(): void {
  if (settle.ms <= 0) return;
  const until = performance.now() + settle.ms;
  // a sweep that fires after its page is gone (a test file's environment torn down) has nothing left to remove
  const off = () => {
    if (typeof window !== 'undefined') SWALLOWED.forEach((type) => window.removeEventListener(type, drop, true));
  };
  const drop = (event: Event) => {
    if (performance.now() >= until) return off();
    if (event.type === 'click') event.preventDefault();
    event.stopImmediatePropagation();
  };
  SWALLOWED.forEach((type) => window.addEventListener(type, drop, true));
  // the moment ends by the same clock the taps are judged by, so a slow host cannot end it early
  const sweep = () => (performance.now() >= until ? off() : setTimeout(sweep, Math.max(16, until - performance.now())));
  setTimeout(sweep, settle.ms);
}

/**
 * While `shown`, the thing that calls it is up (a sheet, a drill screen, a confirm card): the moment it appears and the moment it goes, taps are
 * swallowed (`swallowTaps`), so the second tap of the double tap that opened it lands on nothing in it, and the second of the one that closed it
 * lands on nothing beneath (mw-i7xe0n.26).
 */
export function useSettleAround(shown = true): void {
  useEffect(() => {
    if (!shown) return;
    swallowTaps();
    return swallowTaps;
  }, [shown]);
}
