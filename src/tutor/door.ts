// src/tutor/door.ts — the one door to the tutor (mw-5r3p30.880, part B of mw-5r3p30.843; his words are on that bead: one door, never both): a round ? floating at the Hand side's edge (src/AskTutor.tsx
// FloatingTutor), drawn on a phone with a licence and nowhere else (without one no tutor door exists: nothing is drawn). A two-finger tap is not a door: it goes in and out of immersive reading
// (src/immersive.ts), his 2026-10-31 post on mw-5r3p30.882. What the door opens the tutor ABOUT is the newest target a screen registered: the Reader registers its chapter or verse, AskTutor
// its screen, the word and idea sheets their word or lesson. A sheet mounts after the screen under it, so the newest target is the one on top; a target lives while its screen or sheet does.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { currentLicence } from '../services/licenceNow';

// --- what the door asks about -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** One thing the tutor can be opened about: `open` opens the Talk sheet about it. */
interface Target {
  open: () => void;
}

const targets: Target[] = [];
const watchers = new Set<() => void>();
const tellWatchers = (): void => watchers.forEach((w) => w());
const watch = (listener: () => void): (() => void) => {
  watchers.add(listener);
  return () => void watchers.delete(listener);
};

/** Registers what the door asks about; the newest registered is the one asked. Returns how to take it off again. */
export function registerDoorTarget(open: () => void): () => void {
  const target: Target = { open };
  targets.push(target);
  tellWatchers();
  return () => {
    const at = targets.indexOf(target);
    if (at >= 0) targets.splice(at, 1);
    tellWatchers();
  };
}

/** A screen or sheet registers what the door opens the tutor about for as long as `open` is given (undefined: nothing to ask, as with no licence); the registration keeps its place in the order
 * while `open` changes from one render to the next. */
export function useDoorTarget(open: (() => void) | undefined): void {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  const registered = open !== undefined;
  useEffect(() => {
    if (!registered) return undefined;
    return registerDoorTarget(() => latest.current?.());
  }, [registered]);
}

/** Whether any screen or sheet has registered a target now, live: the floating ? is drawn only where there is something to ask about. */
export const useHasDoorTarget = (): boolean =>
  useSyncExternalStore(
    watch,
    () => targets.length > 0,
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
