// src/handsFree/commands.ts — the spoken commands of Hands-free (mw-rl10piw.6 and .7, the epic's first set), routed by voice-kit's spoken-command router (voice-kit/handsfree route:
// lower case, punctuation and a 'please' off, number words as digits).
//  - 'pause' pauses and it stays paused. 'play', 'resume', 'continue' and 'go on' go on with what is paused (by him or at the wake); when nothing is, the chapter on screen is read from where he
//    is through ONE request the Reader answers with its own start (src/nav/readerRequest.ts readHere: no second player, no plan built here); with no chapter open it says 'Open a chapter first'.
//  - 'stop' ends the reading and nothing goes on at the close.
//  - 'read', 'open' and 'go to' a place ('read John 3', 'go to John 3 16', PROVISIONAL: open AND read, the Governor's to confirm) say the place's name and read it from its verse
//    (src/handsFree/passage.ts says what the words are; the Reader opens there and reads, readerRequest.ts readPassage). Words that are no place: 'I could not find' and the words, and what
//    was playing goes on.
//  - 'read', 'open', 'go to', 'play' and 'listen to' a place that ends 'in Audible' or 'on Audible' open his audio Bible in the Audible app at the chapter instead (src/handsFree/audible.ts,
//    mw-rl10piw.11, PROVISIONAL: the words 'in Audible' pick Audible and plain 'read John 3' stays the voice inside Lampas); Audio Bible Off says so and opens nothing.
//  - 'next chapter' and 'previous chapter' cross with crossChapter and read the chapter from its first verse (PROVISIONAL, as above); past Revelation 22 or before Genesis 1 it says so.
//  - 'back a verse' reads the verse before the one being read, or paused on, again and the reading goes on from it, in the recorded voice and the phone's (readAloud.ts backAVerse).
//  - 'ask' and the words after it ('ask who was Nicodemus', 'ask the tutor ...') put the question to the tutor and speak the answer (src/handsFree/ask.ts, mw-rl10piw.8), then hold the microphone open 8 s for a
//    follow-up with no wake word; 'tutor' and 'open the tutor' open the Talk sheet on what is on screen and listen; 'close the tutor' and 'done' put it away. In a follow-up window (info.followUp) the words
//    of any command above run it (and put the tutor away if Hands-free opened it); any other words go to the tutor as the next turn of the same talk.
// Any other words: it says 'Sorry, I did not get that', and what was playing goes on when the exchange closes (src/handsFree/playback.ts).
import { defineSpoken, route, type CommandDone } from 'voice-kit/handsfree';
import { titleOf } from '../data/books';
import { neighbours } from '../data/neighbours';
import { crossChapter } from '../reader/crossChapter';
import { readerOnScreen, readHere, readPassage } from '../nav/readerRequest';
import { askTutor, closeTutor, leaveTutor, openTutor, questionAfterAsk } from './ask';
import { listenInAudible } from './audible';
import { audibleOf, placeOfWords, type SpokenPlace } from './passage';
import { backOneVerse, goOnNow, keepPaused, stopSound, takeSound } from './playback';

/** What it says to words it does not know. */
export const NOT_UNDERSTOOD = 'Sorry, I did not get that';

/** What it says to 'play' with nothing paused and no chapter open. */
export const OPEN_A_CHAPTER = 'Open a chapter first';

/** What it says to 'next chapter' at the end of the Bible. */
export const NO_NEXT_CHAPTER = 'There is no next chapter';

/** What it says to 'previous chapter' before the first chapter of the first book. */
export const NO_PREVIOUS_CHAPTER = 'There is no chapter before this';

/** What it says to 'back a verse' when no chapter is being read. */
export const NOTHING_READ = 'Nothing is being read';

/** The commands, by the words that are them. The chapter commands come before 'go to', which takes any words after it. 'red' and 'reed' are what a recogniser makes of 'read'. */
export const SPOKEN_COMMANDS = defineSpoken([
  // the tutor's phrases come before 'read', which takes 'open' and any words after it; 'tudor' is what a recogniser makes of 'tutor'
  { name: 'close-tutor', phrases: ['close the tutor', 'close tutor', 'leave the tutor', 'close the tudor', 'done', 'i am done'] },
  { name: 'tutor', phrases: ['tutor', 'tudor', 'the tutor', 'open the tutor', 'open tutor', 'open the tudor', 'talk to the tutor', 'talk to tutor'] },
  { name: 'ask', phrases: ['ask the tutor', 'ask'], rest: true },
  { name: 'pause', phrases: ['pause'] },
  { name: 'play', phrases: ['play', 'resume', 'continue', 'go on'] },
  { name: 'stop', phrases: ['stop', 'stop reading', 'stop playing'] },
  { name: 'next-chapter', phrases: ['next chapter', 'go to next chapter', 'go to the next chapter'] },
  { name: 'previous-chapter', phrases: ['previous chapter', 'go to previous chapter', 'go to the previous chapter', 'go back a chapter', 'back a chapter'] },
  { name: 'back-verse', phrases: ['back a verse', 'back one verse', 'go back a verse', 'go back one verse', 'previous verse', 'last verse again'] },
  { name: 'read', phrases: ['read', 'red', 'reed', 'open', 'go to'], rest: true },
]);

/** The words said of a place: 'John 3', 'John 3, verse 16'. */
const nameOfPlace = (book: string, chapter: number, verse: number | undefined): string => `${titleOf(book, chapter)}${verse === undefined ? '' : `, verse ${verse}`}`;

/** 'read John 3': says the place's name, then the Reader opens there and reads from its verse (the sound that was there is ended first, so nothing goes on at the close). */
async function readPlaceOf(words: string, say: (text: string) => Promise<void>): Promise<void> {
  if (words === '') return say(NOT_UNDERSTOOD);
  const place = placeOfWords(words);
  if (place.kind === 'bad') return say(place.message);
  if (place.kind === 'none') return say(`I could not find ${words}`);
  stopSound();
  await say(nameOfPlace(place.book, place.chapter, place.verse));
  readPassage(place.book, place.chapter, place.verse ?? 1);
}

/** 'read John 3 in Audible' (mw-rl10piw.11): a place as a chapter, opened in his audio Bible in Audible (src/handsFree/audible.ts). */
async function readInAudible(words: string, place: SpokenPlace, say: (text: string) => Promise<void>): Promise<void> {
  if (place.kind === 'bad') return say(place.message);
  if (place.kind === 'none') return say(`I could not find ${words}`);
  return listenInAudible(place.book, place.chapter, say);
}

/** 'next chapter' and 'previous chapter': the chapter on screen is crossed from and read from its first verse. */
async function readNeighbour(by: 1 | -1, say: (text: string) => Promise<void>): Promise<void> {
  const here = readerOnScreen();
  if (!here) return say(OPEN_A_CHAPTER);
  const to = by > 0 ? neighbours(here.book, here.chapter).next : neighbours(here.book, here.chapter).previous;
  if (!to) return say(by > 0 ? NO_NEXT_CHAPTER : NO_PREVIOUS_CHAPTER);
  stopSound();
  readPassage(to.book, to.chapter, 1, () => crossChapter(here.book, here.chapter, by));
}

/** What the words of a command come to: more to listen for (a follow-up, in the tutor's talk) or nothing. */
export type Done = CommandDone | void;

/** Carries out the words of one command; `say` speaks a sentence and resolves when it has been said. Resolves when all is done and said; `followUp` in the result keeps the microphone open for words with
 * no wake word (the tutor's answer was spoken, or the tutor is open). `info.followUp` says these words came in such a window: those that are not a command go to the tutor. */
export async function runCommand(words: string, say: (text: string) => Promise<void>, info: { followUp: boolean } = { followUp: false }): Promise<Done> {
  const command = route(words, SPOKEN_COMMANDS);
  if (command?.name === 'ask') return askTutor(questionAfterAsk(words), say);
  if (command?.name === 'tutor') return openTutor(say);
  if (command?.name === 'close-tutor') return closeTutor(say);
  // 'read John 3 in Audible' (and 'listen to', 'play', 'open', 'go to'): his audio Bible in Audible, not the voice inside Lampas
  const audible = audibleOf(words);
  if (audible) {
    leaveTutor();
    return readInAudible(audible.said, audible.place, say);
  }
  if (!command && info.followUp) return askTutor(words.trim(), say, false);
  // any other command leaves the tutor (the Talk sheet Hands-free opened is put away) and does what it says
  leaveTutor();
  if (command?.name === 'pause') return keepPaused();
  if (command?.name === 'play') {
    if (goOnNow()) return;
    if (readHere()) return takeSound();
    return say(OPEN_A_CHAPTER);
  }
  if (command?.name === 'stop') return stopSound();
  if (command?.name === 'read') return readPlaceOf(command.rest, say);
  if (command?.name === 'next-chapter') return readNeighbour(1, say);
  if (command?.name === 'previous-chapter') return readNeighbour(-1, say);
  if (command?.name === 'back-verse') return backOneVerse() ? undefined : say(NOTHING_READ);
  return say(NOT_UNDERSTOOD);
}
