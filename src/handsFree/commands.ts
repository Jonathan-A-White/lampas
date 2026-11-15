// src/handsFree/commands.ts — the spoken commands of Hands-free (mw-rl10piw.6, the first two of the epic's first set), routed by voice-kit's spoken-command router
// (voice-kit/handsfree route: lower case, punctuation and a 'please' off). 'pause' pauses and it stays paused. 'play', 'resume', 'continue' and 'go on' go on with what
// is paused (by him or at the wake); when nothing is, the chapter on screen is read from where he is through ONE request the Reader answers with its own start
// (src/nav/readerRequest.ts readHere: no second player, no plan built here); with no chapter open it says 'Open a chapter first'. Any other words: it says
// 'Sorry, I did not get that', and what was playing goes on when the exchange closes (src/handsFree/playback.ts).
import { defineSpoken, route } from 'voice-kit/handsfree';
import { readHere } from '../nav/readerRequest';
import { goOnNow, keepPaused, takeSound } from './playback';

/** What it says to words it does not know. */
export const NOT_UNDERSTOOD = 'Sorry, I did not get that';

/** What it says to 'play' with nothing paused and no chapter open. */
export const OPEN_A_CHAPTER = 'Open a chapter first';

/** The commands, by the words that are them. */
export const SPOKEN_COMMANDS = defineSpoken([
  { name: 'pause', phrases: ['pause'] },
  { name: 'play', phrases: ['play', 'resume', 'continue', 'go on'] },
]);

/** Carries out the words of one command; `say` speaks a sentence and resolves when it has been said. Resolves when all is done and said. */
export async function runCommand(words: string, say: (text: string) => Promise<void>): Promise<void> {
  const command = route(words, SPOKEN_COMMANDS);
  if (command?.name === 'pause') return keepPaused();
  if (command?.name === 'play') {
    if (goOnNow()) return;
    if (readHere()) return takeSound();
    return say(OPEN_A_CHAPTER);
  }
  return say(NOT_UNDERSTOOD);
}
