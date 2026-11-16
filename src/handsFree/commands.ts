// src/handsFree/commands.ts — the spoken commands of Hands-free (mw-rl10piw.6 and .7, the epic's first set), routed by voice-kit's spoken-command router (voice-kit/handsfree route:
// lower case, punctuation and a 'please' off, number words as digits).
//  - 'pause' pauses and it stays paused. 'play', 'resume', 'continue' and 'go on' go on with what is paused (by him or at the wake); when nothing is, the chapter on screen is read from where he
//    is through ONE request the Reader answers with its own start (src/nav/readerRequest.ts readHere: no second player, no plan built here); with no chapter open it says 'Open a chapter first'.
//  - 'stop' ends the reading and nothing goes on at the close.
//  - 'read', 'open' and 'go to' a place ('read John 3', 'go to John 3 16', PROVISIONAL: open AND read, the Governor's to confirm) say the place's name and read it from its verse
//    (src/handsFree/passage.ts says what the words are; the Reader opens there and reads, readerRequest.ts readPassage). Words that are no place: 'I could not find' and the words, and what
//    was playing goes on.
//  - 'next chapter' and 'previous chapter' cross with crossChapter and read the chapter from its first verse (PROVISIONAL, as above); past Revelation 22 or before Genesis 1 it says so.
//  - 'back a verse' reads the verse before the one being read, or paused on, again and the reading goes on from it, in the recorded voice and the phone's (readAloud.ts backAVerse).
// Any other words: it says 'Sorry, I did not get that', and what was playing goes on when the exchange closes (src/handsFree/playback.ts).
import { defineSpoken, route } from 'voice-kit/handsfree';
import { titleOf } from '../data/books';
import { neighbours } from '../data/neighbours';
import { crossChapter } from '../reader/crossChapter';
import { readerOnScreen, readHere, readPassage } from '../nav/readerRequest';
import { placeOfWords } from './passage';
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

/** 'next chapter' and 'previous chapter': the chapter on screen is crossed from and read from its first verse. */
async function readNeighbour(by: 1 | -1, say: (text: string) => Promise<void>): Promise<void> {
  const here = readerOnScreen();
  if (!here) return say(OPEN_A_CHAPTER);
  const to = by > 0 ? neighbours(here.book, here.chapter).next : neighbours(here.book, here.chapter).previous;
  if (!to) return say(by > 0 ? NO_NEXT_CHAPTER : NO_PREVIOUS_CHAPTER);
  stopSound();
  readPassage(to.book, to.chapter, 1, () => crossChapter(here.book, here.chapter, by));
}

/** Carries out the words of one command; `say` speaks a sentence and resolves when it has been said. Resolves when all is done and said. */
export async function runCommand(words: string, say: (text: string) => Promise<void>): Promise<void> {
  const command = route(words, SPOKEN_COMMANDS);
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
