// src/ui/tapGuard.ts — one guard for the whole app (mw-5r3p30.597): after any screen change and any sheet or confirm card that opens or closes, taps are
// swallowed for the settle moment (src/ui/settle.ts swallowTaps), so the second tap of a double tap lands on nothing on what the first tap brought up or
// left bare: a Settings row's screen (About's Preface, the Paradigms list's first table, About you's Slow), the Reader under a back button (its chapter
// name opens the picker), a heading's passage (a word), the sheet a row opened (a letter tile), what lay under a sheet's Done (Change, the sheet beneath).
// The shell starts it once (App, useTapGuard); a screen or sheet needs no code of its own. A screen is what screenOf says of the address; a sheet or card
// is any element of role dialog or alertdialog, seen as it is put in or taken out of the page. Before this every sheet asked for it (useSheetBack) and the
// screens did not, so each one that forgot was its own Tester bug (about 25). A tap that acts inside one screen (a Paradigms reveal, a Study | Review
// switch, Next on a question card) is no change here: a new card settles by itself (useSettled). A link that leaves the app (a new tab, or another
// app by its scheme: Adopted in <version>, a study resource, Listen in Audible) is a change too, and its second tap would open it again (mw-5r3p30.457).
// A click on the SAME control (a button, a link that leaves the app, a role=button or role=switch) within the settle moment of the last click on it is dropped too (mw-t5shinh.8):
// a control that acts and changes no screen (Open in the app, Save, Export) acted twice for a double tap, and each fix was one more oneTap. A control that is
// meant to be tapped twice quickly (Next page, Larger split) carries `data-repeat`; tests/unit/repeat-guard.test.ts makes every button that steps a value choose.
// A tap on the speaking bar that takes the bar out of the page (its Stop) is a change too (mw-82lb97i.44): the text box grows into the bar's place, and the second tap of a double tap
// landed on a word of it, or on the place line (the whole chapter in the Verse view). So the bar's last tap is noted, and the bar going within the moment of it swallows taps; a bar
// that ends by itself, or moves to another slot, swallows nothing.
// A tap that brings the bar INTO the page (a Play: Read from the top, Play verse 5, Play again, Hear the verse, Read aloud) is a change as well (mw-ar5k42b.27): the page is laid out
// again for the bar. The Reader's header loses its Play and the English | Greek switch slides into its place (the second tap of a double tap turned the Reader to Greek, or opened
// Choose a book on the chapter's name grown beside it); a foot's Play gives way to a Stop; a sheet's text is pushed up by the bar's height. So a tap made while no bar is on the page is
// noted, and the bar coming within the moment of it swallows taps for a moment from then; a reading that starts by itself (no tap in the moment before it), a bar that moves to another
// slot, and a bar that was up at the tap (the voice between two verses) swallow nothing. A foot or a header that swaps into the bar needs no code of its own.
import { useEffect } from 'react';
import { paradigmOf, readerOf, routeOf, watchAddress } from '../nav/route';
import { settle, swallowTaps } from './settle';

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
// the 'Open in the app' strip floats over the top of a screen and the screen stands lower for it; when 'Not now' takes it away the first row (Settings' search box) rises under the thumb (mw-5r3p30.1100)
const STRIP = '[data-open-in-app]';
const holdsStrip = (node: Node): boolean => node instanceof Element && (node.matches(STRIP) || node.querySelector(STRIP) !== null);

/** True for a link that takes him out of the app: it opens a new tab, or its address is neither this page's nor another place in the app. */
export function leavesApp(link: HTMLAnchorElement): boolean {
  if (link.target === '_blank') return true;
  const href = link.getAttribute('href') ?? '';
  if (href === '' || href.startsWith('#')) return false;
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** What a tap is aimed at: a button, a link, or an element that says it is one. */
const CONTROL = 'button,a[href],[role="button"],[role="switch"]';
/** The speaking bar, either of them: voice-kit's SpeakingBar and RecordedBar carry the same data-testid. */
const BAR = '[data-testid="speaking-bar"]';
const holdsBar = (node: Node): boolean => node instanceof Element && (node.matches(BAR) || node.querySelector(BAR) !== null);
/** A control that takes quick repeats says so: itself or a group around it. */
const REPEAT = '[data-repeat]';

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
  // a sheet comes or goes (or the Open in the app strip goes) in the commit of that tap; the observer hears it a microtask later, still long before a thumb's second tap
  let barTappedAt: number | null = null;
  // the last tap made while no bar was on the page: the one a bar that comes in its moment was brought by
  let bareTappedAt: number | null = null;
  const noteTap = (event: MouseEvent): void => {
    if (event.target instanceof Element && event.target.closest(BAR)) barTappedAt = performance.now();
    bareTappedAt = document.querySelector(BAR) === null ? performance.now() : null;
  };
  document.addEventListener('click', noteTap, true);
  const inMoment = (at: number | null): boolean => at !== null && performance.now() - at < settle.ms;
  const observer = new MutationObserver((records) => {
    if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some(holdsModal) || [...record.removedNodes].some(holdsStrip))) swallowTaps();
    // the bar is gone (not moved to another slot) within the moment of a tap on it: that tap took it away
    if (inMoment(barTappedAt) && records.some((record) => [...record.removedNodes].some(holdsBar)) && document.querySelector(BAR) === null) {
      barTappedAt = null;
      swallowTaps();
    }
    // the bar has come (it was not on the page at the tap, so it has not moved from another slot) within the moment of a tap: that tap brought it, and the page is laid out again for it
    if (inMoment(bareTappedAt) && records.some((record) => [...record.addedNodes].some(holdsBar)) && document.querySelector(BAR) !== null) {
      bareTappedAt = null;
      swallowTaps();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  // a link that leaves the app: the tap that follows it opens it again. The tap that calls swallowTaps is already past the window, so it goes through.
  const onLink = (event: MouseEvent): void => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (link instanceof HTMLAnchorElement && leavesApp(link)) swallowTaps();
  };
  document.addEventListener('click', onLink, true);
  // the same control twice within the moment: the second click never reaches the app. Only a click that went through starts the moment, as oneTap's does.
  let last: { control: Element; at: number } | null = null;
  const onSame = (event: MouseEvent): void => {
    if (settle.ms <= 0 || !(event.target instanceof Element)) return;
    const control = event.target.closest(CONTROL);
    if (!control || control.closest(REPEAT)) return;
    // a link inside the app goes to an address, so twice is the same place; a move to another screen is already guarded (the address watch)
    if (control instanceof HTMLAnchorElement && !leavesApp(control)) return;
    const now = performance.now();
    if (last && last.control === control && now - last.at < settle.ms) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    last = { control, at: now };
  };
  document.addEventListener('click', onSame, true);
  return () => {
    stopWatching();
    document.removeEventListener('click', onLink, true);
    document.removeEventListener('click', onSame, true);
    document.removeEventListener('click', noteTap, true);
    observer.disconnect();
  };
}

/** The shell's one call: the guard runs while the app is up. */
export function useTapGuard(): void {
  useEffect(() => startTapGuard(), []);
}
