// src/handsFree/playback.ts — what Hands-free does to the sound around a spoken command (mw-rl10piw.6, the epic's risk 2). At the wake (the session's onOpen, before
// any microphone opens for the command) whatever is sounding is paused and remembered: the passage player (src/speech/passagePlayer.ts), or the one read-aloud
// engine (src/speech/readAloud.ts), whose reading is the recorded voice, the phone's voice or a tutor's answer being read. When the exchange is over (onClose) it
// goes on from where it stopped, unless the command took the sound over (takeSound: 'pause', or a 'play' that started or resumed it itself). Nothing that was not
// sounding at the wake is started at the close. The engine's state is read and its own pause and resume are called; nothing here plays anything of its own.
import { getPassagePlayer, pausePassage, resumePassage } from '../speech/passagePlayer';
import { getReading, pauseReading, resumeReading } from '../speech/readAloud';

/** What the wake paused: the passage player, the read-aloud engine, or nothing. */
type Held = 'passage' | 'reading' | null;

let held: Held = null;
/** The command took the sound over: the close leaves it as the command left it. */
let taken = false;

/** At the wake: pauses whatever is sounding, and remembers it. */
export function silenceAtWake(): void {
  taken = false;
  held = null;
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

/** When the exchange is over: goes on with what the wake paused, unless the command took the sound over or something else has meanwhile. */
export function goOnAtClose(): void {
  const was = held;
  held = null;
  if (taken) {
    taken = false;
    return;
  }
  if (was === 'passage' && getPassagePlayer().state === 'paused') resumePassage();
  else if (was === 'reading' && getReading().status === 'paused') resumeReading();
}

/** 'play': goes on with what is paused, whether the wake paused it or he did (on the bar, or by 'pause'). False when nothing is paused. */
export function goOnNow(): boolean {
  if (getPassagePlayer().state === 'paused') resumePassage();
  else if (getReading().status === 'paused') resumeReading();
  else return false;
  held = null;
  takeSound();
  return true;
}

/** 'pause': what is sounding stays paused (the wake paused it already); anything that set itself going meanwhile is paused too. */
export function keepPaused(): void {
  if (getPassagePlayer().state === 'playing') pausePassage();
  else if (getReading().status === 'reading') pauseReading();
  takeSound();
}

/** Forgets what the wake paused (a session stopped for good; tests). */
export function forgetPlayback(): void {
  held = null;
  taken = false;
}
