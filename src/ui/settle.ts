// src/ui/settle.ts — a new question card ignores taps for a moment (mw-hqd5bz.21). A double tap on Next lands its second tap on the NEXT card, where
// an option (or Show) now sits where Next was; the card then shows red or green with no choice made, and a miss he never made is counted. A card
// settles for SETTLE_MS before its options take a tap; a tap in that moment does nothing at all (no look, no answer, nothing written). A deliberate
// tap is never that quick: he has to read the question first. Every question card (WordQuestion, GrammarCard, SelfGrade: Placement, Review and the
// Quick test) asks `useSettled` for its answer, and so does every control that moves up into the place Next sat when the next card is drawn (the Quick
// test's Parsing drill button, the placement's quick round Say it again and Stop here; mw-hqd5bz.26, and the placement intro's buttons, which sit where Place me /
// Place again sat on the Goal screen; mw-hqd5bz.27; Drill it's Hint and its Done after Finish, the short drill's Done, the letter drill's Done and
// Another round, the Parsing drill's Ask the tutor | Talk about it and the reading drill's Skip this word; mw-5r3p30.430; the placement end card's
// buttons, mw-86e9r1.22). Review and the placement's walk have none. A change of screen, and a sheet or confirm card as it opens and as it closes,
// swallow every tap for the same moment (`swallowTaps`), called by the one app-wide guard (src/ui/tapGuard.ts, mw-5r3p30.597), not by any screen.
// A control that flips a state inside one screen (Paradigms' Study | Review mode, Hide all and a reveal cell) takes one tap per moment (`oneTap`,
// mw-svw421.41): the second tap of a double tap would flip it back, or land on the control that took its place. A control that a tap makes go away and
// whose place another control takes (the idea sheet's Mark known without a drill, the level slider) asks `justTapped` of the one that takes its place (mw-5r3p30.558). So does a play / stop button (Read aloud,
// Read from here, a verse's play, the speaker, ReadCheck's Me and Play my reading) and ReadCheck's open / closed word (mw-5r3p30.637).
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

/** The last act `oneTap` ran. One for the page, not one per control: a control that flips is often put in again by the flip (a tick box that becomes
 * another, Hide all giving way to Review mode), and a hook in the control would start afresh with the second tap. */
let lastTap: { key: string; at: number } | null = null;

/**
 * Runs `act` unless the last act run through `oneTap` had the same `key` and began less than `settle.ms` ago. A control that flips a state in place
 * (a mode button, a reveal cell, a tick box, a switch) goes through it, so a double tap ends where one tap does. Controls that take each other's place
 * (Hide all goes and Review mode grows over it) share a key; controls that do not (two reveal cells) have their own, so a quick tap on another one is
 * his next. The moment is judged by performance.now(), as useSettled is.
 */
export function oneTap(key: string, act: () => void): void {
  const now = performance.now();
  if (lastTap && lastTap.key === key && now - lastTap.at < settle.ms) return;
  lastTap = { key, at: now };
  act();
}

/**
 * True while the last act run through `oneTap` had this `key` and began less than `settle.ms` ago. A control that a tap makes go away (Mark known
 * without a drill) leaves another control under the thumb for the second tap of a double tap (the level slider moves into its place); that control asks
 * this and does nothing in the moment, so a double tap ends where one tap does (mw-5r3p30.558).
 */
export function justTapped(key: string): boolean {
  return lastTap !== null && lastTap.key === key && performance.now() - lastTap.at < settle.ms;
}

/** What a swallowed tap never reaches the app as: its click, and the press that starts it (a hold-to-talk bar begins on the press, voice-kit's useBarPress). */
const SWALLOWED = ['pointerdown', 'click'] as const;

/**
 * Drops every tap for `settle.ms` from now, wherever it lands. The app-wide guard calls it as a screen changes and as a sheet comes or goes
 * (src/ui/tapGuard.ts): the second tap of a double tap would land on whatever the next screen or sheet draws under the same spot. The tap that
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
    // a test that turns the moment off (settle.ms 0) takes every tap from then on, though a moment it started earlier has not run out on its held clock
    if (settle.ms <= 0 || performance.now() >= until) return off();
    if (event.type === 'click') event.preventDefault();
    event.stopImmediatePropagation();
  };
  SWALLOWED.forEach((type) => window.addEventListener(type, drop, true));
  // the moment ends by the same clock the taps are judged by, so a slow host cannot end it early
  const sweep = () => (performance.now() >= until ? off() : setTimeout(sweep, Math.max(16, until - performance.now())));
  setTimeout(sweep, settle.ms);
}
