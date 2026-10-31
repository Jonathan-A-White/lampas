// src/tutor/door.ts — the one door to the tutor (mw-5r3p30.880, part B of mw-5r3p30.843; his words are on that bead: one door, never both). The door MODE is 'none' on a phone with no licence (no tutor
// door exists: nothing is drawn and no gesture is heard), else the Tutor door he chose in Settings (src/settings/definitions/tutorDoor.ts): 'twoFinger' (a two-finger tap anywhere opens the tutor) or 'floating'
// (a round ? at the Hand side's edge, src/AskTutor.tsx FloatingTutor). What the door opens the tutor ABOUT is the newest target a screen registered: the Reader registers its chapter or verse, AskTutor
// its screen, the word and idea sheets their word or lesson. A sheet mounts after the screen under it, so the newest target is the one on top; a target lives while its screen or sheet does.
//
// A two-finger tap here is the same tap as the Reader's own (src/immersive.ts: fingers land together, go up within TAP_MS, none moved more than TAP_SLOP_PX; a third finger makes it another gesture),
// heard on the document so it works on every screen. Where the door is the two-finger tap it also opens the tutor; the Reader's tap on its text then only shows the bars (twoFingerOpensTutor),
// since "leaving immersive reading" is what he asked for and the tutor, not the bars, is what the tap is now for (the Mayor 678: a tap does not put the bars away). In 'floating' and 'none' the tap does
// nothing tutor-ish and the Reader's tap shows or puts away the bars as it always did.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useAiAllowed } from '../gate/licenceContext';
import { currentLicence } from '../services/licenceNow';
import { type TutorDoor, useTutorDoor } from '../settings/definitions/tutorDoor';

/** Which door the tutor has now: none without a licence, else the one he chose. */
export type DoorMode = 'none' | TutorDoor;

/** The door for a phone's licence and the Tutor door setting (undefined while the setting is read: no door until it is known). */
export const doorModeOf = (licensed: boolean, door: TutorDoor | undefined): DoorMode => (licensed && door ? door : 'none');

/** The door mode, following the licence and the setting. */
export function useDoorMode(): DoorMode {
  const licensed = useAiAllowed();
  return doorModeOf(licensed, useTutorDoor());
}

/** The door mode as non-React code reads it (the Reader's tap handler); kept current by TutorDoor (src/AskTutor.tsx) with `setDoorMode`. */
let modeNow: DoorMode = 'none';
export const doorModeNow = (): DoorMode => modeNow;
export function setDoorMode(mode: DoorMode): void {
  modeNow = mode;
}

/** Whether a two-finger tap opens the tutor now: the door is the two-finger tap. The Reader's tap on its text reads this to show the bars instead of toggling them. */
export const twoFingerOpensTutor = (): boolean => modeNow === 'twoFinger';

// --- what a tap asks about -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

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

/** Registers what a tap asks about; the newest registered is the one asked. Returns how to take it off again. */
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

/** The Talk sheet calls this while it is mounted: the door asks nothing more of the tutor then (the floating ? is put away, a tap on the sheet opens nothing). */
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

// --- the two-finger tap ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** Two fingers that stay down longer than this, or move farther than TAP_SLOP_PX, are not a tap (the same numbers as src/immersive.ts). */
export const TAP_MS = 500;
export const TAP_SLOP_PX = 16;
/** A click the phone sends after a two-finger tap (it should not) is dropped if it comes within this; performance.now(), which a clock adjustment cannot move. */
export const CLICK_GUARD_MS = 600;

/**
 * Hears a two-finger tap anywhere on `doc` and calls `onTap` with it; returns how to stop. `onTap` says whether it did something with the tap: only then is the click the phone may
 * send after it dropped, so a tap that opened nothing leaves the page as it was.
 */
export function watchTwoFingerTap(doc: Document, onTap: () => boolean): () => void {
  let multi = false;
  let tap: { at: number; from: Array<{ x: number; y: number }> } | null = null;
  let guardUntil = 0;
  const start = (e: TouchEvent) => {
    const n = e.touches.length;
    if (n < 2) return;
    multi = true;
    if (n > 2) {
      tap = null;
      return;
    }
    tap = { at: performance.now(), from: Array.from(e.touches, (t) => ({ x: t.clientX, y: t.clientY })) };
  };
  const move = (e: TouchEvent) => {
    if (!tap) return;
    const from = tap.from;
    if (Array.from(e.touches).some((t, i) => from[i] && Math.hypot(t.clientX - from[i].x, t.clientY - from[i].y) > TAP_SLOP_PX)) tap = null;
  };
  const end = (e: TouchEvent) => {
    if (e.touches.length > 0) return;
    const was = multi;
    multi = false;
    if (!was || !tap) return;
    const { at } = tap;
    tap = null;
    if (performance.now() - at > TAP_MS) return;
    if (onTap()) guardUntil = performance.now() + CLICK_GUARD_MS;
  };
  const cancel = () => {
    tap = null;
    multi = false;
  };
  const click = (e: MouseEvent) => {
    if (performance.now() > guardUntil) return;
    e.preventDefault();
    e.stopPropagation();
  };
  doc.addEventListener('touchstart', start, { passive: true });
  doc.addEventListener('touchmove', move, { passive: true });
  doc.addEventListener('touchend', end, { passive: true });
  doc.addEventListener('touchcancel', cancel, { passive: true });
  doc.addEventListener('click', click, true);
  return () => {
    doc.removeEventListener('touchstart', start);
    doc.removeEventListener('touchmove', move);
    doc.removeEventListener('touchend', end);
    doc.removeEventListener('touchcancel', cancel);
    doc.removeEventListener('click', click, true);
  };
}

/** Where the door is the two-finger tap, a two-finger tap anywhere opens the tutor about the newest target (and does nothing while a Talk sheet is already open). */
export function useTwoFingerDoor(): void {
  const mode = useDoorMode();
  useEffect(() => {
    if (mode !== 'twoFinger') return undefined;
    return watchTwoFingerTap(document, () => !talkOpenNow() && openDoorTarget());
  }, [mode]);
}
