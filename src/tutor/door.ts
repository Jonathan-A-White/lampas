// src/tutor/door.ts — the one door to the tutor (mw-5r3p30.880, part B of mw-5r3p30.843; his words are on that bead: one door, never both): a round ? floating at the Hand side's edge (src/AskTutor.tsx
// FloatingTutor), drawn on a phone with a licence and nowhere else (without one no tutor door exists: nothing is drawn). A two-finger tap is not a door: it goes in and out of immersive reading
// (src/immersive.ts), his 2026-10-31 post on mw-5r3p30.882 and .934. The immersive reader (the Reader with its bars away) is the one screen with no tutor: its target is `hidden` and the ? is not drawn there; a
// two-finger tap brings the bars back and the ? with them, and a sheet over it (a word, a lesson) is not the immersive reader, so its target is not hidden. What the door opens the tutor ABOUT is the newest target a screen registered: the Reader registers its chapter or verse, AskTutor
// its screen, the word and idea sheets their word or lesson. A sheet mounts after the screen under it, so the newest target is the one on top; a target lives while its screen or sheet does.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { currentLicence } from '../services/licenceNow';

// --- what the door asks about -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** One thing the tutor can be opened about: `open` opens the Talk sheet about it. */
interface Target {
  open: () => void;
  /** the screen is the immersive reader: the door is not drawn while this is the newest target */
  hidden: boolean;
  /** a sheet over a screen: it stays above every screen's target, whichever was registered last (a sheet linked at startup mounts before the Reader's chapter has loaded) */
  sheet: boolean;
}

const targets: Target[] = [];
const watchers = new Set<() => void>();
const tellWatchers = (): void => watchers.forEach((w) => w());
const watch = (listener: () => void): (() => void) => {
  watchers.add(listener);
  return () => void watchers.delete(listener);
};

function addTarget(open: () => void, hidden: boolean, sheet: boolean): Target {
  const target: Target = { open, hidden, sheet };
  // a screen's target goes below the sheets already open, a sheet's on top: the newest of the top rank is the one asked
  const firstSheet = sheet ? -1 : targets.findIndex((t) => t.sheet);
  if (firstSheet < 0) targets.push(target);
  else targets.splice(firstSheet, 0, target);
  tellWatchers();
  return target;
}

function removeTarget(target: Target): void {
  const at = targets.indexOf(target);
  if (at >= 0) targets.splice(at, 1);
  tellWatchers();
}

/** Registers what the door asks about; the newest registered is the one asked, and a sheet's (`sheet`) is asked before any screen's. Returns how to take it off again. */
export function registerDoorTarget(open: () => void, hidden = false, sheet = false): () => void {
  const target = addTarget(open, hidden, sheet);
  return () => removeTarget(target);
}

/** A screen or sheet registers what the door opens the tutor about for as long as `open` is given (undefined: nothing to ask, as with no licence); the registration keeps its place in the order
 * while `open` changes from one render to the next. `hidden`: the screen is the immersive reader, where no door is drawn (live: it follows the bars). `sheet`: a sheet drawn over the screen, which a screen's target
 * registered after it (the Reader, once its chapter has loaded) does not outrank. */
export function useDoorTarget(open: (() => void) | undefined, hidden = false, sheet = false): void {
  const latest = useRef(open);
  const mine = useRef<Target | null>(null);
  useEffect(() => {
    latest.current = open;
  });
  const registered = open !== undefined;
  useEffect(() => {
    if (!registered) return undefined;
    const target = addTarget(() => latest.current?.(), hidden, sheet);
    mine.current = target;
    return () => {
      mine.current = null;
      removeTarget(target);
    };
    // `hidden` is followed by the effect below, so a change of it does not take the registration off and put it at the end of the order
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registered]);
  useEffect(() => {
    if (mine.current && mine.current.hidden !== hidden) {
      mine.current.hidden = hidden;
      tellWatchers();
    }
  }, [hidden, registered]);
}

const NOTHING = (): void => undefined;

/** A sheet that cannot be asked about, drawn above the Talk sheet (z-10), registers this while it is open (`when`: a sheet that stays mounted while it is put away gives false then): the newest target is then
 * hidden and the floating ? is not drawn over it. Without it the newest target is the screen's, whose Talk opens UNDER the sheet and the tap looks dead (mw-5r3p30.953, as the Teach sheet was, mw-5r3p30.949). */
export function useNoDoor(when = true): void {
  useDoorTarget(when ? NOTHING : undefined, true, true);
}

/** Whether the door is drawn now, live: the floating ? is drawn only where there is something to ask about, and not over the immersive reader (the newest target is hidden). */
export const useHasDoorTarget = (): boolean =>
  useSyncExternalStore(
    watch,
    () => targets.length > 0 && !targets[targets.length - 1].hidden,
  );

/** Opens the tutor about the newest target, if the phone is licensed and a target is there. True when it opened. */
export function openDoorTarget(): boolean {
  // the licence is checked here too, not only where the door is drawn: nothing reaches the tutor on a phone with none
  if (currentLicence() !== 'licensed') return false;
  const target = targets[targets.length - 1];
  if (!target) return false;
  target.open();
  return true;
}

// --- a tutor sheet already open -------------------------------------------------------------------------------------------------------------------------------------------------------------------

let talks = 0;

/** The Talk sheet calls this while it is mounted: the door asks nothing more of the tutor then (the floating ? is put away). */
export function useDoorBusy(): void {
  useEffect(() => {
    talks += 1;
    tellWatchers();
    return () => {
      talks -= 1;
      tellWatchers();
    };
  }, []);
}

/** A Talk sheet is on screen, live. */
export const useTalkOpen = (): boolean => useSyncExternalStore(watch, () => talks > 0);
export const talkOpenNow = (): boolean => talks > 0;
