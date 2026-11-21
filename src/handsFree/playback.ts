// src/handsFree/playback.ts — what Hands-free does to the sound around a spoken command (mw-rl10piw.6, the epic's risk 2). At the wake (the session's onOpen, before
// any microphone opens for the command) whatever is sounding is paused and remembered: the passage player (src/speech/passagePlayer.ts), or the one read-aloud
// engine (src/speech/readAloud.ts), whose reading is the recorded voice, the phone's voice or a tutor's answer being read. When the exchange is over (onClose) it
// goes on from where it stopped, unless the command took the sound over (takeSound: 'pause', or a 'play' that started or resumed it itself). Nothing that was not
// sounding at the wake is started at the close. The engine's state is read and its own pause and resume are called; nothing here plays anything of its own.
import { getPassagePlayer, pausePassage, resumePassage, stopPassage } from '../speech/passagePlayer';
import { backAVerse, getReading, parkReading, pauseReading, resumeParked, resumeReading, stopReading, type ParkedReading } from '../speech/readAloud';

/** What the wake paused: the passage player, the read-aloud engine, or nothing. */
type Held = 'passage' | 'reading' | null;

let held: Held = null;
/** The reading the wake paused, set aside while a tutor's answer took the voice ('ask', src/handsFree/ask.ts): the close starts it again where it was. */
let parked: ParkedReading | null = null;
/** The command took the sound over: the close leaves it as the command left it. */
let taken = false;

/** At the wake: pauses whatever is sounding, and remembers it. */
export function silenceAtWake(): void {
  taken = false;
  held = null;
  parked = null;
  if (getPassagePlayer().state === 'playing') {
    pausePassage();
    held = 'passage';
  } else if (getReading().status === 'reading') {
    pauseReading();
    held = 'reading';
  }
}

/** The command has dealt with the sound itself ('pause', or a 'play' that set it going): the close does not go on with what the wake paused. */
export function takeSound(): void {
  taken = true;
}

/** Whether the page is hidden (he left the app, or the screen went off): a reading is not set going then, as hiding a plain reading leaves it paused. */
const pageHidden = (): boolean => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** When the exchange is over: goes on with what the wake paused, unless the command took the sound over or something else has meanwhile, or the page is hidden (the reading stays paused,
 * as hiding a plain reading leaves it: mw-rl10piw.46). */
export function goOnAtClose(): void {
  const was = held;
  const aside = parked;
  held = null;
  parked = null;
  if (taken) {
    taken = false;
    return;
  }
  if (pageHidden()) return;
  if (was === 'reading' && aside) resumeParked(aside);
  else if (was === 'passage' && getPassagePlayer().state === 'paused') resumePassage();
  else if (was === 'reading' && getReading().status === 'paused') resumeReading();
}

/** The tutor's answer is about to take the voice ('ask', mw-rl10piw.8): the chapter the wake paused is set aside, to be started again at the close where it was. The passage player's reference is not: the
 * answer ends it. A reading he paused himself before the wake is not kept either: it was his to resume and the answer replaces it. */
export function parkForAnswer(): void {
  // a second question of the same exchange finds the chapter set aside already (the first answer took the voice)
  if (held === 'reading') parked ??= parkReading();
  else if (held === 'passage') {
    stopPassage();
    held = null;
  }
}

/** 'play': goes on with what is paused, whether the wake paused it or he did (on the bar, or by 'pause'). False when nothing is paused. A hidden page is not read on: what is paused
 * stays paused (true: nothing is left for 'play' to open or start). */
export function goOnNow(): boolean {
  if (pageHidden() && (parked || getPassagePlayer().state === 'paused' || getReading().status === 'paused')) {
    held = null;
    takeSound();
    return true;
  }
  if (parked) {
    resumeParked(parked);
    parked = null;
  } else if (getPassagePlayer().state === 'paused') resumePassage();
  else if (getReading().status === 'paused') resumeReading();
  else return false;
  held = null;
  takeSound();
  return true;
}

/** 'pause': what is sounding stays paused (the wake paused it already); anything that set itself going meanwhile is paused too. */
export function keepPaused(): void {
  if (parked) {
    // the answer took the voice from the chapter: it is started again where it was, and stays paused there
    resumeParked(parked);
    parked = null;
    pauseReading();
  }
  if (getPassagePlayer().state === 'playing') pausePassage();
  else if (getReading().status === 'reading') pauseReading();
  takeSound();
}

/** 'stop', and whatever opens something else to read (a passage, the next chapter): what is sounding or paused, the passage player's or the engine's, is ended and nothing is left for
 * the close to go on with. */
export function stopSound(): void {
  stopPassage();
  stopReading();
  held = null;
  parked = null;
  takeSound();
}

/** 'back a verse' (mw-rl10piw.7): the verse before the one being read, or paused on, is read again and the reading goes on from it, in the recorded voice and the phone's. False when no
 * chapter is being read (nothing is done and the wake's pause is left to the close). */
export function backOneVerse(): boolean {
  if (!backAVerse()) return false;
  held = null;
  takeSound();
  return true;
}

/** Forgets what the wake paused (a session stopped for good; tests). */
export function forgetPlayback(): void {
  held = null;
  parked = null;
  taken = false;
}

/** The key the sentences Hands-free says are spoken under (src/handsFree/session.ts sayAloud), so a wake can cut one off. */
export const SAID_KEY = 'hands-free-said';
