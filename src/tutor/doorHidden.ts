// src/tutor/doorHidden.ts — the ? put away by hand (mw-5r3p30.1006, his words, Postern general 2026-11-03: "two finger tap remove it and bring it back in every screen (on main screen so
// enters/ exits immersive reader)"; and "it is okay for question to cover as long as 2 finger tap can hide it and bring it back").
//
// THE RULE. A two-finger tap on any screen but the Reader's text takes the ? away; a second brings it back (src/tutor/doorTap.ts listens). It stays away as he moves between screens, until he brings it
// back: that is his word for "hide it", and a ? that came back by itself on every screen would be one more thing to hide. It does NOT stay away across a reload or a new start of the app (the state is
// held in memory only): a ? that is missing for good, days later, with nothing on the screen to say why, is how he would lose the tutor unaware. The first time it goes, a line says how to bring it back
// (DOOR_BACK_LINE, once ever on the phone, localStorage 'lampas.doorAwayTold'); a button that is out of sight until the keyboard or a screen reader's focus reaches it brings it back without a touch
// (src/AskTutor.tsx). In the Reader's text the same tap is the Immersive reader's (src/immersive.ts): it goes in and out of immersive reading, and either way it also brings the ? back (the Reader's tap
// is about the bars, and leaving immersive brings the ? back as it always did), so the ? is never away with the bars shown after two taps there.
import { useSyncExternalStore } from 'react';
import { announce } from '../ui/live';

/** The line that says how to bring the ? back: Help's tutor page says the same (src/help.ts). */
export const DOOR_BACK_LINE = 'Tap the screen with two fingers to bring the ? back.';

let awayByHand = false;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((l) => l());

/** Whether the ? has been put away by a two-finger tap, live. */
export const useDoorAwayByHand = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => awayByHand,
  );

// --- the line that says how to bring it back -------------------------------------------------------------------------------------------------------------------------------------------------------------

const TOLD_KEY = 'lampas.doorAwayTold';
const NOTE_MS = 8000;
let noteUp = false;
let noteTimer: ReturnType<typeof setTimeout> | undefined;
const noteListeners = new Set<() => void>();
const tellNote = (): void => noteListeners.forEach((l) => l());

const told = (): boolean => {
  try {
    return window.localStorage.getItem(TOLD_KEY) === '1';
  } catch {
    return true; // a phone that refuses storage cannot remember: say nothing rather than every time
  }
};

function dropNote(): void {
  clearTimeout(noteTimer);
  noteTimer = undefined;
  if (!noteUp) return;
  noteUp = false;
  tellNote();
}

function sayHowToBringItBack(): void {
  if (told()) return;
  try {
    window.localStorage.setItem(TOLD_KEY, '1');
  } catch {
    return;
  }
  noteUp = true;
  tellNote();
  announce(`The ? is away. ${DOOR_BACK_LINE}`);
  clearTimeout(noteTimer);
  noteTimer = setTimeout(dropNote, NOTE_MS);
}

/** Whether the one-time line is on screen, live. */
export const useDoorAwayNote = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      noteListeners.add(listener);
      return () => void noteListeners.delete(listener);
    },
    () => noteUp,
  );

// --- the changes ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** A two-finger tap outside the Reader's text: the ? goes if it is there, comes back if it is away. */
export function toggleDoorAway(): void {
  awayByHand = !awayByHand;
  tell();
  if (awayByHand) sayHowToBringItBack();
  else dropNote();
}

/** Brings the ? back if he put it away: the Reader's two-finger tap does this (it is about the bars), and so does the button for no touch. */
export function bringDoorBack(): void {
  if (!awayByHand) return;
  awayByHand = false;
  tell();
  dropNote();
}

/** Forgets the ? was put away and the one-time line: for the end of a page's life (a test's After hook). */
export function resetDoorAway(): void {
  awayByHand = false;
  clearTimeout(noteTimer);
  noteTimer = undefined;
  noteUp = false;
  tell();
  tellNote();
}
