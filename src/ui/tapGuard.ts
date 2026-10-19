// src/ui/tapGuard.ts — one guard for the whole app (mw-5r3p30.597): after any screen change and any sheet or confirm card that opens or closes, taps are
// swallowed for the settle moment (src/ui/settle.ts swallowTaps), so the second tap of a double tap lands on nothing on what the first tap brought up or
// left bare: a Settings row's screen (About's Preface, the Paradigms list's first table, About you's Slow), the Reader under a back button (its chapter
// name opens the picker), a heading's passage (a word), the sheet a row opened (a letter tile), what lay under a sheet's Done (Change, the sheet beneath).
// The shell starts it once (App, useTapGuard); a screen or sheet needs no code of its own. A screen is what screenOf says of the address; a sheet or card
// is any element of role dialog or alertdialog, seen as it is put in or taken out of the page. Before this every sheet asked for it (useSheetBack) and the
// screens did not, so each one that forgot was its own Tester bug (about 25). A tap that acts inside one screen (a Paradigms reveal, a Study | Review
// switch, Next on a question card) is no change here: a new card settles by itself (useSettled).
import { useEffect } from 'react';
import { paradigmOf, readerOf, routeOf, watchAddress } from '../nav/route';
import { swallowTaps } from './settle';

/** The screen an address shows: its route, the Verse view over the Reader (a verse or a passage in the address), a Paradigms table over the list.
 * A move inside one (another chapter, view or verse, a table's mode, where Your requests returns to) is not a change of screen. */
export function screenOf(hash: string): string {
  const route = routeOf(hash);
  if (route === 'home') {
    const { verse, passage } = readerOf(hash);
    return verse !== undefined || passage !== undefined ? 'verse' : 'home';
  }
  if (route === 'paradigms') return `paradigms:${paradigmOf(hash).table ?? ''}`;
  return route;
}

const MODAL = '[role="dialog"],[role="alertdialog"]';
const holdsModal = (node: Node): boolean => node instanceof Element && (node.matches(MODAL) || node.querySelector(MODAL) !== null);

/** Starts the guard; gives the stop. */
export function startTapGuard(): () => void {
  let screen = screenOf(window.location.hash);
  // the address moves in the handler of the tap that moved it, so the moment starts before its next tap can come
  const stopWatching = watchAddress(() => {
    const now = screenOf(window.location.hash);
    if (now === screen) return;
    screen = now;
    swallowTaps();
  });
  // a sheet comes or goes in the commit of that tap; the observer hears it a microtask later, still long before a thumb's second tap
  const observer = new MutationObserver((records) => {
    if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some(holdsModal))) swallowTaps();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    stopWatching();
    observer.disconnect();
  };
}

/** The shell's one call: the guard runs while the app is up. */
export function useTapGuard(): void {
  useEffect(() => startTapGuard(), []);
}
